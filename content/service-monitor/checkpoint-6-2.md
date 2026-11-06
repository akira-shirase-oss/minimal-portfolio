+++
title = "Checkpoint 6.2: per-monitor alarm sensitivity"
description = "failures_to_open and passes_to_recover live on the monitor row — a noisy target and a quiet one get different tripwires, applied atomically with the generation bump."
date = 2026-11-06T12:33:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.2"
short_title = "Per-monitor sensitivity"
tests = 100

[extra.summary]
goal = "Let each monitor tune its own tripwire instead of hard-coding 3-fail/2-pass for everything."
built = "failures_to_open / passes_to_recover (1–10, default 3/2) on the monitor row, read from the same committed gate row as the generation — config passed into record per observation, never cached."
proof = ["live: a failures_to_open=1 monitor opened its incident on check #1 while a default-threshold monitor at two failures still waited", "edit bumps generation → new threshold applies on the very next committed check"]
code = "akira-shirase-oss/monitoring-service · main @ e1972b4"
+++

Second gap in the M6 audit.

**Gap:** the old monitor let each target tune its own tripwire; the rebuild
hard-coded 3-fail/2-pass for everything. A noisy target and a quiet one deserve
different thresholds.

**What changed:** `failures_to_open` and `passes_to_recover` (1–10, default
3/2) live on the monitor row, validated at create and patch, surfaced in the
API view and the CLI. The decision that matters: thresholds are **config passed
into `record` per observation**, read from the same committed gate row as the
generation — never cached machine state. An edit bumps generation and the new
threshold applies to the very next committed check, atomically; there is no
stale-threshold window to reason about.

**Proof:** live drill — a `failures_to_open=1` monitor opened its incident on
check #1 while a default-threshold monitor at two failures still waited. The
API rejects 0 and 11 on both create and patch with `invalid_request`.
