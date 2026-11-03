+++
title = "Checkpoint P4.M2: images an editor can actually use"
description = "The media pipeline is finished: the Studio's asset picker uploads, polls the verifier and drops thumbnails into drafts; the hero section renders real images; and the worker now writes fixed-width renditions at verify time that the public origin serves under their own names — a name nothing wrote is a 404."
date = 2026-11-03T18:15:00Z

[extra]
kind = "release"
milestone = "P4"
step = "media"
short_title = "Images an editor can actually use"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 318

[extra.summary]
goal = "Finish the media arc: give editors a picker instead of a UUID box, put real images on built sites, and serve small renditions without a second store or a resizing proxy."
built = "An AssetPicker mirroring the reference picker — upload, verify-poll, choose, reorder inside the bound; storedValue/formValue support for asset lists; fixed renditions w320/w1280 generated at verify and served by the origin; a hero image field wired through the build to /media/v1."
proof = ["an upload chosen in the picker persists through reload and its thumbnail comes from the real media origin", "a fake image is reported rejected and is never chosen", "a 400-px upload serves its w320 rendition with the same immutable headers; w1280, W320 and ../ all answer 404", "the load run reads originals and renditions at 251/s, p99 16ms, zero failed"]
code = "akira-shirase-oss/colophon-cms · main @ cbe63cc"
+++

The upload pipeline proved bytes are safe; it didn't prove anyone could use them. An editor was left typing UUIDs
into a text box — technically correct, practically useless. This checkpoint finishes the arc: a real picker, real
images on real pages, and the small-file problem solved inside the pipeline that already exists.

## What I built

- **The asset picker.** The entry editor's `asset` field now opens a library: every upload in the project, newest
  first, each showing its honest state — a real thumbnail served from the media origin when the upload is usable,
  "Checking…" while the worker verifies, "Rejected" with the reason when it isn't. Choosing drops a chip into the
  field; chips reorder and remove within the list's bound. Uploading in place goes through the same `POST /assets`
  route, polls the job until the verifier settles, and auto-chooses a usable result.
- **Renditions at verify time.** `verify_image` now returns fixed downscales — `w320` and `w1280` — beside the
  stripped original, aspect-preserving, in the upload's own format, and only when the source is actually wider.
  The worker writes each rendition to `public/{project}/{env}/{asset}/{name}` *before* the row commits, and the
  `assets.derivatives` column records only the names that provably landed — so a partial failure retries rather
  than advertising an object that doesn't exist.
- **Renditions on the origin.** `GET /media/v1/…/{asset}/{name}` serves a recorded derivative through the same
  store-read path as the original: immutable cache, `nosniff`, the stored `Content-Type`, ETag. The name is
  validated as lowercase-alphanumeric, at most sixteen characters, before it ever reaches an object key — so
  `W320`, `../`, and a `w1280` nothing wrote are all the same honest 404.
- **Images on real sites.** The hero section gained optional `image` and `alt` fields; the shared renderer emits
  `assetUrl(id)`; the site build and the Studio's preview canvas both wire that to the real `/media/v1` path. A
  published page's image is the same existence-as-proof object the origin serves everywhere else.

## Does it actually work?

- **The spec drives it like an editor:** upload a PNG in the picker → the worker settles it usable → it's
  auto-chosen → the draft saves → after a reload the chip shows a thumbnail fetched from the real media origin.
  A fake image reports `rejected: not a supported image` and is never chosen. A list of two gets picked,
  reordered, trimmed to its bound, and the saved document keeps only the surviving id.
- **The rendition test is explicit:** a 400×4 PNG serves `200 image/png` at both the original path and `/w320`,
  while `/w1280` (the source is narrower), `/nope`, `/W320` and a traversal attempt all answer 404 — and the
  asset row records `derivatives = ["w320"]`.
- **The load run mixes them:** the media arm now reads the original and the `w320` rendition alternately —
  2,099 requests at 251/s, p99 16.2ms against a 700ms budget, zero failed.
- **318 Rust tests**, the testbed asserting `rendition w320: 200 image/png` through a real browser, and the site
  suite's new image test all pass; the Studio and testbed both check clean.

## What surprised me

- **A feature shipped half-wired is a silent data loss.** The asset field parsed, validated and saved — but the
  form serializer had no `asset` arm, so a *list* of uploads serialized to an empty string and silently never
  persisted. Nothing errored; the field just didn't work. The picker spec caught it on the second assertion.
- **`resize_to_fill` crops.** The first rendition attempt used it for "fit within width" and produced center-crops
  — the right-looking function with the wrong semantics. Aspect-preserving `resize` is the honest one: a
  rendition is the same image, smaller.
- **Column-level grants forget new columns.** Migration 0035 granted the worker UPDATE on `assets`' named columns;
  adding `derivatives` meant the worker's commit failed with permission denied until the new column got its own
  grant. Table-level grants would have covered it; the column-level list is deliberately tighter — it just has to
  grow by hand.
