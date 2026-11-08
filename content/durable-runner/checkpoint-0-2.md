+++
title = "Checkpoint 0.2 — the journal survives kill -9"
description = "D0–D3 implemented and drill-proven: the framed journal, the single writer, replayed recovery, compaction into a new generation, and a backup-restored second server. Plus the bug the drill caught that tests did not."
date = 2026-11-07
draft = false

[extra]
kind = "experiment"
milestone = "D4"
step = "0.2"
short_title = "The journal survives kill -9"
series = "durable-runner"
+++

Milestones D0 through D3 are implemented, tested, and drill-verified. The
interesting part isn't that it works — it's what the drill caught.

## What exists now

- **`durable-domain`** — the pure reducer: every transition named, every
  invalid one refused by name (`StaleDispatch`, `StaleReply`, `Terminal`,
  `NothingToReconcile`...), bounded retries with deterministic jitter.
  No I/O — testable under a fake clock.
- **`durable-journal`** — framed append-only records
  (`version | len | seq | crc32 | payload`), one exclusive writer via
  `flock`, a generation manifest swapped atomically, snapshots as
  accelerators, a 64 MiB admission reserve. Corrupt committed history
  stops startup; only a provably-torn tail is discarded.
- **`durable-engine`** — `EngineCore` (sync, clock-injected) plus the
  actor shell: bounded in-flight dispatch, a deadline sweep that turns
  expired attempts into reconciliations — never blind repeats — and one
  `{operation_key}/{step}` idempotency key across all of a step's
  attempts.
- **`durable-server` + `durable`** — the Axum coordinator and CLI:
  `submit | inspect | cancel | compact | backup | restore`.

## The drill, and what it caught

Kill -9 with a job mid-flight → restart → the journal replayed the
accepted run, the engine dispatched it, it finished `done`. Compaction
produced generation 2 behind an atomic manifest swap; a backup restored
onto a second server returned identical state.

But the first restore came back with **zero runs**. The journaled
envelope hadn't carried a timestamp, so replay applied transitions at
`now = 0` — every terminal run looked finished at the epoch and the
7-day expiry deleted it on the spot. The compaction snapshot was
faithfully preserving an empty index.

Fix: `Envelope { run, at, event }` — the commit clock travels with the
record, so replay reproduces real finish times (recorded as **D-007**).
After the fix the full drill passes: submit → `kill -9` → recover →
compact → backup → restore → inspect shows both runs with real
timestamps on a second server.

22 tests green; the restore drill is a shell-level integration check, not
a unit test — the kind of evidence this project exists to produce.

## Still owed before "ship"

The SvelteKit inspection UI, a real three-step pilot workflow (the
contract's content-publish example), and the load plan: 10→100
submits/s against real fsync, replay at 100,000 retained transitions,
stalled handlers, full queues, compaction overlap. Until those run, the
honest status is **building**.
