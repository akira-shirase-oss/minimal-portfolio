+++
title = "Checkpoint 1.1: I pushed a real app until it broke, and watched"
description = "A small Node.js API, traffic climbing from 20 to 400 requests a second, and my monitor checking every second. It saw trouble 20 seconds before users did."
date = 2026-10-14T13:20:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M1"
step = "1.1"
short_title = "I pushed a real app until it broke, and watched"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 102

[extra.summary]
goal = "Stop testing against a fake server. Watch a real app fail under real load."
built = "A small Node.js API that behaves like an AI backend, a load generator, and a repeatable experiment."
proof = ["monitor warned ~20 s before users hit timeouts", "10,440 requests in 60 s", "5 app tests, 5/5 clean runs"]
code = "1998a9c"
+++

My practice server from M0 is great for tests. It fails exactly how I tell it to, every time.

But real apps don't fail politely. They slow down a little, then a lot, then all at once. So for the first step of M1, I built a real app and pushed it until it broke, while my monitor watched.

## What I built

**A small Node.js API**, shaped like an AI app backend, with zero dependencies:

- `/api/chat` pretends to call an AI model. Most answers take about half a second, some take up to 5. It only allows 64 at once; anyone extra gets "429, too many requests".
- `/api/search` does real CPU work. In Node, CPU work blocks *everything else*, including the health check.
- `/health` says "I'm alive". `/ready` says "I can take traffic", and honestly says *no* when the app is stalling.
- A chaos switch to make it slow, broken or crashed on demand.

**A load generator** that ramps traffic up smoothly and reports, every second, how fast answers came back.

**An experiment script**, so anyone can rerun this exact test with one command.

## What the monitor saw

Traffic climbed from 20 to 400 requests a second over one minute. Meanwhile my monitor checked `/health` and `/ready` once a second, with a 1-second time limit:

```
 req/s   /health               /ready                    what users got
   ~50   0.3 ms                fine                      all good
  ~115   105 ms                fine                      still fine (p95 1.2 s)
  ~147   fast-ish              503 "event loop stalled"  first "too busy" replies
  ~172   no reply in 1 s       slow                      135 OK + 47 "too busy" per second
  ~197   no reply              no reply                  still mostly OK
  ~305   no reply              no reply                  requests start timing out (10 s)
```

## What it taught me

**1. Slow comes before broken.** The health check went from under a millisecond to over 100 ms long before anything failed. Watching that number is an early warning.

**2. The app warned first, then went quiet.** `/ready` honestly said "not ready" before anything failed. A bit later, the app was too busy to answer *anything*, including its own health check.

An app can't report its own trouble when it's drowning. That's exactly why the monitor lives *outside* the app, with its own stopwatch.

**3. The monitor saw it about 20 seconds before users did.** Users started hitting 10-second timeouts around the 45-second mark. The monitor had been failing checks since second 24.

**4. One check proves almost nothing.** In the middle of the slowdown, one check came back in 1.5 ms, between readings of 60 and 136 ms. A single sample is noisy. That's why the next step only raises an alarm after several failures in a row.

## Where I messed up

- **A 5-second trial run before the real experiment found two bugs.** My load generator used a setting before it was defined, and my script waited for the server to finish, which never happens. Lesson (again): run it small before you run it big.
- **My "slow the app down" test didn't always work.** 30 CPU-heavy requests stall Node badly **if they arrive at the same moment**. Spread out by a few milliseconds, the exact same work causes no stall at all. Same load, completely different picture. The test now uses one long request instead, which stalls it every time.

## What it doesn't do yet

- The monitor doesn't check on a schedule by itself yet. A small script called it once a second for this experiment.
- This was one machine, one run, one minute. These numbers are real, but they aren't a benchmark.

## Up next

**Checkpoint 1.2: checking on repeat.** The monitor runs on its own schedule, never overlaps checks, and only raises an alarm after several failures in a row, so one noisy sample can't cry wolf.
