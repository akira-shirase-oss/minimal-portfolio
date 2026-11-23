+++
title = "Embedding V8 in Rust with deno_core as a capability-bounded host"
description = "Lessons from building jsrt—a Rust JavaScript host on deno_core where Rust owns capabilities, timeouts, and honest errors across four security rounds."
date = 2026-11-23T10:45:00-05:00

[taxonomies]
tags = ["rust", "security", "architecture"]

[extra]
kind = "guide"
+++

Running user-supplied JavaScript inside a Rust service sounds tempting until you ask three questions: what stops a script from reading `/etc/passwd`, what stops `while (true) {}` from pinning your Tokio worker forever, and what stops a 500 MB allocation from taking down the host?

In [jsrt](@/js-runtime/_index.md), I built a purpose-built JavaScript host in Rust on top of `deno_core` (V8) where **Rust owns every capability, every timer, and every error boundary**. JavaScript starts with zero ambient authority: no filesystem, no network, no environment variables unless the host explicitly grants a scoped capability.

## The core architecture: JS asks, Rust decides

With `deno_core`, you register Rust functions as **ops** (`#[op2]`) inside an `Extension`. JavaScript never touches OS syscalls directly—it calls an op, and Rust validates the capability against the isolate's policy before executing anything.

```rust
use deno_core::{op2, OpState};

#[op2(fast)]
fn op_clock_now_ms(state: &mut OpState) -> Result<f64, deno_error::JsErrorBox> {
    let policy = state.borrow::<CapabilityPolicy>();
    if !policy.allow_clock {
        return Err(deno_error::JsErrorBox::generic("capability denied: clock"));
    }
    Ok(policy.clock.now_ms())
}
```

Keeping the policy inside `OpState` means every isolate gets its own capability set, and every denial returns a structured, explicit error rather than silently returning fake data.

## Four boundaries you must enforce on the Rust side

V8 is a single-threaded C++ engine that expects to own its OS thread. Embedding it safely inside an async Rust server requires four strict walls:

1. **Dedicated OS threads, never Tokio worker threads.** V8 isolates are `!Send` and CPU-bound. Spawn a bounded worker pool of dedicated OS threads, each owning its `JsRuntime` and a single-threaded `current_thread` Tokio runtime. Your Axum server sends jobs over a bounded channel and never blocks its async executor.
2. **Interrupt-based CPU wall-clock timeouts.** An async `tokio::time::timeout` cannot stop `while (true) {}` inside V8! You must grab `isolate.thread_safe_handle()` before running script code and call `terminate_execution()` from a watchdog thread when the deadline expires.
3. **Heap limits via `CreateParams::heap_limits`.** Cap V8's old-space heap per isolate and install a near-heap-limit callback that terminates execution cleanly instead of letting V8 abort the entire Rust process.
4. **Strict module loader and network SSRF gates.** Every `import` goes through your custom `ModuleLoader`: canonicalize paths, reject `..` traversal and symlinks escaping the root, and block private/loopback/metadata IP ranges *after* DNS resolution (to defeat DNS rebinding) if network fetch is enabled.

## What our 4-round security pass actually caught

After finishing milestones M0–M7 (including 1M-op and 1M-HTTP-serve runs recorded in `labs/js-runtime/perf/results/`), we ran a dedicated security audit on `jsrt` (2026-11-16). Four fix rounds—each verified by an independent reviewer—closed real holes that are easy to miss on a first build:

- **Loader canonicalization edge cases** around symlinks and URL-encoded paths.
- **Network capability enforcement** on redirects (a redirect from an allowed public host to `127.0.0.1` or link-local metadata must be re-checked at every hop).
- **HTTP `serve` hardening** against slow headers, oversized bodies, and idle connections.

## When to embed V8 vs spawn a subprocess

- **Embed `deno_core` in-process** when you need sub-millisecond cold starts, tight capability-scoped ops, and deterministic error envelopes for trusted or semi-trusted plugins/workflows.
- **Add OS-level isolation (containers, microVMs, seccomp)** if you run completely untrusted, adversarial multi-tenant code—a V8 sandbox boundary is strong, but V8 JIT bugs happen, so defense in depth still applies.
