+++
title = "Checkpoint 3.1: coverage is not success"
description = "GET stats answers 'did we look' and 'what did we see' as separate numbers — 24h of misses is 0% coverage with undefined success, never 'down by silence'."
date = 2026-11-05T21:00:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.1"
short_title = "Coverage vs success"
tests = 67

[extra.summary]
goal = "Two honest numbers: expected slots vs stored evidence — a monitor that stored nothing can't claim 100% of anything."
built = "GET /api/monitors/{id}/stats: expected slots from wall-clock × interval (bounded ?window_s=), observed/missed/passed from stored rows, ratios in basis points, null for undefined denominators; the detail page renders both."
proof = ["CoverageStats domain tests + check_stats store test + stats_separates_coverage_from_success API test", "live: flaky → 0% success, keeper → 100%", "24h of misses → 0% coverage, never 'down by silence'"]
code = "akira-shirase-oss/monitoring-service · main @ 0b57968"
+++

M3 is display — and the first honest number. Four steps.

**What changed:** `GET /api/monitors/{id}/stats` answers *did we look* and
*what did we see* as **separate numbers**. Expected slots come from wall-clock
× interval — not from stored rows, which is the whole point: a monitor that
stored nothing can't claim 100% coverage of nothing. Missed slots never enter
the success denominator, and an undefined denominator returns `null`, which
the dashboard renders as "no data" — not a guessed percent.

**Proof:** domain tests, the `check_stats` store test, and the API test
`stats_separates_coverage_from_success`. Live: a flaky target showed 0%
success while a healthy one showed 100% — and a window of misses reports 0%
coverage with undefined success, never "down by silence".
