+++
title = "Checkpoint 5.3: load — measured, not targeted"
description = "The monitor's own scheduler as the load generator: 100 monitors at the 15s floor for 10 minutes — 4000/4000 slots, zero missed, p95 commit lag 4.9s, 107/107 alerts first-attempt."
date = 2026-11-06T02:20:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.3"
short_title = "Load baseline"
tests = 88

[extra.summary]
goal = "Load evidence that is measured rather than targeted — bounded pools held under a 22.5% error rate, misses counted never hidden."
built = "perf/lab-profile.mjs: 100 monitors at the 15s floor registered in one wave (a phase-locked burst on the 20 global slots) across 10 fixture origins — 50 ok / 20 flaky / 15 slow / 10 dead / 5 hung."
proof = ["10 min: 4000/4000 slots accounted, 0 missed, commit-lag p95 4.9s vs 5s grace, 62 incidents → 107 outbox events all delivered first-attempt, RSS flat ~27MB, DB 840KB", "result committed: perf/results/2026-11-06T01-18-54.904Z-33656f5.json", "24h soak documented as not yet run"]
code = "akira-shirase-oss/monitoring-service · main @ 6ae40fc"
+++

**What changed:** `perf/lab-profile.mjs` uses the monitor's own scheduler as
the load generator — an external driver would only exercise the API. 100
monitors at the 15 s floor, registered in 126 ms, so every wave is a
phase-locked 100-slot burst on the 20 global slots across 10 fixture origins
(50 ok / 20 flaky / 15 slow / 10 dead / 5 hung — a 22.5% error rate built
in). `GET /version` shipped alongside it, since the harness needed the
binary's own version for upgrade checks.

**Proof — the measured baseline, Darwin arm64, 10 min:** **4,000 checks =
every slot accounted, zero missed**; commit-lag p95 **4.9 s** against the 5 s
grace — the wave-drain queue is the whole story, and it's honest that headroom
is ~2%. 62 incidents produced exactly 107 outbox events (45 resolved × 2 + 17
open), **all delivered first-attempt** — sink hits match to the row. RSS flat
at ~27 MB, DB 840 KB. The guide's 24-hour soak is written down as *not yet
run* — the bounded baseline is the evidence that exists.

**The finding worth keeping:** the first load run put all 100 monitors on one
fixture origin — the 2-per-origin semaphore throttled everything and 180 slots
went `missed` in the first minute. That's polite-probing working as designed;
the harness (not the bound) was wrong, and the fix was more origins.
