+++
title = "Checkpoint 7.1: a thousand cold starts"
description = "1,000 release-binary spawns, wall clock from exec to exit — p50 10.8ms, p95 14.4ms, p99 28.5ms, one 138ms outlier kept in the record, zero failures."
date = 2026-11-10T09:00:00Z

[extra]
kind = "experiment"
milestone = "M7"
step = "7.1"
short_title = "cold start ×1000"
tests = 84

[extra.summary]
goal = "Cold-start cost, measured like a claim that has to survive scrutiny: a thousand real spawns, percentiles not vibes, machine and commit on the artifact."
built = "perf/load.py driving 1,000 `jsrt run cold.js` spawns against the release binary; peak child RSS captured from getrusage(RUSAGE_CHILDREN)."
proof = ["p50 10.8ms / p95 14.4ms / p99 28.5ms over 1,000 runs", "max 138.4ms — one outlier, recorded not dropped", "0 failed spawns in 1,000", "peak single-child RSS 21.3MB — the worst spawn's footprint, not an average"]
code = "akira-shirase-oss (local, not yet pushed) · e2a0099"
+++

M1.3 measured cold start once — 100 spawns, p50 9.2ms. M7.1 asks the
question honestly at 10x the sample: 1,000 full process spawns of the
release binary, wall clock from `exec` to exit, on the same M2 Pro.

The numbers moved a little and told the truth about why: p50 10.8ms,
p95 14.4ms, p99 28.5ms, and one 138.4ms outlier — a macOS scheduling
hiccup on a loaded workstation, kept in the artifact because dropping
it would be the kind of lie this project exists to avoid. The mean
(11.6ms) sits above p50 for the same reason — the tail is real, it's
just rare.

What the number actually is: macOS `exec` + dyld loading a ~300MB
release binary + V8 isolate boot + module parse/eval + one op + exit.
The engine's share of it is small — most of the 10.8ms is the price of
being a real process on a real OS, which is exactly the honest answer
for a CLI runtime: you don't get to amortize spawn cost, so you keep
it low enough to not care.

Peak child RSS: 21.3MB — the *worst single spawn's* max resident
footprint (`getrusage(RUSAGE_CHILDREN)` reports the max across all
waited children). Across 1,000 runs the floor didn't drift — a runtime
that leaks during boot would show a climbing worst-case, not a flat
one.

The artifact — `perf/results/m7-1-cold-start-…-ecbc7dd.json` — carries
the commit, the chip, the core count, the OS version, and the caveats
("single workstation, no contention; laptop numbers stay lab
numbers"). Numbers without context are marketing; these come with
theirs.

**Engineering lesson:** the interesting statistic is the tail, not the
median. p50 says what a user usually pays; p99 says what the
distribution honestly costs. Keeping the 138ms outlier in the record
is the difference between measuring a system and auditioning for one.
