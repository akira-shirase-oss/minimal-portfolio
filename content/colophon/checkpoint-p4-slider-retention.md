+++
title = "Checkpoint P4.R2: the slider, and the parts of time travel that bite back"
description = "P4 closes out: the Studio gets a release slider and a rollback button, publishing re-checks pins a later type change left behind, and media gains staged deletion plus a retention sweep — the last piece of the time-travel and media arc."
date = 2026-11-03T23:10:00Z

[extra]
kind = "release"
milestone = "P4"
step = "slider-retention"
short_title = "The slider, and deleting media safely"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 514

[extra.summary]
goal = "Finish time travel and media: browse releases in the Studio, keep publish honest when history meets a newer type, and let uploads be deleted without ever orphaning content."
built = "A generation stepper and rollback button on every release receipt; a publish-time re-check that refuses pins a type change left behind (409 revision_outdated); staged asset deletion — request, lock, recheck, then bytes — with SECURITY DEFINER triggers closing the reference race; and a retention sweeper that expires what nothing references."
proof = ["the Studio spec drives the slider to release 1, starts the rollback, and publishes it as generation 3", "narrow a field to digits after 'abc' was published, roll back, and publish refuses revision_outdated naming the entry and field", "DELETE a used upload → 409 still_referenced; an unused one → 202, deleted, and its objects 404", "the sweep expires an old unused upload, spares a referenced one, and reaps orphan quarantine objects", "k6: 4,410 requests through the delete arm, p99 16.8ms, zero failed"]
code = "akira-shirase-oss/colophon-cms · main @ 63a8a83"
+++

## What shipped

Three pieces, and each one earned its place by catching something real.

**The Studio's release slider.** Every release receipt now has a stepper — older, newer, and a
range input across all generations — plus a "Roll back to this release" button that appears only
where it can act (before the latest release, for people who may publish). It builds the restore
changeset and opens it; the restore then follows the same submit → exact-hash review → publish
path as any release. The browser spec drives the whole story: slide to release 1, start the
rollback, approve it, publish it as generation 3.

**The check that almost wasn't there.** Rolling back pins revisions that may predate the current
content-type version — a field narrowed to `[0-9]+` after "abc" was published is the test. Type
changes only re-check drafts and *open* publications, so a closed publication could slip under a
later definition, and a rollback pins exactly those. Publishing now revalidates any pin older than
its collection's version, under the same advisory locks, and refuses `409 revision_outdated`
naming the entry and the failing field. The test publishes "abc", republishes "123", narrows the
field, and watches the restore get refused — while the live release never moves.

**Deleting uploads without orphaning content.** `DELETE /assets/{id}` checks who still names the
asset — a live draft, or any publication ever (publications pin forever) — and either refuses
`still_referenced` or commits only an *intent*: a delete job, so 202 means "requested", not gone.
The worker locks the asset, rechecks under the lock, marks it `deleting`, and only then removes
bytes — public key, every rendition, the quarantine original — outside any transaction, so a
crash mid-delete just retries. Rows are tombstoned, never deleted.

## The bug the tests caught this time

PostgreSQL 18 requires an `UPDATE` grant for *every* row-lock mode — `FOR KEY SHARE` included —
and the API role deliberately has no `UPDATE` on `assets`. So the "lock the asset when someone
references it" rule can't live in API code at all. The fix is two `SECURITY DEFINER` triggers
owned by the worker role: one locks the named asset on every `asset_references` insert and
refuses once a delete is anywhere in flight, the other takes the same lock on every publication
insert so a publish either wins before the delete or waits it out and is refused as unusable. A
live serialization test proved the semantics before the happy paths were even run.

## The sweeper

A retention `Sweeper` rides beside the worker: every pass enqueues bounded `expire` jobs for
assets older than the 24-hour spec window that nothing references — quarantined, rejected, and
yes, usable-but-unused uploads — then walks `quarantine/` for orphan objects whose rows never
committed. Expire jobs share the delete machinery: lock, recheck, tombstone, bytes gone.

**P4 is done.** Any release can be browsed and rolled back; uploads are verified, served, and now
safely deleted and collected. Next: schema migrations you can dry-run and approve.
