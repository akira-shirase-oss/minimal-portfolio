+++
title = "Checkpoint 4.1: retention that keeps the answer"
description = "Checks past 7 days roll into per-day outcome counts and delete in the same transaction — open incidents keep every raw row, and coverage over a long window stays true after expiry."
date = 2026-11-05T22:00:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.1"
short_title = "Retention"
tests = 72

[extra.summary]
goal = "History stays bounded without going dishonest: old evidence expires into sums, never into silence."
built = "check_stats_daily (migration 0002): writer-driven retention rolls expired rows into per-day outcome counts and deletes them in one transaction; hourly tick; open incidents keep every raw row; the outbox is never touched; check_stats unions both tables."
proof = ["retention_aggregates_then_deletes_and_spares_open_incidents", "live: 3 expired rows became the day's aggregate and stats still counted all 6"]
code = "akira-shirase-oss/monitoring-service · main @ b005956"
+++

M4 is operate — the milestone where the monitor learns to live with itself.
Four steps.

**What changed:** checks older than `SMON_RETENTION_S` (7 days default) roll
into `check_stats_daily` — per-monitor, per-day counts per outcome — and
delete in the *same* transaction, so a crash can never leave history that is
neither raw nor summed. Two honest exceptions: a monitor with an open incident
keeps every raw row (an incident's birth evidence doesn't expire while it's
open), and the outbox is never touched. `check_stats` unions both tables, so
coverage over a long window stays true after expiry — the aggregate keeps the
*answer* even when the rows are gone.

**Proof:** `retention_aggregates_then_deletes_and_spares_open_incidents` plus
the live check — 3 expired rows became the day's aggregate and the stats
endpoint still counted all 6 observed.
