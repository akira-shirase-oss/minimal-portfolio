+++
title = "Checkpoint 4.1: operate — retention, guardrails, and a restore that was actually restored"
description = "Seven days of raw evidence summed into daily aggregates, a disk ceiling that turns pressure into a clean 503, and a backup drill that got run, not just written down."
date = 2026-11-05T22:00:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.1"
short_title = "Operate"
tests = 80

[extra.summary]
goal = "History stays bounded and honest: old evidence expires into sums, disk pressure fails safe, and a restore is proven to bring back an open incident."
built = "check_stats_daily + writer-driven retention, SMON_MAX_DB_BYTES page ceiling + WriteHealth → real 503 readyz, byte-bounded rotating logs, VACUUM INTO backup endpoint + backup-drill.sh."
proof = ["live: 3 expired rows became the day's aggregate and stats still counted them", "capped DB → commits fail → /readyz HTTP 503 'unavailable'; log rotated to .1", "drill: incident open → backup → destroy → restore → down + incident + outbox intact"]
code = "00c43ec"
+++

## What I built

**Retention that keeps the answer, not just the rows.** Checks older than `SMON_RETENTION_S` (7 days default) roll into `check_stats_daily` — per-monitor, per-day counts per outcome — and delete in the *same* transaction, so a crash can never leave history that is neither raw nor summed. Two honest exceptions: a monitor with an open incident keeps every raw row (an incident's birth evidence doesn't expire while it's open), and the outbox is never touched. `check_stats` unions both tables, so coverage over a long window stays true after expiry — verified live: 3 expired rows became the day's aggregate and the stats endpoint still counted all 6.

**Disk pressure fails safe, never corrupt.** `SMON_MAX_DB_BYTES` (2 GiB default) sets `PRAGMA max_page_count` at connect — writes past the ceiling fail `SQLITE_FULL`, which is an error, not corruption. The writer counts consecutive commit failures; `/readyz` answers a real 503 `unavailable` while that count is nonzero, and it only clears when a write lands — recovery is proven by a commit, never a timer. Live: capped the database, watched commits refuse and readiness go 503 while the API stayed responsive. Own output honors the same guardrail: `SMON_LOG_FILE` rotates at `SMON_LOG_MAX_BYTES` keeping two generations.

**A restore that was actually restored.** `POST /api/backup` runs `VACUUM INTO` — the WAL-aware online snapshot — to an absolute path and reports its byte size. `scripts/backup-drill.sh` rehearses the whole thing: drive an incident open, back up, kill the server, swap in the snapshot, restart. Result: `down`, one open incident, one pending outbox row — nothing replayed, nothing lost.

One SQLite truth learned live: `max_page_count` clamps to the database's current size, so a ceiling only bites on *growth* — the disk-pressure test fills free pages until the cap refuses.
