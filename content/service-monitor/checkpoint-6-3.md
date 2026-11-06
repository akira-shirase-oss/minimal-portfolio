+++
title = "Checkpoint 6.3: the four incident times"
description = "first_fail_at, opened_at, last_fail_at, resolved_at tracked separately — start-of-failure is not time-of-notice, and the streak start is derived from committed rows inside the transaction."
date = 2026-11-06T12:36:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.3"
short_title = "Four incident times"
tests = 101

[extra.summary]
goal = "Keep when the failure started, when the monitor noticed, when it last saw the failure, and when it recovered as separate committed facts."
built = "first_fail_at derived inside the commit transaction from committed check rows (oldest consecutive failure since the last pass/missed — restart-safe), opened_at on the crossing slot, last_fail_at re-stamped per failing check, resolved_at on recovery; NULL for pre-existing rows."
proof = ["store test: streak slots 1–5 → first=1, opened=3, last=5", "live: first_fail_at 30s before opened_at on a refused-port monitor", "API IncidentView + webhook IncidentRef carry all four"]
code = "akira-shirase-oss/monitoring-service · main @ ec7265a"
+++

Third gap in the M6 audit.

**Gap:** the old monitor kept opened/first-fail/last-fail/resolved apart; the
rebuild tracked open and resolved only. Start-of-failure ≠ time-of-notice is
the entire point of incident forensics.

**What changed:** `first_fail_at`, `opened_at`, `last_fail_at`, `resolved_at`
are all committed separately. The design choice: `first_fail_at` is **derived
inside the commit transaction** from committed check rows — the oldest
consecutive failure since the last `pass`/`missed` — so it stays correct across
restarts and is never fabricated from scheduler memory. `last_fail_at`
re-stamps on every failing check while open. Pre-existing rows keep NULL
rather than invented history. All four ride the API `IncidentView`, the webhook
payload, the CLI, and the dashboard incident rows.

**Proof:** the store test asserts exact slot relationships — a five-slot streak
yields first=slot 1, opened=slot 3, last=slot 5. Live: on a refused-port
monitor `first_fail_at` landed 30 seconds before `opened_at` — the failure
started two slots before the threshold noticed.
