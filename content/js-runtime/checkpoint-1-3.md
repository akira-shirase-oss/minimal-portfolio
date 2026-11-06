+++
title = "Checkpoint 1.3: the boundary, measured"
description = "Cold start p50 9.2ms, an rt.now() call costs ~55ns, and a 1ms sleep actually lands at 2.3ms — the first committed numbers, with the machine attached and the caveats attached harder."
date = 2026-11-07T18:00:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.3"
short_title = "Op boundary"
tests = 21

[extra.summary]
goal = "The op boundary measured, not vibes: cold-start p50/p95 over 100 runs, per-call op cost over 10,000 calls, timer throughput — recorded with commit and machine, never presented as production claims."
built = "perf/measure.py (release-build driver) + three bench scripts; committed artifact perf/results/m1-3-*-8294ff8.json with environment, workload and caveats."
proof = ["cold start p50 9.2ms / p95 10.6ms over 100 process spawns (Apple M2 Pro)", "rt.now() ~66ns/call (~55ns net of JS loop baseline); rt.hostInfo() ~267ns — serialization is ~5x a scalar", "timer floor ~1.2ms: sleep(0) costs 1.19ms, sleep(1) lands ~2.29ms with ~1.29ms drift"]
code = "akira-shirase-oss (local, not yet pushed) · 4846ef3"
+++

"Fast" is a claim, not a property — so M1 closes with numbers instead.

**Cold start.** One hundred full process spawns of a trivial script — fork,
dyld, V8 snapshot init, parse, eval, one op, exit: p50 **9.2ms**, p95
**10.6ms**, tight enough that the max was 14.4ms. That includes everything
macOS charges for spawning a process, which is honest: it's what `jsrt run`
actually costs a user, not what V8 costs in isolation.

**The boundary.** `rt.now()` — a scalar op — costs ~66ns per call over
10,000 calls, ~55ns once the JS loop baseline is subtracted.
`rt.hostInfo()` — which serializes a struct — costs ~267ns. Two lessons in
one number: the V8↔Rust crossing itself is nearly free (sub-100ns), and the
real cost of an op is *what crosses it* — serialization is ~5x the crossing.
That's the design pressure for M5's APIs: prefer scalar/byte payloads, keep
serde objects for when they earn it.

**The timer floor.** The one that isn't flattering: `sleep(0)` costs 1.19ms
— that's the real per-timer scheduling overhead — and `sleep(1)` lands at
~2.29ms with ~1.29ms of drift. Sub-millisecond timing doesn't exist here; a
script that asks for 1ms gets ~2.3ms. That's recorded in the artifact and on
the roadmap, not smoothed over — M7's load profile will show whether the
floor matters at scale.

All of it is labeled what it is: one release build, one Apple M2 Pro, no
contention — a baseline for regression detection, not a capacity claim.

**Lesson:** measuring early does two jobs — it gives regressions something
to be compared against, and it catches the claims your own optimism would
otherwise ship ("a 1ms timer is not a 1ms timer" is exactly the kind of
sentence a build log should get to say first).
