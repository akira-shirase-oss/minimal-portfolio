+++
title = "Go vs Rust for backend APIs and background workers"
description = "Go vs Rust in production backends: compile times, tail latency, memory bounds, error handling, async pitfalls, and when each language is the pragmatic choice."
date = 2026-11-23T13:30:00-05:00

[taxonomies]
tags = ["rust", "architecture", "reliability"]

[extra]
kind = "guide"
+++

**Choose Go when your top priority is fast onboarding, instant compile times, and straightforward network services where occasional garbage-collector pauses don't hurt you.** **Choose Rust when you want strict compile-time invariants (type-level tenant scoping, exhaustive error handling, zero data races), flat predictable tail latency (`p99`), and tiny memory footprints on small servers.**

Every backend service in this workspace—[Colophon CMS](@/colophon/_index.md), [Service Monitor](@/service-monitor/_index.md), [Durable Runner](@/durable-runner/_index.md), [jsrt](@/js-runtime/_index.md), and [MiniBTC](@/minibtc/_index.md)—is written in Rust (Tokio + Axum). That does not mean Rust beats Go everywhere. Here is where each wins and where each bites.

## Go vs Rust for backends at a glance

| Dimension | Go | Rust (Tokio + Axum) |
|---|---|---|
| **Compile time** | Seconds (near-instant iteration) | Slower clean builds; fast incremental once split into workspace crates |
| **Memory & tail latency** | Low GC pauses (usually sub-ms), higher steady-state RSS | No GC; flat `p99`/`p99.9` and minimal RSS on 1–2 GB VPS nodes |
| **Concurrency model** | Goroutines + channels (easy to write; data races caught at runtime with `-race`) | `async`/Tokio (steeper learning curve; data races rejected at compile time) |
| **Error handling** | Explicit `if err != nil` (easy to ignore or miss a zero-value struct) | `Result<T, E>` + exhaustive `match` (harder to ignore failure states) |
| **Type-level safety** | Simple type system; `nil` pointer panics still happen in production | No `null`, affine types, newtype tenant wrappers, compile-time SQL checks (`sqlx`) |
| **Team ramp-up** | Days for any backend engineer | Weeks to become fluent with lifetimes and async traits |

## Where Rust actually pays for itself in our stack

1. **Encoding security invariants in types.** In [Service Monitor](@/service-monitor/_index.md) and [Colophon CMS](@/colophon/_index.md), workspace/tenant IDs are distinct newtypes—you literally cannot pass an unscoped query or swap two IDs by accident.
2. **Honest resource bounds on small droplets.** Running multiple SaaS backends on a single shared 2 GB VPS is comfortable in Rust because each compiled binary sits at tens of megabytes of RSS with no GC heap headroom required.
3. **Systems components alongside HTTP.** Embedding V8 (`deno_core`), writing a framed append-only journal (`durable-runner`), or implementing a P2P blockchain node (`minibtc`) stays in one language with zero FFI glue.

## Where Go still beats Rust

- **Large teams with mixed experience:** A junior engineer can read and ship safe Go HTTP handlers in week one.
- **Fast CI and edit-compile-test loops:** Go's compiler speed is still unmatched.
- **Standard-library completeness:** Go's `net/http`, `crypto/*`, and `encoding/json` cover 80% of web services without picking crates.

And remember: **Rust does not save you from architectural bugs.** Async Rust still has real footguns—like [blocking Tokio worker threads](@/posts/rust-axum-production-checklist.md), [cache races across `.await`](@/posts/async-cache-await-resurrects-revoked-tokens.md), and [`hyper`'s idle keep-alive timeout](@/posts/hyper-header-read-timeout-kills-idle-keep-alive.md).

## When to choose which

**Choose Go if:**
- You are building CRUD/RPC microservices, CLI tools, or infrastructure glue with a growing team that values simplicity and fast builds.
- Sub-millisecond GC pauses and slightly larger RAM usage are completely fine.

**Choose Rust if:**
- Correctness, memory bounds, and predictable `p99` latency under load are core product features.
- You are building storage engines, runtimes, security-critical proxies, or dense multi-service VPS deployments.
