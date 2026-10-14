+++
title = "Before writing my Rust monitor, I read the libraries' source. It found 4 traps."
description = "An IP address that skips your DNS check, two hidden retry layers, a clock that stops while you sleep, and a typo SQLite won't tell you about."
date = 2026-10-14T12:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
+++

A monitor has one job: tell the truth about whether something is up.

The scary bugs in a monitor aren't the crashes. They're the quiet ones. A check that secretly retries until it passes. A gap in the data that shows up as green. A safety check that a clever URL walks straight past.

I'm building one anyway.

## What I'm building

**Service Monitor** is a small, self-hosted HTTP monitor written in Rust. You register a health URL; when repeated checks fail, you get one alert with the evidence, then one recovery alert. No retry storms, and it never shows green without fresh evidence.

I'm building it with Claude Code, in the open, one tested checkpoint at a time. This is the first entry in [the build log](@/service-monitor.md).

## The rule: never code from memory

Before writing a single line of monitor code, Claude read the actual source of the exact library versions we'd use (reqwest 0.13.5, hyper-util 0.1.21, tokio 1.53.3, rusqlite 0.40.2), and ran tiny probe programs against local servers to confirm what it read.

Four things came back that would have turned into silent bugs.

## Trap 1: an IP address skips your DNS safety check

A URL checker is also a way into your internal network. The standard defence is a custom DNS resolver that refuses private addresses like `127.0.0.1` or the cloud metadata service.

But when the URL already contains an IP address, hyper-util connects straight to it and never calls the resolver. It's intended, and there's a comment in the code saying so. In the probe, `http://[::ffff:127.0.0.1]/` reached a local server, and our resolver was called **0 times**.

One more wrinkle: Rust's standard library says `::ffff:127.0.0.1` is *not* loopback until you call `to_canonical()` on it.

**Fix:** the URL validator checks IP addresses itself, before any request goes out.

## Trap 2: two hidden retry layers

My monitor's contract is "one check = one attempt". Retries hide flaky services and pile load onto ones that are already struggling.

- reqwest's default policy adds **up to 2 extra attempts** on certain HTTP/2 errors.
- hyper-util quietly retries canceled requests on reused connections, and has no setting for it.

**Fix:** turn off reqwest's retries, turn off connection reuse (which removes the second one), and don't compile HTTP/2 in at all. A health check doesn't need it.

## Trap 3: the clock stops while the laptop sleeps

Rust's `Instant` on Linux follows a clock that pauses during suspend. On this laptop it read **17,240 s** while the boot clock read **62,115 s**: about 12.5 hours of sleep it never noticed.

Tokio's `MissedTickBehavior::Skip` has its own surprise: after a missed tick it still fires once, immediately, late.

For a monitor, that means checks missed while asleep would just… disappear.

**Fix:** our own scheduler works out every slot from wall-clock time. A missed slot is recorded as a *gap*, never quietly skipped and never counted as a pass.

## Trap 4: SQLite won't tell you about a typo

A misspelled `PRAGMA` runs without an error and does nothing. Get `synchronous = FULL` slightly wrong, and your database is quietly less durable than you think.

**Fix:** every setting is read back at startup, and the monitor refuses to start if any doesn't match. (Good news too: the bundled SQLite, 3.53.2, already includes the fix for a WAL corruption bug that was patched in 3.51.3.)

## Bonus: the maths in the plan

The plan had a lot of numbers in it, so we checked them all with a script. They held up. One limit wasn't written anywhere: with the default settings, only **12 monitors fit on one host** (one scheme + host + port) before admission control says no. That's the first wall a real pilot would hit.

## The honest part

- None of these are bugs in reqwest, hyper-util, tokio or SQLite. They're sensible defaults for a general-purpose client, just wrong for a monitor.
- These facts are for the versions above. They get re-checked on every upgrade.
- At this point the monitor had zero lines of code. This was all reading.

## The takeaway

The libraries were right. My assumptions were wrong.

Reading the source turned four "it probably works like this" into four tests I'll write before the code that needs them.

Next up: [Checkpoint 0.1](@/posts/service-monitor-checkpoint-0-1.md).
