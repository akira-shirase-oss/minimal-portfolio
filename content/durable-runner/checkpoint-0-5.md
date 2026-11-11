+++
title = "Checkpoint 0.5: the load battery — and the honest FAIL"
description = "Replay, a submit rate ladder and the 1M-submit sustained run — committed with machine and commit. The sustained gate is red twice over, solo included: the journal's per-record fsync is the ceiling, and admission refuses rather than loses."
date = 2026-11-10

[extra]
kind = "experiment"
milestone = "D4"
step = "0.5"
short_title = "Load battery: red gate"
series = "durable-runner"
+++

The latency battery ran at `c36f5c3` on this machine (Apple M2 Pro, results
in `perf/results/`):

- **Replay** — 100,000 events across 11,112 runs × 4 steps: **pass**.
- **Submit ladder** (60 s each, fsync per record): 10/s → 600/600 accepted,
  p99 115 ms, pass; 50/s → 3,000/3,000, p99 3.3 s, pass; **100/s → 6,000/6,000
  accepted but p99 4.1 s — FAIL** on latency.
- **Sustained** — 1,000,000 submits at 100/s, ~2.8 h wall:
  - first run, contended with the Colophon soak: 619,480 accepted,
    380,520 admission-503s, p50 15.5 s, p99 24.4 s — **FAIL**;
  - solo rerun, machine to itself: **481,914 accepted, 518,086 refused
    503, p50 7.5 ms, p99 29.9 s — FAIL again**.

## What the FAIL actually says

The contention theory is dead: alone, the runner accepts *fewer* submits —
the 503s are the bounded admission control refusing before reserve
exhaustion, exactly as designed, and nothing acknowledged was lost. The
latency gate is red because per-record fsync sets a real throughput
ceiling somewhere between 50 and 100 submits/s; past it, waiters queue into
the seconds. p50 of 7.5 ms solo (vs 15.5 s contended) shows the fast path
is genuinely fast when it isn't saturated.

Per the workspace rule the misses are kept, not re-run until green. The
open work is root-causing the ceiling — batching fsync, group commit, or a
lower declared rate — and then re-measuring. That is the current `up_next`.
