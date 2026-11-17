+++
title = "Checkpoint H.2: the million-request numbers, re-run on the hardened build"
description = "The review follow-up closed ten findings, including a slow-reader regression from my own eviction fix and a heap bomb inside a callback that could park the process forever. The final check says ship. Then all six M7 load runs, re-run on the current build at a near-quiet load average, pass, at a few percent below the old numbers."
date = 2026-11-17T05:48:00-05:00

[extra]
kind = "release"
milestone = "H"
step = "H.2"
short_title = "M7, re-run on the hardened build"
# Tests at head: 76 lifecycle, 14 security, 31 serve, 11 supervise, 24 host (README).
tests = 156

[extra.summary]
goal = "Close the security review's follow-up findings, then re-run the whole M7 load battery on the hardened build, since the old numbers predated every fix."
built = "Slots that slow readers can't pin, a heap limit that ends a run instead of aborting V8, a callback heap bomb that exits 6, a fence check before any filesystem touch, a FIFO-proof readText, misspelt manifest keys refused, and a re-run harness that records the load average."
proof = ["final check at 8baba4d: ship", "serve 1M: 1,000,000 ok, 86,620 rps, p99 467 µs", "saturation 1M at 128 connections: 85,875 rps, p99 1,780 µs", "webhook 1M: 50,629 rps, exactly one key stored", "1-hour soak: 1,439,460 iterations, 0 fetch errors, pending timers 9 → 9"]
code = "akira-shirase-oss/js-runtime · main @ ad04128 (runtime code unchanged since 8baba4d)"
+++

Old benchmark numbers are like an old map. They were true once, but the roads have moved since.

jsrt's M7 numbers were from 2026-11-06, before the whole security pass. Today they were re-measured
on the build that actually ships.

## What I built

**The review follow-up**, merged:

- **Slow readers can't pin `rt.serve`'s slots.** My previous round's eviction fix let a response that
  was being written keep its slot no matter how slowly its reader read, so slow readers could pin every
  slot. Now a response keeps its slot only while the reader keeps up a minimum rate. The accept loop
  re-checks every 100 ms at the cap, and an optional `response_timeout_ms` bounds a whole response.
- **The heap limit ends the run.** One large allocation aborted V8 instead of exiting cleanly with code
  6, and tiny `--max-heap-mb` values crashed even hello-world. Now the limit gets 1 GiB of headroom the
  first time it's hit, and the flag must be 0 or at least 16.
- **A heap bomb inside a callback ends the run too.** Inside a timer, a microtask, a `.then`, after an
  `await` or in a serve handler, it made the process park (forever with `--timeout 0`) or report
  success. Now a wake signal ends the run, and after a 2-second grace it exits 6 whatever `--timeout`
  says.
- **A script can't probe the host's files.** A script with no grants could tell which host paths
  existed. The path is now checked against the fence before the filesystem is touched, with one refusal
  message for every case.
- Smaller ones: the key-value store's open error no longer names its full path, `readText`'s size cap
  can't be bypassed with a FIFO, a refused private name no longer shows the script its addresses, and a
  misspelt manifest key is refused with exit 8 instead of silently ignored.

## How it works (the short version)

The re-run uses the same six scenarios as M7, on a release build. Each result now records the machine's
load average before and after. The old runs didn't, which matters below.

## Does it actually work?

All six pass, at `f83f39d` (the runtime code is the same as the reviewed `8baba4d`), on my development
Mac (Apple M2 Pro, 12 cores, 32 GB) with the 1-minute load average between about 1.1 and 5.2:

| run | 2026-11-17 | 2026-11-06 |
|---|---|---|
| cold start, 1,000 spawns | p50 9.28, p99 11.353 ms, 0 failures | p50 10.797, p99 28.511 ms |
| 1M op calls | 27.83 ns/call | 28.39 ns/call |
| serve 1M, 32 connections | 86,620 rps, p99 467 µs, 0 errors | 90,251 rps, p99 608 µs |
| saturation 1M, 128 connections | 85,875 rps, p99 1,780 µs | 90,347 rps, p99 2,429 µs |
| webhook 1M, dedup path | 50,629 rps, p99 813 µs, one key stored | 52,203 rps, p99 804 µs |
| soak, 1 hour | 1,439,460 iterations, 0 fetch errors | 1,558,920 iterations, 0 errors |

Throughput is down 3 to 5% and the soak did 7.7% fewer iterations. I'm not blaming that on the code or
on the machine: the old runs recorded no load average, so there's nothing to compare it against. Tail
latency on serve and saturation is better. The soak's pending timers were 9 at minute one and 9 at the
end, and its memory stepped up once at minutes 17 to 18 and then held at 88.1 to 89.4 MiB.

The final check of the review follow-up says **ship**. 156 tests at `main`, and CI is green on Linux
and macOS.

## Where I messed up

**My eviction fix caused the slow-reader bug.** It spared any connection whose response was still being
written, and a slow reader could stay in that state forever.

**I pinned a tool release from that same day.** The project's rule is to use releases at least two
weeks old. I moved the dependency-audit tool to a release published that morning, then fixed it.

## What it doesn't do yet

- **No independent review of the re-run.** The numbers are mine.
- **The webhook drill** hasn't been re-run on this build, and four load scenarios are still to be
  defined (key-value, media, a refusal flood and supervisor churn), plus an optional 24-hour soak.
- The README lists seven residual limits.
- Some docs still say 130 tests.

## Up next

The webhook drill on the current build, then the four missing load scenarios.
