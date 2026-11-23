+++
title = "Why an async cache filled across .await resurrects revoked tokens"
description = "A cache miss that queries Postgres across an .await can write a revoked credential back into memory if an invalidation happened in flight. Fix it with a generation counter."
date = 2026-11-23T09:15:00-05:00

[taxonomies]
tags = ["rust", "security", "reliability"]

[extra]
kind = "failure"
+++

Imagine revoking an API token in the database, broadcasting an invalidation event, and watching the revoked token **come back to life** two milliseconds later.

No bug in your revocation query. No missed notification. Just an ordinary async cache-aside lookup running concurrently with a revocation.

We caught this exact race across two separate products on the same day while auditing [Colophon CMS](@/colophon/_index.md) and [Service Monitor](@/service-monitor/_index.md). It is one of the easiest concurrency bugs to write in async Rust—and one of the hardest to spot in code review because every line looks completely reasonable on its own.

## The naive cache-aside code (and how it breaks)

Almost every auth cache starts out like this:

```rust
pub async fn lookup_token(&self, hash: &[u8; 32]) -> Result<Option<TokenRecord>, Error> {
    if let Some(hit) = self.cache.get(hash) {
        return Ok(Some(hit));
    }

    // <-- Any invalidation can happen while we are parked at this .await!
    let record = self.db.fetch_active_token(hash).await?;

    if let Some(ref rec) = record {
        self.cache.put(*hash, rec.clone());
    }
    Ok(record)
}
```

Now trace two tasks interleaved on Tokio:

```text
Task A (API request)                 Task B (Revoke token)
----------------------------------   ----------------------------------
1. cache.get(hash) -> Miss
2. db.fetch_active_token(hash)
   (Postgres reads row: active)
                                     3. UPDATE tokens SET revoked_at = now()
                                     4. cache.invalidate(hash)  // nothing in cache yet!
5. .await resumes with active row
6. cache.put(hash, active_row)  <--  REVOKED TOKEN IS NOW CACHED!
```

Task B did everything right: it revoked the token in Postgres *and* invalidated the cache. Because Task A's database read happened a millisecond before the `UPDATE`, Task A's `cache.put` runs *after* `cache.invalidate` and resurrects the dead token until TTL expiry.

## The fix: a monotonic generation counter

You don't need a heavy distributed lock to close this window. An `AtomicU64` generation counter on the cache takes ten lines and adds zero contention to the hot path:

1. **Every `invalidate` or `clear` bumps the generation counter** (`fetch_add(1, Ordering::AcqRel)`).
2. **Before the `.await` database lookup**, read the current generation (`let gen = self.cache.generation();`).
3. **After the `.await` returns**, call `put_if_generation(key, value, gen)`. Inside the cache lock, insert *only* if the generation is still equal to `gen`.

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use parking_lot::Mutex;
use std::collections::HashMap;

pub struct GenCache<K, V> {
    generation: AtomicU64,
    inner: Mutex<HashMap<K, V>>,
}

impl<K: Eq + std::hash::Hash, V: Clone> GenCache<K, V> {
    pub fn generation(&self) -> u64 {
        self.generation.load(Ordering::Acquire)
    }

    pub fn invalidate(&self, key: &K) {
        let mut map = self.inner.lock();
        self.generation.fetch_add(1, Ordering::AcqRel);
        map.remove(key);
    }

    pub fn clear(&self) {
        let mut map = self.inner.lock();
        self.generation.fetch_add(1, Ordering::AcqRel);
        map.clear();
    }

    pub fn put_if_unchanged(&self, key: K, value: V, observed_gen: u64) {
        let mut map = self.inner.lock();
        if self.generation.load(Ordering::Acquire) == observed_gen {
            map.insert(key, value);
        }
        // Otherwise an invalidation happened while our DB query was in flight:
        // drop the stale fill rather than resurrecting revoked data.
    }
}
```

Notice why `self.generation.fetch_add` happens **inside the mutex** in `invalidate` and `clear`, and `put_if_unchanged` checks the generation **inside the same mutex**: that guarantees `invalidate` and `put_if_unchanged` cannot interleave between the check and the insert.

## Pair it with `PgListener::try_recv()`

If your cache invalidations arrive over Postgres `LISTEN`/`NOTIFY`, remember the companion bug: [`sqlx::PgListener::recv()` silently drops notifications on reconnect](@/posts/sqlx-pglistener-silently-drops-notifications.md). Loop on `try_recv()`, and call `cache.clear()` whenever `Ok(None)` signals a reconnect gap.

## How to test the race deterministically

Never test a concurrency race with `tokio::time::sleep`. Inject a barrier or `tokio::sync::Notify` between reading the generation and calling `put_if_unchanged`:

1. Task A reads `observed_gen`, fetches the active token, and pauses on a test channel.
2. The test revokes the token and calls `cache.invalidate(&hash)`.
3. The test releases Task A, which calls `put_if_unchanged(..., observed_gen)`.
4. Assert `cache.get(&hash).is_none()`.

If someone removes the generation check later, that test fails 100% of the time on every machine—zero flakes, zero wall-clock sleeps.
