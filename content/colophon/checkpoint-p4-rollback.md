+++
title = "Checkpoint P4.R1: rolling back is just another release"
description = "Time travel's write half works: POST a rollback at any release and it builds an ordinary changeset — publish pins for what was live then, unpublish pins for what wasn't — that goes through the same review, hash approval and generation bump as everything else. Plus: a catalogue of what the project already does beyond the original plan."
date = 2026-11-03T21:40:00Z

[extra]
kind = "release"
milestone = "P4"
step = "rollback"
short_title = "Rolling back is just another release"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 319

[extra.summary]
goal = "Make restoring a past release boring: a rollback should be a reviewed, hash-approved release like every other, never a privileged path around the model."
built = "POST /releases/{generation}/rollback, which computes the publication set at that release and builds a normal changeset from it — plus changesets.rollback_generation, which exempts deliberate historical pins from draft-vs-pin staleness and makes refresh recompute the release's set."
proof = ["v1 published, v2 published, rollback to 1 becomes generation 3 serving v1 again — while ?generation=2 still serves v2", "generations 0, 2 and 99 are refused invalid_generation; a body smuggling entries is refused", "a second identical rollback is refused already_at: nothing to restore", "the same idempotency key replays the built changeset without rebuilding"]
code = "akira-shirase-oss/colophon-cms · main @ b26dfc3"
+++

"Time travel" was always two promises: see the site as it was, and put it back. The first half already
worked — every public read takes `?generation=N` and answers what that release served, cached by
generation. This checkpoint ships the second half's spine, and the design choice is the point: a
rollback is *not a special operation*. It's a changeset, like every publish since P2.

## What I built

- **`POST {P}/releases/{generation}/rollback`** takes only a title — the release names what to
  restore, the caller doesn't get to. It computes two sets: what was live at that generation (using
  the delivery read's own semantics, so an entry since revoked stays revoked) and what's live now
  but wasn't then — the first becomes publish pins, the second unpublish pins. An entry already
  publishing the same revision pins nothing. If the two sets already match, `already_at`.
- **The changeset that results is indistinguishable from any other**: an editor submits it, a
  reviewer approves its exact hash, a publisher commits it on a base generation — the broken-reference
  check, the usable-assets gate and the delivery outbox all apply unmodified.
- **`changesets.rollback_generation`** records which release it restores. This exists because the
  naive implementation was born unreviewable: "stale" means the draft moved since pinning, and a
  rollback pin is an older revision *by definition* — it would have been stale at birth, and a
  refresh would have re-pinned the drafts, destroying the rollback. Now a publish pin on a rollback
  changeset is never stale (a pinned revision can't drift — the rule exists for pins taken from
  drafts), and refreshing recomputes the release's set instead.

## The honest edge

One documented gap remains, recorded in D-097: a rollback can pin a revision written under an older
content-type version — one that might not validate against today's definition. Checking old
revisions against the current version at publish time is follow-up work (the `needs_migration`
machinery is the model). And this is the spine only: the Studio's release slider and the testbed
and load coverage are the visible half still to come.

## Where the project already goes past the plan

The original spec was a serious CMS core. The extras that exist now, all proven the same way:

- **Collection types and a real type builder**: not just the built-in articles — any number of
  content types, versioned, widened carefully, checked against stored content before a narrowing
  change is allowed. Field kinds cover text, Markdown, numbers, choices, dates, slugs, references
  (including mirrored inverses), uploaded assets, and shared components that update every type
  using them atomically. Fields can be required, unique, patterned, defaulted, or conditional.
- **Locales and localization groups**: entries in any number of languages, each with its own slug,
  draft and publication history.
- **Import and export**: a collection's drafts export as JSONL; JSON arrays, JSONL files and even
  foreign-CMS-shaped export entities import back in one idempotent transaction.
- **Accounts**: OpenID Connect sign-in plus email-and-password for people who can't reach the
  identity provider.
- **Schedules**: publish requests in an IANA zone with explicit DST edges, run by the worker as
  their author with every publish check — delayed, never silently early or late.
- **The website builder**: pages, menus, themes and a fixed section library are ordinary content;
  a pinned release builds to static files and promotes atomically. Hero images come from the media
  pipeline.
- **The media pipeline**: quarantine, decode-and-strip verification, fixed renditions, a public
  origin where object existence is the proof.
- **Agents**: a CLI (device sign-in, content create/list, admin bootstrap) and a stdio MCP server
  whose eight tools do exactly what the caller's token allows — and can never approve or publish.
- **Deletion**: entries and whole collections delete through the same review as publishing,
  leaving tombstones the audit trail keeps.

## Does it work?

The stack test tells the story in order: publish "version one" (generation 1), publish "version
two" (generation 2), then POST the rollback — it's an open changeset with one publish item, replayed
by the same idempotency key, submitted, approved, published as **generation 3**. After which the
latest read serves "version one" again — and `?generation=1`, `2`, `3` each serve their own past.
Refusals all have names: `invalid_generation` for 0, the current and a future release;
`UNPROCESSABLE_ENTITY` for a body smuggling entries; `already_at` for restoring what's live.
