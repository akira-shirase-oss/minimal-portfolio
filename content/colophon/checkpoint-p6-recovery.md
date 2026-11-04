+++
title = "Checkpoint P6: the machine survives losing everything"
description = "The recovery arc landed end to end: encrypted base backups with continuous WAL archiving, an append-only deletion ledger that exports off-host and replays idempotently, a six-stage restore that registers a new epoch before anything serves, and load evidence that each dependency failure fails honestly — cache down, database down, purge endpoint refusing."
date = 2026-11-04T20:30:00Z

[extra]
kind = "release"
milestone = "P6"
step = "backups, deletion ledger, restore, fault load"
short_title = "Encrypted backups, deletion ledger, six-stage restore"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 708

[extra.summary]
goal = "Prove the CMS survives the bad day: lose the database, lose the cache, lose the purge endpoint — every failure fails honestly, and a restore on clean infrastructure brings back exactly what existed, with nothing from the dead timeline able to act on the new one."
built = "pg_basebackup piped through gpg with a manifest recording schema/migration state + key refs + the deletion-ledger high-water mark, scripts/backup.sh with verify-before-it-counts; WAL archiving into a dedicated volume with forced 60s switches; migration 0048 deletion_ledger — append-only rows for project/collection/entry/member/role/asset deletions AND tombstones, RLS insert-only, colophon admin ledger-export/replay; migration 0049 jobs.status 'held' — a real state no claim, retry or expiry reads; scripts/restore.sh — six marker-gated stages (prepare, verify, epoch, ledger, reconcile, serve) where serve can never run before epoch and ledger complete; colophon admin restore verify|epoch|hold|jobs|resume; L11/L12/L13 load evidence with container-pause fault injection; load.sh port-squatter guards so a stale process can never silently corrupt a run."
proof = ["backup drill: 2.2 GB encrypted, 252s+138s, manifest verifies, WAL segments landing live in the archive volume", "restore drill run twice on the final script: capture 282s, restore 118s, 400s capture-to-verified-serving; epoch 1->2; post-backup deletion replayed as tombstone; post-backup edit absent; in-flight job held; /readyz serving — 5/5 checks, verdict restored-and-verified", "F13 stack test on a template-cloned backup: pending+running->held, leases cleared, held unclaimable, explicit resume only", "F14: export->clone->replay->re-replay across all six kinds incl. deleted projects (no FK so rows outlive)", "L11 (cache paused mid-run): 77,902 req, 0 failed, Postgres-fallback reads, 0 limiter-induced 429s, 100% recovery hit share", "L12 (Postgres paused + worker SIGKILLed): every write fails honestly, no fake commits, jobs resume, sentinel intact", "L13 (purge endpoint 429ing): real backoff (5.2s gaps), pending/uncertain never claimed done, post attempts 5/probe 7", "real bug found: colophon_worker had SELECT(slug) but the ledger's record_in reads id — asset deletions hung in 'deleting'; grant fixed in 0048, 14/14 asset tests green"]
code = "akira-shirase-oss/colophon-cms · main @ 080053e"
+++

P6 is where the CMS stops trusting that the happy path is the only path. Four slices landed;
together they answer one question: if the machine dies tomorrow, what comes back?

## The restore is a procedure, not a prayer

`scripts/restore.sh` runs six stages, each gated by a marker on disk so a half-done restore
refuses to pretend it finished:

1. **Prepare** — decrypt the backup into scratch infrastructure
2. **Verify** — the restored schema must match a migration set this binary knows (a backup
   newer than the code refuses, exit 4)
3. **Epoch** — every environment's epoch advances once, before anything serves. A cached
   generation or stale worker lease from the dead timeline can never act on the new one
4. **Ledger** — the deletion ledger replays: everything deleted between the backup and the
   crash comes back as tombstones, not as ghost content
5. **Reconcile** — the operator checks external effects (CDN purges, webhooks, site deploys)
   before outbox work may fire
6. **Serve** — jobs resume, reads open — last, always last

`held` is the honest middle state for jobs: not queued (nobody may dispatch it), not running
(nobody holds its lease). A restore freezes every unfinished delivery there until a human says
`admin restore resume`.

## Each dependency failure fails honestly

The load trio pauses real containers mid-run, not mocks:

- **L11 — cache dies:** 77,902 requests, zero failed. Reads fall back to Postgres; the
  rate-limiter's Redis cell degrades rather than refusing everything
- **L12 — database dies:** every write fails loudly, nothing pretends to commit, jobs resume
  when the database returns
- **L13 — purge endpoint refuses:** real exponential backoff (5.2s gaps), purges stay
  `pending`/`uncertain` — never relabelled done

The honest-part is worth noting: L11's first evidence run was **removed** because a stale
process squatted the receiver port and the harness silently measured the wrong thing. The fix
wasn't hiding it — `load.sh` now refuses to start when a squatter owns its ports, and the
truthful artifact stayed in `perf/results/` as the record of the incident.

## What survives the crash

The drill ran twice on the final script: 282s to capture the world, 118s to restore it, 400s
wall-clock from capture to verified serving. Epoch advanced 1→2, the post-backup deletion
replayed as a tombstone, the post-backup edit stayed absent (it was never backed up — correct),
and the in-flight job sat `held` until resumed. Five checks, all green, verdict
`restored-and-verified`, evidence stored.

## The ledger exists so restore knows what was deleted

A backup taken at noon can't know the 3pm deletion — `deletion_ledger` records every governed
deletion (project, collection, entry, member, role, asset) with identity-ordered high-water
marks, exports off-host, and replays idempotently. No foreign key on `project_id` — the row
must outlive the project it mourns. Application roles insert only through RLS; export and
replay need operator access.

Next in P6: the remaining load variants (cold cache, stampede, mixed traffic, true 10k-record
data), the fault gaps (concurrent schema edits, delivery-duplicate proof), observability
runbooks, then the 24-hour soak and v0.1.
