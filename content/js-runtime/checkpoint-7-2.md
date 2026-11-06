+++
title = "Checkpoint 7.2: the million-request proof"
description = "The workspace load standard applied to jsrt itself: 1,000,000 op calls and 1,000,000 HTTP requests through rt.serve — 90k rps, p99 under a millisecond, zero errors — plus the saturation probe that found the real knee."
date = 2026-11-10T09:30:00Z

[extra]
kind = "experiment"
milestone = "M7"
step = "7.2"
short_title = "1M through the boundary"
tests = 84

[extra.summary]
goal = "The workspace rule made real on the runtime itself: million-scale load with throughput, p50/p95/p99, error rate, and saturation behavior measured — misses kept."
built = "crates/jsrt-load — the project's own load driver (ab can't name refused vs timeout vs non-2xx); keep-alive workers pull tickets off one atomic counter, latencies merge per-worker, one JSON report. perf/load.py drives the scenarios into perf/results/."
proof = ["1,000,000/1,000,000 rt.now() op calls: 28.4ns/call, ~35.2M calls/s", "1,000,000/1,000,000 HTTP requests ok: 90,251 rps @32 conns, p50 346us/p95 430us/p99 608us, zero errors", "saturation probe @128 conns: rps flat at 90,347 while p50 went 346us -> 1485us — the knee is the pull-model dispatch loop", "a 20s smoke artifact kept that shows a broken workload (r.text() threw 6,630x) — evidence, not embarrassment"]
code = "akira-shirase-oss (local, not yet pushed) · e2a0099"
+++

The workspace rule is blunt: systems that take traffic get load-tested
to a million units, and the misses stay in the record. M7.2 applies it
to the runtime itself — the op boundary and `rt.serve`, the two paths
every future app runs on.

## The driver had to exist first

`ab` is the only benchmark tool on this machine, and it can't answer
the questions that matter: how many connections were *refused* vs
timed out vs answered wrong? What does p99 look like, not "requests
per second"? A screenshot of a terminal isn't evidence. So the project
has its own driver — `crates/jsrt-load`, a hundred-ish lines of
hyper-util/tokio: workers pull request tickets off one atomic counter,
each keeps its own keep-alive connection (the same shape `rt.serve`'s
pull dispatch is built to serve), latency samples merge per-worker,
and the output is one JSON object that lands verbatim in
`perf/results/`.

## What the boundary costs

One million `rt.now()` calls: 28.4ns per call end to end, ~25.8ns of
that the boundary itself after subtracting the JS loop baseline —
about 35 million calls per second on this chip. Interesting detail:
the 1M figure is *better* than the 10k figure from M1.3 (~55ns). A
longer run amortizes call-site warmup that a short bench pays for —
which is why the artifact records `n` alongside the rate.

## A million requests through rt.serve

1,000,000 GETs over 32 keep-alive connections: **1,000,000/1,000,000
ok, 90,251 requests/second, p50 346µs, p95 430µs, p99 608µs, worst
single request 11.7ms, zero errors, zero refused, zero timeouts** —
11 seconds of wall clock.

## The probe that made it honest

Throughput alone is a marketing number, so the second run quadrupled
concurrency to 128 — and the answer came back flat: 90,347 rps
(identical), while p50 went 346µs → 1,485µs and p99 608µs → 2,429µs.
Throughput pinned, latency scaling with concurrency: the server is
saturated and extra clients just queue. The knee is exactly where the
architecture put it — the single-threaded pull-model dispatch loop
costs ~11µs of serialized service per request, and ~90k/s is what
1/11µs looks like. Knowing your saturation point is worth more than a
bigger number; it means the bound was measured, not guessed.

## Evidence means the misses too

The results directory also keeps two 20-second soak smoke artifacts —
one where the workload itself was broken (`rt.fetch` returns
`{status, body}`, not a `Response`; my `r.text()` threw 6,630 times)
and one verifying the fix. Deleting the bad run would make the record
prettier and less true.

**Engineering lesson:** "we load tested it" is not a fact until the
failure shapes are named. Throughput, percentiles, *and* what happens
past the knee — refused? timed out? queued as latency? — that's the
contract. Everything else is a vibes report.
