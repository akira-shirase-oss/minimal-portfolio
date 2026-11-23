+++
title = "Why hyper's header_read_timeout kills idle keep-alive connections"
description = "With a timer set, hyper applies header_read_timeout (30s default) to idle HTTP/1.1 keep-alive waits—causing k6 readLoopPeekFailLocked and status 0 errors."
date = 2026-11-23T09:00:00-05:00

[taxonomies]
tags = ["rust", "reliability", "architecture"]

[extra]
kind = "failure"
+++

If you put a 5-second timer on a slow-header attack test, you expect it to fire when a client trickles bytes one character at a time. You do not expect it to drop healthy, idle keep-alive connections sitting quietly in a proxy pool.

In Rust's `hyper` (the HTTP engine underneath Axum), that is exactly what `header_read_timeout` does. Once you attach a timer to `hyper_util::server::conn::auto::Builder` (or `http1::Builder`), `header_read_timeout` does not wait for the first byte of a request before starting the clock. It also runs while an HTTP/1.1 connection is **idle between requests**. When the timer expires, `hyper` closes the socket without sending a response.

We hit this directly while load-testing [Payment Sandbox](@/payment-sandbox/_index.md) with `k6` (which uses Go's `net/http` client). Under steady traffic with pooled connections, `k6` started logging `readLoopPeekFailLocked: EOF` and recording HTTP status `0`—not because the server crashed, but because the client reused an idle connection right as `hyper` closed it.

## The trap: removing the setting makes it worse

A natural first instinct is to delete `.header_read_timeout(...)` and keep the timer attached for other timeouts. That does not disable it.

In `hyper`, once a timer is configured on the HTTP/1.1 builder, **`header_read_timeout` defaults to 30 seconds** when unset. So deleting the call silently re-enables a 30-second idle close. Any reverse proxy (Caddy, Nginx, Cloudflare) or load generator whose upstream idle keep-alive timeout is longer than 30 seconds will keep racing the server's close and throwing transient `502` or status `0` errors.

## How the race happens

```text
t = 0.0s   Client sends GET /health -> 200 OK (connection stays in keep-alive pool)
t = 29.9s  hyper's header_read_timeout timer is about to expire
t = 30.0s  Client picks this pooled socket and writes GET /payments
t = 30.0s  hyper closes the socket (EOF) -> client sees readLoopPeekFailLocked / status 0
```

Because `POST` requests are not safely retryable by HTTP clients without idempotency guarantees, a race on a pooled keep-alive connection turns into a real client-visible failure.

## The fix: align idle timeouts so the client closes first

The cleanest rule in HTTP keep-alive pools is **client/proxy idle timeout < server idle timeout**. That way, the upstream client retires an idle connection before the server ever pulls the plug on it.

1. **In your reverse proxy (Caddy):** set `keepalive_idle_conns` and `keepalive` *below* the Rust server's `header_read_timeout`:

```text
reverse_proxy 127.0.0.1:8080 {
    transport http {
        keepalive 20s
    }
}
```

2. **In your Rust server (`hyper` / Axum):** set `header_read_timeout` explicitly above the proxy's idle timeout (or disable the keep-alive phase via `.timer(...)` + explicit idle handling if you separate request-head reading from idle waits):

```rust
let mut builder = hyper_util::server::conn::auto::Builder::new(TokioExecutor::new());
builder
    .http1()
    .timer(TokioTimer::new())
    // Strictly higher than Caddy's upstream `keepalive 20s`
    // and strictly lower than slowloris tolerance.
    .header_read_timeout(Duration::from_secs(30));
```

3. **In your load generator (`k6` / Go):** either set the client's idle connection timeout below the server's bound or explicitly test the boundary.

## Write a regression test that proves it

Don't trust a config comment—test the idle boundary directly in your integration suite:

1. Open a keep-alive HTTP/1.1 connection and send a `GET /health` (`200 OK`).
2. Hold the connection idle *past* the configured bound (using a short timeout like 100ms in the test server, not 30s).
3. Attempt to reuse the connection and assert the exact expected behaviour—either the server cleanly closes it on schedule, or a proxy/client configured below the bound opens a fresh socket with zero status-`0` errors.

## Frequently asked questions

**Why does `k6` report status `0` instead of `502` or `503`?**
Status `0` in `k6` means no HTTP response was received at all—the TCP connection closed (`EOF`) or reset before a status line arrived. A real server refusal always returns an explicit HTTP status like `503 Service Unavailable`.

**Does this affect HTTP/2 connections?**
HTTP/2 uses `GOAWAY` frames and explicit keep-alive pings rather than HTTP/1.1's `header_read_timeout` between requests. The race is specific to HTTP/1.1 keep-alive pools, which is still the default between Caddy/Nginx and local loopback upstreams.
