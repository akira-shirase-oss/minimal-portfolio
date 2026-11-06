+++
title = "Checkpoint 7.3: an hour under load, no drift"
description = "The soak: 1.56 million timer/fetch iterations over one hour — pending handles identical at minute 1 and hour 1, 389,730 fetches with zero errors, and an RSS shape that says allocator, not leak."
date = 2026-11-10T12:30:00Z

[extra]
kind = "experiment"
milestone = "M7"
step = "7.3"
short_title = "the hour soak"
tests = 84

[extra.summary]
goal = "One hour of timer/fetch churn — the question a soak answers: does anything accumulate that shouldn't? Retained handles and RSS drift, measured not assumed."
built = "perf/scripts/soak.js — setTimeout(0) churn + self-cancelling intervals + a loopback rt.fetch every 4th iteration, printing its own pending-timer count every 60 iters; perf/soak.py samples both processes' RSS every minute and correlates."
proof = ["1,558,920 iterations, 1,565,093 interval fires, 389,730 fetches — 0 errors", "pending timers: 9 at minute 1, 9 at hour 1 — retained work fully recycled", "RSS +52MB total but stepped not sloped: flat 15min, one step to ~88MB, flat 35min incl. a GC dip to 59MB, step down to ~82MB at the end", "both smoke artifacts kept — one shows the workload bug (r.text() threw 6,630x), one the fix"]
code = "akira-shirase-oss (local, not yet pushed) · soak artifact committed"
+++

The last check on the roadmap is the one only time can run: does the
runtime *accumulate* anything it shouldn't? One hour of `soak.js` —
eight `setTimeout(0)` per iteration, a `setInterval` that cancels and
reschedules itself every three ticks, and a loopback `rt.fetch` every
fourth iteration — while `perf/soak.py` samples RSS once a minute.

## The answer, two ways

The runtime's own view: `rt.pendingTimers()` reported **9** at minute
one and **9** at hour one — across 1,558,920 iterations and 1,565,093
interval fires. Whatever a cancel-path leak would look like (pending
climbing forever), this isn't it. The handles come back.

The OS's view is the more interesting read. RSS went +52MB over the
hour — the number that would normally get reported as "drift +52MB,
investigate". But the *shape* says something different: flat ~30MB for
fifteen minutes, then a single step to ~88MB, then flat for
thirty-five minutes — including one visible drop to 59MB and back,
which is a garbage collection caught mid-sample — then a final step
*down* to ~82MB for the last stretch. A leak is a slope: memory that
climbs and never comes back. This is plateaus and a dip: an allocator
sizing its heap to the working set, holding it, occasionally returning
some. The pending count staying at 9 confirms it — retained *work*
never grew; the heap just learned its own size.

389,730 fetches, zero errors, on the same loopback serve path the
million-request run measured. The serve target's RSS stayed ~24MB all
hour — flat as a table.

## What "kept" means

The results directory also carries the two 20-second smoke artifacts
from before the real run: one where the workload itself was wrong
(`r.text()` — `rt.fetch` returns `{status, body}`, not a `Response`)
and 6,630 fetches all failed, and one verifying the fix. They're
evidence the smoke-test-first discipline caught a harness bug before
it could burn an hour.

And with this, the roadmap is done — M0 through M7, every step with
committed evidence: the run lifecycle, the module fence, the
capabilities, the supervision boundary, the stdlib, a real app shipped
and rolled back, and the load numbers that say what it costs.

**Engineering lesson:** drift is a shape, not a delta. "RSS went up"
is the start of a question, not an answer — read the series, look for
slopes vs steps, and check the runtime's own retained-work counters
before calling anything a leak. The worst memory bug reports are the
ones that were just an allocator doing its job.
