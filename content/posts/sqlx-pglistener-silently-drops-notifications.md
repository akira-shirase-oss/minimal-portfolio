+++
title = "sqlx PgListener::recv() silently drops notifications on reconnect"
description = "sqlx's Postgres listener reconnects on its own and hides the gap. Use try_recv(), treat Ok(None) as lost state, and resync."
date = 2026-11-21T15:00:00-05:00

[taxonomies]
tags = ["rust", "postgres", "reliability"]

[extra]
kind = "failure"
+++

If your phone loses signal in a tunnel and reconnects a minute later, it doesn't pretend nobody called while you were underground. You check your missed calls.

`sqlx::postgres::PgListener::recv()` does the opposite. When the database connection drops, `sqlx` quietly reconnects, re-issues `LISTEN`, and hands you the next notification as if nothing happened. Every `NOTIFY` Postgres sent during that gap is gone forever—and `recv()` never tells you a reconnect occurred.

I hit this while building live change-hint streams for [Colophon CMS](@/colophon/_index.md). If a dashboard list misses a publish or delete notification during a brief network blip, the screen stays stale until the user manually refreshes. Worse, if you use `LISTEN`/`NOTIFY` to invalidate an in-memory cache, a silent gap means revoked credentials or deleted records can linger in memory indefinitely.

## Why `recv()` hides the gap

Postgres `NOTIFY` is fire-and-forget. There is no durable queue behind it: if no client is connected to the channel at the instant a transaction commits, Postgres drops the message on the floor.

`sqlx`'s `PgListener` tries to be helpful by auto-reconnecting behind the scenes. The catch is in the return types of its two receive methods:

- `listener.recv().await` returns `Result<PgNotification, Error>` — it swallows reconnect events internally and only wakes you up when the *next* notification arrives.
- `listener.try_recv().await` returns `Result<Option<PgNotification>, Error>` — **`Ok(None)` explicitly tells you the connection was lost and re-established.**

## The fix: loop on `try_recv()` and resync on `Ok(None)`

In Colophon's event listener (`colophon-server/src/events.rs`), we do two things deliberately:

1. **Never borrow a pooled connection for `LISTEN`.** A listener holds its connection for the entire lifetime of the process; taking one from `PgPool` starves normal request traffic.
2. **Loop on `try_recv()` and treat `Ok(None)` as a mandatory resync** to every connected stream (or a full cache clear, if you're driving a cache).

```rust
loop {
    let message = tokio::select! {
        () = cancel.cancelled() => return,
        message = listener.try_recv() => message,
    };

    match message {
        Ok(Some(notification)) => {
            if let Some(hint) = Hint::decode(notification.payload()) {
                bus.publish(hint);
            } else {
                tracing::warn!(
                    payload = notification.payload(),
                    "a change hint did not decode"
                );
            }
        }
        // Connection dropped and sqlx re-listened: anything sent
        // during the gap is gone, so every subscriber must reload.
        Ok(None) => {
            tracing::warn!("listener reconnected; streams resync");
            bus.resync();
        }
        Err(error) => {
            tracing::warn!(%error, "listener error; reconnecting");
            bus.resync();
            break;
        }
    }
}
```

Notice the `tokio::select!` with a `CancellationToken` as well. `PgListener::connect` and `listen` can sit inside `sqlx`'s internal retry loop against a dead database; wrapping them in `select!` ensures graceful shutdown doesn't hang waiting for a database that isn't coming back.

## One more cache pitfall right beside this

If you use `PgListener` to invalidate a local cache, there is a second race right next to it: a cache lookup misses, you query Postgres across an `.await`, and while that query is in flight, a `NOTIFY` (or `Ok(None)` resync) invalidates the key. When your `.await` finishes, a naive `cache.put(key, value)` writes the stale row right back into the cache.

The fix is a simple atomic generation counter: bump it on every invalidation or resync, read it *before* the database query, and only call `cache.put` if the generation is still unchanged.

## What this doesn't replace

`LISTEN`/`NOTIFY` with `try_recv()` is a fast **hint**, not a durable message bus. If you need guaranteed delivery across restarts, commit intent to a Postgres outbox table (or a framed file journal like we do in [Durable Runner](@/durable-runner/_index.md)) and use `NOTIFY` only to wake workers up early.
