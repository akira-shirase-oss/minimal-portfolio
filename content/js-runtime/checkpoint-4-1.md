+++
title = "Checkpoint 4.1+4.2: supervision is a real process boundary"
description = "jsrt supervise runs the host in a child and enforces what a child cannot enforce on itself — CPU seconds by rlimit the child can't decline, resident memory by footprint polling, a wall backstop, and a JSON report of exactly how it ended."
date = 2026-11-08T00:40:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.1+4.2"
short_title = "The process boundary"
tests = 64

[extra.summary]
goal = "The hard boundary an in-process watchdog can never be: the worker is a separate process, the supervisor only waits and reports."
built = "jsrt supervise <script> [--max-rss-mb] [--max-cpu] [--wall-ms] — pre_exec rlimits, proc_pid_rusage polling at 25ms, wait4 for status+peak rusage, two-stage SIGTERM→SIGKILL, a JSON run report per supervised run."
proof = ["spin.js + --max-cpu 1 → SIGXCPU at 1001ms CPU, killed_by: cpu-budget, exit 6", "8MiB-chunk bomb + --max-rss-mb 200 → SIGTERM, peak 231MB (poll-interval overshoot), killed_by: rss-budget, exit 6", "exit classes pass through untouched: exception → 5, capability → 7", "parked promise + --wall-ms 800 → killed_by: wall-clock"]
code = "akira-shirase-oss (local, not yet pushed) · 77f4c16"
+++

Everything until now asked the runtime to police itself — and the M1
watchdog already proved the limit of that: `terminate_execution` can stop
JavaScript, but a parked event loop can't be interrupted and a malloc
can't be un-issued. M4 stops asking. The runtime lives in a child
process; the supervisor only waits, measures, and kills.

**CPU gets the kernel, memory gets a poll.** `RLIMIT_CPU` is applied in
`pre_exec` — post-fork, pre-exec — so the budget exists before the
worker's first instruction runs; the child cannot decline it. Memory is
different and honesty matters here: `RLIMIT_AS` is the obvious tool and
it is *unusable* — V8 reserves a multi-GB pointer cage at startup, so an
address-space limit sized for RSS would stop the engine from booting.
The budget is enforced on *observed footprint* instead —
`proc_pid_rusage` every 25ms — which means worst-case overage is
allocation-rate × poll-interval. That's a bound, not a brick wall, and
the report carries `poll_interval_ms` so the bound is on the record.

**The report is the contract.** `wait4` is the only `wait` that returns
both exit status and peak resource usage, so it does both jobs — reap
and measure. Every supervised run emits one JSON record: run_id,
outcome, exit_code, signal, peak_rss_bytes, cpu_ms, wall_ms, limits,
killed_by. Exit classes pass through untouched — a worker's 5 stays 5 —
while a signal death gets classified: SIGXCPU is `cpu-budget`, our own
SIGTERM is whichever budget tripped, an unexplained signal is a host
failure named as such.

Two bugs the build caught are worth recording: a second reap site in the
kill path hit `ECHILD` on the already-reaped zombie — now exactly one
call site owns reaping; and `ru_maxrss` is bytes on Darwin (KiB on
Linux), which briefly reported 27GB for a 27MB isolate.

**Lesson:** a watchdog inside the process can only ever be advisory —
it shares fate with the thing it watches. The moment a guarantee has to
survive a hostile script, the enforcement has to live one boundary away:
kernel counters, parent pids, and a report the dead process can't edit.
