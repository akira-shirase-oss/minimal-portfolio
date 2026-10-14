+++
title = "Checkpoint 0.1: deleting a retry path at compile time"
description = "The empty Rust project for my monitor, the rules the compiler now enforces, and why HTTP/2 isn't in it."
date = 2026-10-14T12:10:00Z
aliases = ["/posts/service-monitor-checkpoint-0-1/"]

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.1"
short_title = "Deleting a retry path at compile time"
[extra.summary]
goal = "An empty project with the right shape and the right rules."
built = "The crate, its nine modules, two locked dependencies, and lint rules the compiler enforces."
proof = ["0 clippy warnings", "no HTTP/2 or OpenSSL in the dependency tree"]
code = "aca3990"
+++

## How I'm building this

Every milestone is split into small **checkpoints**. A checkpoint is only done when:

- its tests pass,
- `cargo clippy` reports **0 warnings**,
- it's committed,
- and it's written up here, mistakes included.

Checkpoint 0.1 is the smallest possible one: an empty project with the right shape. Boring on purpose. Everything after builds on it.

## What got built

- A Rust crate (edition 2024, Rust 1.99) with the nine modules from the design: `domain`, `probe`, `scheduler`, `storage`, `incidents`, `notifications`, `api`, `status`, `telemetry`. Each has one line saying what it's responsible for, and what it must never touch.
- Two dependencies, with exact versions locked: **tokio 1.53.3** and **reqwest 0.13.5**.

## The trick: belt and braces

In the [last post](@/service-monitor/day-0-read-the-source-first.md), we found that reqwest retries certain HTTP/2 errors by default. You *can* turn that off with one builder call, and we will.

But a forgotten builder call is exactly the kind of bug I'm trying to avoid. So HTTP/2 isn't compiled in at all:

```toml
reqwest = { version = "0.13.5", default-features = false, features = ["rustls"] }
```

No default features means no HTTP/2, no system proxy lookup, and TLS via rustls only. `cargo tree` confirms the `h2` crate isn't in the build, so that retry path doesn't exist in the binary. A health check only needs HTTP/1.1.

## Rules the compiler now enforces

These live in `Cargo.toml`, so they apply to every file:

```toml
[lints.rust]
unsafe_code = "forbid"

[lints.clippy]
same_name_method = "warn"
unwrap_used = "warn"
expect_used = "warn"
```

- **No `unsafe`** anywhere in our code. The two C libraries we depend on (SQLite and the TLS crypto) sit behind safe Rust APIs.
- **No `unwrap` or `expect`** outside tests. On bad input, a monitor must report an error, not crash.
- **`same_name_method`** catches a trap from [my AI Rust exams](@/posts/i-made-an-ai-read-the-rust-book.md): a helper named like a trait method can be silently shadowed, so the wrong method runs.

One more deliberate choice: release builds keep `panic = "unwind"`. If one check panics, it should show up as a recorded gap, not take the whole monitor down with it.

## Numbers

- reqwest 0.13.5 with its default TLS library (aws-lc) built here in **16 s** with plain gcc. No cmake, no clang.
- **0** clippy warnings. **0** tests, because there's nothing to test yet.

## The honest part

Nothing runs yet. This checkpoint proves the shape of the project and what's (not) in the dependency tree. That's all.
