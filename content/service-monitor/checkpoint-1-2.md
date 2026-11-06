+++
title = "Checkpoint 1.2: the coordinator that refuses to queue"
description = "Slots fire on the interval grid under try_acquire bounds — one attempt per slot, no overlap, no catch-up; a saturated worker records 'missed', never a queue storm."
date = 2026-11-05T12:10:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.2"
short_title = "Scheduler + coordinator"
tests = 31

[extra.summary]
goal = "Slots fire per interval and results are collected — one attempt per slot, no overlap, no catch-up, stale generations dropped."
built = "Interval-grid coordinator with try_acquire concurrency bounds (20 global, 2 per origin, 1 per monitor); a probe still running at the next tick records the slot as missed."
proof = ["3 end-to-end tests in tests/schedule.rs", "saturated workers → missed rows, never a queue storm"]
code = "akira-shirase-oss/monitoring-service · main @ bf13126"
+++

**What changed:** every monitor gets a slot on the interval grid, and the
concurrency bounds — 20 global, 2 per origin, 1 per monitor — are `try_acquire`,
not queues. When a probe is still running at the next tick, that slot is
recorded as `missed`, never parked for later.

The decision that matters: a monitor under pressure *degrades honestly*
instead of queueing attempts and then stampeding the target the moment it
recovers. Most schedulers hide load by deferring it; this one reports it.
`missed` is a first-class committed outcome — the system saying "I was too
busy to look" as data, not silence.

**Proof:** 3 end-to-end tests in `tests/schedule.rs` — saturated workers
produce `missed` rows, never a queue storm.
