+++
title = "Checkpoint P4.M1: uploads that can't hurt a publish"
description = "Images can now be uploaded, verified and referenced: an upload is quarantined and proved by decode — never by the filename it claims — before it may appear in a publish. Asset fields name uploads in content, a release refuses one that isn't usable, and a public media origin serves verified objects with immutable caching and no database reads."
date = 2026-11-03T16:30:00Z

[extra]
kind = "release"
milestone = "P4"
step = "media"
short_title = "Uploads that can't hurt a publish"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 317

[extra.summary]
goal = "Give the CMS safe images end to end: upload through quarantine and a proving decode, name them in content, keep them out of a publish until usable, and serve the verified bytes fast."
built = "POST /assets into quarantine with idempotent writes; a worker job that sniffs, bounds, decodes, strips metadata, re-encodes and promotes; the `asset` field type with per-revision reference tracking; publish validation that refuses non-usable uploads; and a public media origin streaming `public/` objects."
proof = ["a release naming an unverified or rejected upload is refused `asset_not_usable`, before and after the worker finishes", "the origin serves a verified PNG with immutable caching and answers 404 for everything else", "a content type, entry, changeset and publish round trip exercises it against real Garage storage", "uploads and origin reads together at over a thousand requests a second, p99 under 117ms, zero failed"]
code = "akira-shirase-oss/colophon-cms · main @ b09491c"
+++

The website builder's next honest need is images. But an image pipeline that trusts an upload is worse than none:
the declared `Content-Type` is a claim, not a fact. This step builds the lifecycle in two halves — quarantine and
proof, then reference and publish — held to the same bar as everything else.

## What I built

- **Quarantine, then proof.** `POST {P}/assets` takes the raw body (bounded), a file name and an idempotency key;
  the bytes go to `quarantine/{project}/{env}/{asset}` *before* a transaction opens — no database transaction
  spans the object store — then the asset row and its job commit together. A worker claims the job on its own
  lease and verifies on a dedicated image pool: sniff the actual signature (PNG, JPEG, WebP only), decode under
  hard byte and pixel limits, re-encode the proven image with metadata stripped, hash it, and promote it to
  `public/...` — state and job outcome in one commit, so a lost lease writes nothing stale.
- **The `asset` field.** Content types gain a field kind that names uploads: one, or a bounded list of distinct
  ids — a `reference` without a target collection. Ids are canonical UUIDs collected wherever fields nest
  (objects, lists, blocks), and every revision's references persist in `asset_references`, which is what
  retention will read the other way later.
- **Publish gating.** A draft may name a quarantined or even a rejected upload — content is written before the
  verifier finishes — but `bad_asset` joins the changeset's items through `asset_references` to `assets` and the
  first non-`usable` row fails the release: `asset_not_usable`, with "still being verified" versus "replace the
  upload" depending on state. Scheduled publishes fail the same way.
- **The media origin.** `GET /media/v1/{project}/{environment}/{asset}` streams the `public/...` object
  straight from the store: no sign-in, no asset-row read — object existence *is* the proof it verified, because
  the worker is the only writer and only promotes bytes it re-encoded. The detected `Content-Type` rides as an
  object attribute; the answer carries immutable `Cache-Control`, `nosniff` and the object's ETag. Quarantined,
  rejected, missing and malformed ids all answer 404, and nothing under `quarantine/` can be addressed at all.

## Does it actually work?

- **The end-to-end spec tells the story:** fake upload → draft saves fine → changeset approves → publish refused
  `asset_not_usable`, refused again after the rejection settles, origin 404. Then a real upload → verified usable →
  publish succeeds → the origin answers 200 `image/png`, immutable, `nosniff`, PNG magic bytes — to a request with
  no cookie at all. A made-up asset id is refused at save with `asset_not_found`.
- **The Studio builds it:** the field picker offers "Uploaded file" with one-or-list options, and the entry
  editor takes an upload's id (the real media picker is the next step).
- **The load run covers it:** the assets scenario now reads the public origin alongside uploads — 10,991
  requests at 1,048/s, p99 116ms against a 500ms budget, zero failed, including `media 200` and the immutable
  header check.
- **317 Rust tests** pass, and the testbed drives the whole lifecycle through a real browser: upload, quarantine,
  `usable: image/png`, then `served: 200 image/png` from the origin — and `served: 404` for the fake.

## What surprised me

- **Row locks have a permission price.** Mirroring the entry-reference precheck with `FOR KEY SHARE` failed with
  permission denied — the API role may not UPDATE `assets` (state changes are the worker's). The fix is better
  than the copy would have been: no lock at all. Uploads have no delete path yet, and `ON DELETE RESTRICT` is the
  guarantee when retention arrives.
- **A refusal can race the proof.** The first test published while the asset was *quarantined* — and the worker
  beat it to usable, so the refusal never fired. The deterministic version uses a fake: quarantined-then-rejected
  is non-usable either way, so the refusal isn't a race condition in the test.
