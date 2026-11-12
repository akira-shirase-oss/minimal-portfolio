+++
title = "W1 · Lesson 2: Retries are selfish"
description = "Backoff and jitter — why retrying politely is the difference between a blip and a storm."
date = 2026-11-12
weight = 2

[extra]
kind = "lesson"
week = 1
lesson = 2
status = "lesson shared"
+++

A **retry** means sending a failed request again. It helps when the failure was
a short blip.

But if the server failed because it's **overloaded** (getting too much
traffic), every retry adds more load, and a small slowdown turns into a full
outage. That's called a **retry storm**. Picture a packed restaurant: if
everyone at the door keeps pushing back in every second, nobody gets seated any
faster.

The fix is **backoff**: wait longer after each failed try (100 ms, then 200 ms,
then 400 ms…) up to a maximum, and cap how many times you retry. Add **jitter**,
a small random wait, so 1,000 clients don't all retry at the same moment.

Also retry at one layer only. AWS shows that 5 layers each retrying 3 times can
multiply database load by 243x.

```rust
let backoff = (BASE_MS * 2u64.pow(attempt)).min(MAX_MS);
let wait = rand::random::<u64>() % backoff; // "full jitter"
```

Your durable-runner admission 503s under load are the server saying it's full
and asking you to back off. The client should wait and retry later, not keep
hammering it.

## Try (15 min)

Give the 503 retries in your load script backoff plus jitter. Run it again and
compare the 503 count and recovery time with the old run.

Source: [AWS Builders' Library on timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
