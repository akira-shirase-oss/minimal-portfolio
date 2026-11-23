+++
title = "PostgreSQL vs Redis for background job queues"
description = "PostgreSQL (FOR UPDATE SKIP LOCKED) vs Redis for background jobs: crash durability, transactional enqueueing, throughput, and operational footprint."
date = 2026-11-23T12:30:00-05:00

[taxonomies]
tags = ["postgres", "databases", "reliability", "architecture"]

[extra]
kind = "guide"
+++

**Start with PostgreSQL (`FOR UPDATE SKIP LOCKED`) for background job queues if you already run Postgres and process fewer than a few thousand jobs per second.** You get transactional enqueueing (the job and the business write commit atomically), crash durability out of the box, and zero extra infrastructure. **Choose Redis (Streams or BullMQ/Sidekiq) when you need tens of thousands of ephemeral jobs per second with sub-millisecond dispatch latency and can tolerate or explicitly engineer around Redis persistence trade-offs.**

Most teams add Redis for background jobs on day one out of habit—and immediately introduce a dual-write problem between their primary database and their queue.

## PostgreSQL vs Redis queues at a glance

| Dimension | PostgreSQL (`SKIP LOCKED`) | Redis (Lists / Streams) |
|---|---|---|
| **Atomic with business writes?** | **Yes** (same `BEGIN ... COMMIT` transaction) | **No** (dual-write: DB commit + Redis push can split on crash) |
| **Crash durability** | Full WAL durability on commit | Depends on `appendfsync always` (slower) vs `everysec` (up to 1s data loss) |
| **Dispatch throughput** | Hundreds to low thousands of jobs/sec per instance | Tens to hundreds of thousands of jobs/sec |
| **Querying & inspection** | Standard SQL (`WHERE status = 'failed'`, joins with tenant/user) | Custom key scanning or separate dashboard tooling |
| **Operational footprint** | Zero new services if Postgres is already your DB | Second stateful service to monitor, back up, and secure |
| **Main scaling bottleneck** | Table bloat / `VACUUM` pressure at high churn | Memory ceiling (all queued jobs live in RAM) |

## The failure mode that settles most debates: the dual-write gap

Suppose a user publishes a post or completes a payment, and you need to send a webhook or trigger a rebuild:

- **With Redis:** you commit the Postgres transaction, then call `LPUSH` / `XADD` on Redis. If your app process crashes—or Redis blips—between those two lines, the database says "published" and the job never exists. Reverse the order and a Postgres rollback leaves a ghost job in Redis for a record that doesn't exist.
- **With PostgreSQL:** you insert the business row *and* the job row in the **same transaction** (the [transactional outbox pattern](@/posts/transactional-outbox-rust-postgresql.md)). Either both exist or neither does.

## When PostgreSQL queues start to hurt

PostgreSQL is not a magic bullet for every queue workload. Every job state transition (`pending` → `running` → `done`) creates dead tuple versions in MVCC. Above a few thousand jobs per second—or if you leave millions of completed rows in the same hot table—autovacuum falls behind, indexes bloat, and `SKIP LOCKED` scans slow down.

If you run a Postgres queue:
- Use a **partial index** (`WHERE delivered_at IS NULL`) so finished rows stay out of the hot index.
- Use **lease timestamps (`locked_until`)** so a `kill -9`'d worker's jobs are automatically reclaimed.
- Prune or partition completed jobs aggressively.

And if you want a dedicated durable job runner without running Redis *or* putting queue churn on your app database, a framed append-only journal (like [Durable Runner](@/durable-runner/_index.md)) gives you disk-fsynced durability with a tiny operational footprint.

## When to choose which

**Choose PostgreSQL if:**
- Jobs are tied to relational state changes (emails, webhooks, billing events, post-publish rebuilds).
- Losing a job on a crash is unacceptable.
- Your volume is under ~1,000–3,000 jobs/sec and you want one less stateful service to operate.

**Choose Redis if:**
- You run very high-frequency, short-lived tasks (metrics fan-out, real-time scraping, tens of thousands of jobs/sec).
- Sub-millisecond dispatch latency matters more than strict transactional coupling with Postgres.
- You already run and monitor Redis in production.

## Frequently asked questions

**Can I use Postgres `LISTEN`/`NOTIFY` with a Postgres queue?**
Yes—as a **wake-up hint** to eliminate polling delay, never as the queue itself. Always keep a periodic poll fallback and use [`try_recv()`](@/posts/sqlx-pglistener-silently-drops-notifications.md) so a dropped listener never stalls jobs.
