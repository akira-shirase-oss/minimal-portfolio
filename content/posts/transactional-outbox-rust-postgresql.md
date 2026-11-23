+++
title = "Transactional outbox in Rust + PostgreSQL: schema, worker loop, and kill -9 drills"
description = "How to reliably publish webhooks, rebuilds, and side effects from PostgreSQL without dual-write bugs: outbox schema, SKIP LOCKED claiming, lease recovery, and crash drills."
date = 2026-11-23T10:15:00-05:00

[taxonomies]
tags = ["rust", "postgres", "reliability", "architecture"]

[extra]
kind = "guide"
+++

**Never make an HTTP call or push to a message broker inside a database transaction—and never do it right after `COMMIT` without a durable record.** If your server dies between `COMMIT` and the HTTP call, the event is lost forever. If you make the HTTP call *before* `COMMIT` and Postgres rolls back, the downstream system received an event that never happened.

The fix is the **transactional outbox pattern**: write your business change *and* an `outbox` row inside the **same PostgreSQL transaction**, commit immediately, and let a separate worker deliver the row at least once. We use this pattern across [Colophon CMS](@/colophon/_index.md) and [Payment Sandbox](@/payment-sandbox/_index.md) (and pair it with a framed file journal in [Durable Runner](@/durable-runner/_index.md)).

## The outbox schema

Keep the table lean, lease-based, and indexed specifically for the worker's claim query:

```sql
CREATE TABLE outbox_events (
    id              uuid        PRIMARY KEY,
    tenant_id       uuid        NOT NULL,
    topic           text        NOT NULL,
    payload         jsonb       NOT NULL,
    attempts        integer     NOT NULL DEFAULT 0,
    max_attempts    integer     NOT NULL DEFAULT 10,
    available_at    timestamptz NOT NULL DEFAULT now(),
    locked_until    timestamptz,
    delivered_at    timestamptz,
    last_error      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Partial index keeps the hot claim scan tiny even if you retain history
CREATE INDEX idx_outbox_pending
    ON outbox_events (available_at, id)
    WHERE delivered_at IS NULL;
```

Notice two deliberate details:
1. **`locked_until` (a lease), not a boolean `in_progress` flag.** If a worker is killed with `kill -9` mid-delivery, a boolean flag stays `true` forever. A lease expires automatically so another worker can reclaim the row.
2. **A partial index `WHERE delivered_at IS NULL`.** Delivered rows disappear from the index immediately, so claiming the next batch stays fast as the table grows.

## The worker claim query (`FOR UPDATE SKIP LOCKED`)

Multiple worker instances can run safely side by side if each claims a bounded batch with `SKIP LOCKED`:

```sql
WITH next_batch AS (
    SELECT id
      FROM outbox_events
     WHERE delivered_at IS NULL
       AND available_at <= now()
       AND (locked_until IS NULL OR locked_until < now())
       AND attempts < max_attempts
     ORDER BY available_at, id
     LIMIT 16
     FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events o
   SET locked_until = now() + interval '30 seconds',
       attempts     = o.attempts + 1
  FROM next_batch
 WHERE o.id = next_batch.id
RETURNING o.id, o.tenant_id, o.topic, o.payload, o.attempts;
```

In Rust, the worker loop:
1. Claims a batch inside a short transaction (milliseconds, no network I/O).
2. Performs the HTTP delivery outside any database transaction, with a strict per-request timeout shorter than `locked_until`, forwarding `o.id` as an `Idempotency-Key` header.
3. On `2xx`, sets `delivered_at = now(), locked_until = NULL`.
4. On retryable failure, sets `locked_until = NULL, available_at = now() + backoff, last_error = $err`.

You can also emit `pg_notify('outbox_wake', '')` on insert to wake workers immediately—just keep a periodic poll fallback (e.g., every 1–2 seconds) and loop on [`try_recv()`](@/posts/sqlx-pglistener-silently-drops-notifications.md) so a dropped listener never stalls delivery.

## The `kill -9` drill that proves it works

An outbox isn't durable because the diagram looks right. Run this drill before calling it done:

1. Start the worker against a mock receiver that hangs for 2 seconds on the first attempt.
2. Insert 50 business records + outbox rows in one transaction.
3. Wait until the worker claims the first batch, then send `SIGKILL` (`kill -9`) to the worker process.
4. Restart the worker, let the lease expire, and assert:
   - All 50 events eventually reach `delivered_at IS NOT NULL`.
   - The downstream receiver applied each event **once** (via its [idempotency key](@/posts/idempotency-keys-in-postgresql.md)), even when attempt #1 was interrupted mid-flight.

## Frequently asked questions

**Does an outbox guarantee exactly-once delivery?**
It guarantees **at-least-once delivery**. If the worker delivers the HTTP request and crashes before writing `delivered_at`, the row will be retried after the lease expires. Pair the outbox with an idempotency key on the receiver to get end-to-end exactly-once *effect*.

**How do we keep the outbox table from bloating?**
Either delete rows once `delivered_at < now() - interval '7 days'` in bounded batches (`LIMIT 1000`), or archive them to cold storage if you need an audit trail.
