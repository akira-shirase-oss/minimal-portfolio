+++
title = "Checkpoint 0.6: a command you can actually run"
description = "The monitor gets a front door: one command, clear answers, and exit codes a script can trust. Using it for real found two rough edges."
date = 2026-10-14T13:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.6"
short_title = "A command you can actually run"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 73

[extra.summary]
goal = "Turn the check into something you can run from a terminal, and that scripts can trust."
built = "A service-monitor check command with clear output, and exit codes for pass, fail and gap."
proof = ["6 new tests run the real program", "73 tests in total", "0 warnings"]
code = "1dc0f94"
+++

Until now, the only way to use my monitor was to write a test.

That's not a product. So this checkpoint gives it a front door.

## What I built

One command:

```
service-monitor check https://example.com/health
```

It checks the address once and tells you what happened, in plain words. A few options:

- `--expect 200,204`: which status codes count as fine.
- `--timeout-ms 5000`: how long to wait, at most.
- `--contains "ready"`: only pass if the page says this.
- `--dev-allow-port 9000`: allow exactly `127.0.0.1` on that port, for testing on my laptop.

And it ends with an **exit code**, a number that scripts read to know what happened:

- `0`: it's fine.
- `1`: the site is broken.
- `2`: you typed something wrong.
- `3`: "I couldn't look", for example a blocked address.

That last one matters. A script can tell "the site is down" apart from "the monitor couldn't check", and those need very different reactions at 3 a.m.

## Here it is, for real

Against my practice server:

```
$ service-monitor check http://127.0.0.1:9124/healthy --dev-allow-port 9124
PASS 200 OK
  time     0.4 ms, until the headers arrived

$ service-monitor check http://127.0.0.1:9124/error --dev-allow-port 9124
FAIL expected {200}, got 500 Internal Server Error

$ service-monitor check http://127.0.0.1:9124/hang --timeout-ms 1000 --dev-allow-port 9124
FAIL no reply before the deadline
  time     1001.1 ms, until it gave up

$ service-monitor check http://169.254.169.254/latest/meta-data/
GAP  169.254.169.254 is in 169.254.0.0/16 (link-local, incl. cloud metadata), which monitors may not reach
```

The last one is the cloud's password address from [Checkpoint 0.3](@/service-monitor/checkpoint-0-3.md). Refused before a single byte is sent.

If you type something wrong, it tells you which option, in the words you typed:

```
service-monitor: that check can't run:
  --timeout-ms: must be between 1000 and 15000 (got 20)
```

## Does it actually work?

6 new tests run the **real program** as a separate process, against the practice server, and check its exit code and output, exactly as a script would see them. They cover:

- pass,
- broken,
- hanging,
- blocked,
- bad input,
- and complete nonsense.

**73 tests** in the project now. **0 warnings.**

## Where I messed up

Using the command myself, instead of just testing it, found two rough edges:

1. **The same hang got two different descriptions.** Sometimes it said "timed out", sometimes "no reply before the deadline". Two timers were racing (mine, and a backup in the web library), and whichever won picked the wording. The *answer* was always right; only the words changed. Now every failure is described from one list of plain-English names, so the wording can't depend on a race.
2. **"Connection refused" said it waited "until the headers arrived".** No headers ever arrived. It now says "until it gave up".

Tests check that the answer is right. Actually using the thing checks whether it makes sense to a human.

## What it doesn't do yet

- It checks once. There's no schedule yet (that's the next milestone).
- Certificate problems on secure sites still show up as "couldn't connect" instead of their own category.

## Up next

Before I call this first milestone done, I want the testing to be **aggressive**. So Checkpoint 0.7 lets tools attack the code instead of me: automatic mutation testing, thousands of random inputs, and hundreds of checks at once.
