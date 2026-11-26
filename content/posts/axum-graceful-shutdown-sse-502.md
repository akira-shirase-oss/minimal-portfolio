+++
title = "Why Axum graceful shutdown returned 502 for 10 seconds"
description = "Open Server-Sent Events streams count as in-flight HTTP responses in Axum, holding graceful shutdown until the hard deadline kills the process."
date = 2026-11-26T09:15:00-05:00

[taxonomies]
tags = ["rust", "reliability", "architecture"]

[extra]
kind = "failure"
+++

Graceful shutdown is supposed to make deploys invisible. You send `SIGTERM`, flip `/readyz` to draining, let active requests finish, and cut over to the new binary without dropping a single user.

Instead, every time we deployed [Colophon CMS](@/colophon/_index.md) while an editor tab was open, the site answered `502 Bad Gateway` for about ten seconds.

The culprit wasn't a slow database query or a deadlocked lock. It was a single idle Server-Sent Events (`/events`) tab sitting quietly in the browser.

## Why Axum waits forever for SSE

Our shutdown sequence in `colophon-server/src/shutdown.rs` looked textbook:

1. Receive `SIGTERM`.
2. Flip readiness to `draining` (`/readyz` returns `503`).
3. Wait `drain_delay`, then stop accepting new TCP connections via `axum::serve(...).with_graceful_shutdown(...)`.
4. Wait for in-flight requests to finish, capped by a 25-second hard deadline (`ShutdownOutcome::DeadlineExceeded`).

The catch is what `axum::serve` considers an "in-flight request." To HTTP, an open SSE stream is just one response whose body hasn't finished streaming yet. In Colophon, live change-hint streams have a 30-minute lifetime and send a `keep-alive` comment every 15 seconds.

So the deploy played out like this:

```text
t = 0s    SIGTERM arrives -> /readyz flips to 503 draining
t = 2s    drain_delay ends -> listener closes, stops accepting new sockets
t = 2s    1 open GET /events SSE stream is still alive -> axum::serve keeps waiting
t = 2-25s old process holds the systemd restart open while refusing new connections
t = 25s   hard shutdown deadline fires -> process exits, new binary finally starts
```

During that gap between the listener closing and the new binary binding the socket, the reverse proxy had nowhere healthy to send traffic and returned `502`.

## The fix: end SSE streams the moment draining begins

Long-lived streams should never ride out a shutdown deadline. SSE clients (`EventSource`) already have built-in reconnect behaviour—closing the stream cleanly is the signal for them to reconnect to the new process.

The fix is to pass a shutdown `CancellationToken` (or `watch` channel) into the event bus and cancel it as soon as `readiness.begin_drain()` runs—*before* `drain_delay` even finishes:

```rust
let changes = stream::unfold(live, |mut live| async move {
    loop {
        tokio::select! {
            biased;
            // End the stream immediately on deploy/shutdown so Axum
            // doesn't wait out the 25s grace deadline.
            () = live.shutdown.cancelled() => return None,
            () = tokio::time::sleep_until(live.ends_at) => return None,
            frame = live.subscription.next() => match frame {
                Some(Frame::Change(hint)) => return Some((Out::Change(hint), live)),
                Some(Frame::Resync) => return Some((Out::Resync, live)),
                None => return None,
            },
        }
    }
});
```

Two small details make this airtight:

1. **Put `biased;` and `shutdown.cancelled()` first in `tokio::select!`.** Even under a burst of events, a draining stream stops immediately instead of polling another frame.
2. **Reject new SSE subscriptions once draining starts.** Otherwise a client that disconnects and reconnects during `drain_delay` can open a fresh stream right after you closed the existing ones.

Once every open SSE stream returns `None`, `axum::serve` finishes in milliseconds, systemd starts the replacement process right away, and the browser's `EventSource` automatically reconnects to the new server and fetches fresh state.

## Don't forget background listeners

If your SSE fan-out is backed by Postgres `LISTEN`/`NOTIFY`, your database listener needs the same cancellation token—see [sqlx PgListener::recv() silently drops notifications on reconnect](@/posts/sqlx-pglistener-silently-drops-notifications.md) for how we wrap `try_recv()` in `tokio::select!` so shutdown never blocks on a dead database retry loop either.

For the broader list of timeouts and connection boundaries we keep on every Rust service, see the [Rust Axum production checklist](@/posts/rust-axum-production-checklist.md) and [SSE vs WebSockets vs Polling](@/posts/sse-vs-websockets-vs-polling-live-dashboards.md).

## Frequently asked questions

**Why didn't `axum::serve(...).with_graceful_shutdown()` close SSE connections automatically?**
`with_graceful_shutdown` stops accepting new connections and waits for active handlers and response bodies to finish. Because an SSE stream is a valid streaming response body, Hyper and Axum have no way to tell it apart from a legitimate file download unless your stream terminates itself on shutdown.

**Will closing SSE streams during a deploy cause clients to miss updates?**
If you treat SSE as a change hint rather than a durable queue, no. When the stream closes, the client reconnects to the new instance and re-fetches the current state (or receives a `resync` event), so nothing is lost across the restart.
