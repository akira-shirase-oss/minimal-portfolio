+++
title = "Checkpoint 4.2: disk pressure fails safe, never corrupt"
description = "A page-count ceiling turns a full disk into clean SQLITE_FULL errors, consecutive commit failures answer a real 503 on readyz — and recovery is proven by a landed write, never a timer."
date = 2026-11-05T22:10:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.2"
short_title = "Disk guardrails"
tests = 78

[extra.summary]
goal = "A bounded store: disk pressure produces errors and an honest readiness signal — never corruption, never a fake green."
built = "SMON_MAX_DB_BYTES → PRAGMA max_page_count at connect; WriteHealth counts consecutive commit failures; /readyz answers 503 unavailable while nonzero and clears only on a landed write; SMON_LOG_FILE rotates at a byte bound, two generations."
proof = ["writes_past_the_page_ceiling_fail_and_flag_unhealthy + a_landed_write_clears_the_failure_count + readyz_reports_unavailable_when_writes_fail", "live: capped DB → commits refuse → /readyz HTTP 503; log rotated to .1"]
code = "akira-shirase-oss/monitoring-service · main @ fcc1b59"
+++

**What changed:** `SMON_MAX_DB_BYTES` (2 GiB default) sets
`PRAGMA max_page_count` at connect — writes past the ceiling fail
`SQLITE_FULL`, which is an error, not corruption. The writer counts
consecutive commit failures in `WriteHealth`; `/readyz` answers a real 503
`unavailable` while that count is nonzero, and it clears **only when a write
lands** — recovery is proven by a commit, never a timer. The monitor's own
output honors the same guardrail: `SMON_LOG_FILE` rotates at
`SMON_LOG_MAX_BYTES`, keeping two generations.

**Proof:** the three write-failure tests plus the live drill — capped the
database, watched commits refuse and readiness go 503 while the API stayed
responsive; the log rotated to `.1`.

**One SQLite truth learned live:** `max_page_count` clamps to the database's
current size, so a ceiling only bites on *growth* — the disk-pressure test
fills free pages until the cap refuses.
