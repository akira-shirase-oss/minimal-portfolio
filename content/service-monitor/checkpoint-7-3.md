+++
title = "Checkpoint 7.3: load-tested against a real app, not fixtures"
description = "The lab profile proved the monitor keeps bounded evidence under load it generates itself. This drill drives 3.84M requests at a real Node app, degrades it, heals it, and checks every monitor claim against the app's own ground truth."
date = 2026-11-06T15:00:00Z

[extra]
kind = "experiment"
milestone = "M7"
step = "7.3"
short_title = "Real-app load drill"
tests = 137

[extra.summary]
goal = "Prove the monitor's readings against an application that answers its own ground truth — lab numbers stay lab numbers."
built = "perf/real-app.mjs — a dependency-free Node app doing genuine work per request, exposing /__stats (per-route count/errors/latency histograms) and /__ctl (degradation that fails after the work); perf/real-app-load.mjs ramps 2→40 workers, degrades 85% then 100%, heals, and asserts 12 invariants through the real API; committed result artifact."
proof = ["committed perf/results/real-app-2026-11-06T14-03-29.168Z-825110a.json — 12/12 pass: 3.84M requests, 0 missed slots, incident first_fail→opened→last_fail→resolved all honest, open+recover alerts delivered, control quiet, lag p95 842ms, RSS flat ~18MB", "the 85% phase found real semantics: a lucky pass heals an incident mid-window — assertions check invariants, not a scripted flap pattern"]
code = "akira-shirase-oss/monitoring-service · main @ e38584f"
+++

The last deferred item — lab numbers stay lab numbers until a real
application agrees with them.

**Gap:** the M5.3 baseline measured the monitor against *fixture* endpoints —
servers that exist to answer `/flaky` on cue. That proves the writer keeps up;
it proves nothing about whether the monitor's story matches what a real
application actually did under real traffic. "The monitor said 100% fail" is
only a claim until the app says how many requests it failed.

**What changed:** `perf/real-app.mjs` is a dependency-free Node app that does
genuine work — `GET /api/items` scans and aggregates a filtered row set,
`POST /api/echo` round-trips a bounded body — and publishes its own ground
truth at `GET /__stats` (per-route counts, error totals, latency histograms).
`POST /__ctl` sets a degradation fraction that fails requests *after* the work
runs, so the monitor sees honest slow 500s, not refused sockets.
`perf/real-app-load.mjs` orchestrates the whole story: a closed-loop load
generator ramps 2 → 40 concurrent workers (~7.5 min), two real monitors watch
the busy route and a quiet `/health` control, the app is degraded at 85%, then
100% for the last 45 s, then healed — and every assertion is gathered through
the real API: committed check rows, incidents, webhook events at a live sink,
set against the app's `__stats` truth.

The 85% phase earned its keep before the final run: at a partial outage, one
lucky pass resolves the incident mid-window (`passes_to_recover=1` — a pass is
a pass, whatever my phase labels say). That's the domain being honest, not a
test flake — so the drill asserts *invariants* (an incident opens in-window,
every incident heals once the app does, each transition delivers its alert)
instead of a scripted flap pattern, and the 45 s hard-outage tail guarantees a
stable-open incident reaches the recovery phase.

**Proof:** `perf/results/real-app-2026-11-06T14-03-29.168Z-825110a.json` —
12/12 assertions on a committed artifact: 3,837,352 requests sent, 0 client
errors, client p95 7 ms; the app truthfully recorded 777,060 errors over
2.69 M item requests (28.9%, concentrated in the degrade window as designed).
The monitor committed 30+30 check rows with **zero missed slots** at a 15 s
interval, commit lag p95 842 ms, RSS flat ~18 MB across the whole run. One
incident: `first_fail_at` 14:07:00 → `opened_at` 14:07:15 (two consecutive
fails) → `last_fail_at` 14:08:45 → `resolved_at` 14:09:00 on the first pass
after heal — all four times honest. Open *and* recover alerts each delivered
once to the sink. The control monitor committed its 30 checks and never
paged.

**Lesson:** a monitor's numbers are only meaningful next to a counter it
didn't write. Giving the app its own `__stats` turned "the monitor observed X"
into a checkable claim — and letting the degradation be probabilistic instead
of scripted is what exposed the mid-window heal semantics. Choreograph
traffic; never choreograph truth.
