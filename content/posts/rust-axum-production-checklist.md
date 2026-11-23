+++
title = "Rust Axum production checklist: timeouts, body limits, and shutdown"
description = "The concrete defaults that turn a working Axum prototype into a hardened Rust HTTP service: body caps, slow-client timeouts, keep-alive alignment, admission control, and graceful shutdown."
date = 2026-11-23T12:00:00-05:00

[taxonomies]
tags = ["rust", "reliability", "security", "architecture"]

[extra]
kind = "guide"
+++

Axum gets you from `cargo new` to a fast HTTP server in 30 lines. Out of the box, though, an unconfigured server is trusting: it will let slow clients hold sockets open, accept oversized bodies on custom extractors, and drop in-flight requests on `SIGTERM`.

This is the production checklist we apply from milestone 0 across every Rust + Axum service in this workspace ([Colophon CMS](@/colophon/_index.md), [Service Monitor](@/service-monitor/_index.md), [Durable Runner](@/durable-runner/_index.md), and [Payment Sandbox](@/payment-sandbox/_index.md)).

## 1. Bound every request body explicitly

Axum's default `Bytes`/`Json` extractors cap bodies at 2 MB, which is a good start—but `Request::into_body()` or custom streaming handlers bypass that default. Attach `DefaultBodyLimit::max(...)` at the router level *and* tighten specific endpoints (e.g., 64 KB for auth/login, explicit streaming cap for uploads).

```rust
use axum::{extract::DefaultBodyLimit, Router};

let app = Router::new()
    .route("/v1/jobs", post(submit_job))
    .layer(DefaultBodyLimit::max(256 * 1024)); // 256 KiB ceiling
```

## 2. Bound headers, idle keep-alive, and request duration

Slowloris attacks trickle HTTP headers one byte per second to exhaust file descriptors. Configure `hyper`'s `header_read_timeout` explicitly—and remember [hyper's keep-alive trap](@/posts/hyper-header-read-timeout-kills-idle-keep-alive.md): **keep your reverse proxy's upstream idle keep-alive strictly shorter than `hyper`'s `header_read_timeout`** so the proxy closes idle sockets first.

On top of connection-level timeouts, wrap routes with `tower_http::timeout::TimeoutLayer` so a stuck handler returns `408` or `504` instead of hanging forever, and give every outbound HTTP client (`reqwest`) and Postgres query its own deadline.

## 3. Shed load honestly with `503` + `Retry-After`

Under overload, a server should **never** answer with TCP resets or `EOF`. Bound in-flight concurrency (via a Tokio `Semaphore` with `try_acquire_owned` or `tower::limit::ConcurrencyLimitLayer` + `LoadShedLayer`) and return an explicit `503 Service Unavailable` with a `Retry-After` header and machine-readable error code:

```rust
let Ok(_permit) = state.admission.clone().try_acquire_owned() else {
    return (
        StatusCode::SERVICE_UNAVAILABLE,
        [("retry-after", "1")],
        Json(json!({ "error": "at_capacity" })),
    )
        .into_response();
};
```

## 4. Graceful shutdown with a hard drain ceiling

When `systemd` sends `SIGTERM` during a deploy, stop accepting new connections, cancel background loops with a `tokio_util::sync::CancellationToken`, and wait for in-flight requests to finish up to a fixed deadline (e.g., 15 seconds):

```rust
axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal(cancel.clone()))
    .await?;
```

Make sure background listeners like `sqlx::PgListener` also watch that same `CancellationToken` inside `tokio::select!` so shutdown never hangs on an unreachable database.

## 5. Never block Tokio worker threads

CPU-heavy work (Argon2 password hashing, image resizing, V8 execution, sync file compression) must run on `tokio::task::spawn_blocking` or a dedicated OS thread pool—never directly on an async handler. One blocked Tokio worker silently degrades tail latency for every other request sharing that core.

## 6. Prove the checklist under load and attack

A checklist in a README isn't proof. Before shipping:
- Run a [1,000,000-request k6 load + overload test](@/posts/load-testing-rust-axum-1m-requests-k6.md) and confirm `503` load-shedding with zero status-`0` drops.
- Run an attack suite (oversized body, slow header, auth bypass, header spoofing) backed by a [mutation proof](@/posts/proving-security-attack-tests-fail-with-mutation-harness.md).
