+++
title = "Load-testing a Rust Axum service to 1,000,000 requests with k6"
description = "Why 10-second benchmarks and laptop numbers lie, how we run 1M-request k6 load and overload scenarios across our Rust services, and the exact thresholds that fail a build."
date = 2026-11-23T10:30:00-05:00

[taxonomies]
tags = ["rust", "reliability", "architecture"]

[extra]
kind = "guide"
+++

A 5-second `wrk` run on your laptop will tell you your Rust Axum server does 80,000 requests per second. It will not tell you that your connection pool deadlocks at minute four, that your memory grows monotonically until the OOM killer fires, or that overload returns TCP resets instead of `503 Service Unavailable`.

Across this workspace, every service that handles traffic follows one rule: **full load runs are at least 1,000,000 requests** (or the equivalent unit—checks, op calls, or script runs), results are committed under `perf/results/` with the machine spec and commit hash, and thresholds are fixed *before* the run.

## Why laptop numbers lie (and how we record them honestly)

Development machines run browsers, editors, Spotlight, and thermal throttling at the same time as both the server *and* the load generator. When `k6` and Axum fight for the same CPU cores and loopback sockets:

- **Tail latency (`p99` / `p99.9`) spikes** from scheduler noise unrelated to your code.
- **Ephemeral ports exhaust** if keep-alive isn't reused cleanly.
- **Thermal throttling** makes minute five slower than minute one.

We treat laptop numbers as **development observations**, never production capacity. Every committed JSON result records `uptime` (load average), CPU/RAM, OS, and the exact git commit SHA. Real capacity numbers come from running `k6` from a *separate* machine against the target droplet.

## The three scenarios every service needs

A happy-path throughput test is only one-third of the picture. In [Colophon CMS](@/colophon/_index.md), [Service Monitor](@/service-monitor/_index.md), [Durable Runner](@/durable-runner/_index.md), and [jsrt](@/js-runtime/_index.md), we separate three regimes:

1. **Sustained steady state (1,000,000 requests):** confirms zero memory leaks, stable pool utilization, and bounded tail latency over minutes, not seconds.
2. **Saturation / overload:** pushes concurrency *past* the server's configured admission cap and verifies the server sheds load cleanly with **`503 Service Unavailable` + `Retry-After`**—never TCP resets, `EOF`s, or status `0`.
3. **Failure during load:** kills a worker, stalls a downstream handler, or restarts a dependency while traffic is flowing, and measures recovery time.

## A minimal `k6` 1M-request harness with fixed thresholds

Fix your thresholds in the script *before* running it, and never lower a threshold afterward to turn a red run green:

```javascript
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    sustained_1m: {
      executor: "shared-iterations",
      vus: 64,
      iterations: 1000000,
      maxDuration: "30m",
    },
  },
  thresholds: {
    http_req_failed: ["rate==0"],          // zero unexpected 5xx or status 0
    http_req_duration: ["p(95)<25", "p(99)<80"],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/health`, {
    headers: { Connection: "keep-alive" },
  });
  check(res, { "status is 200": (r) => r.status === 200 });
}
```

Watch out for one `k6` + Axum gotcha we hit in [Payment Sandbox](@/payment-sandbox/_index.md): if `hyper`'s `header_read_timeout` closes an idle keep-alive socket before `k6` retires it, `k6` logs `readLoopPeekFailLocked` and status `0`. See [why `hyper`'s `header_read_timeout` kills idle keep-alive connections](@/posts/hyper-header-read-timeout-kills-idle-keep-alive.md) for the exact alignment.

## What makes a load run real evidence

- **Never discard a failing run.** In [Durable Runner](@/durable-runner/_index.md), a CI sustained run missed its target on a busy runner while the local 1M/1M run passed—we kept both in `perf/results/` so the difference is visible, not hidden.
- **A TCP reset is not an answer.** Under overload, a client cannot distinguish a reset from a crash. Return an explicit `503` with a machine-readable body (`at_capacity`) and `Retry-After`.
- **Re-run after security hardening.** Adding rate limits, body caps, and slow-client timeouts changes hot-path behaviour; benchmark the hardened build, not the prototype.
