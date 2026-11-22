+++
title = "Idempotency keys in PostgreSQL: exact schema and retry safety"
description = "How to implement idempotent HTTP APIs in PostgreSQL so retried payments, webhooks, and job submits never execute twice—including concurrent races and parameter mismatches."
date = 2026-11-22T09:20:00-05:00

[taxonomies]
tags = ["postgres", "rust", "reliability", "architecture"]

[extra]
kind = "guide"
+++

**An idempotency key guarantees that retrying the same `POST` request executes the side effect once and returns the exact same response.** To make it safe under real network failures and concurrent retries, store the key, a SHA-256 hash of the request payload, and the final HTTP response inside PostgreSQL in the **same transaction** as your business write—and reject any reuse of the same key with a different request body (`409 Conflict`).

Networks drop responses all the time. A client sends `POST /payments` or `POST /jobs`, your server commits the work, and the TCP connection resets before the `200 OK` reaches the caller. The client has no way to tell whether the request failed before or after the commit, so it retries. Without idempotency keys, retries double-charge customers, fire duplicate webhooks, or enqueue the same job twice.

## The 4 failure modes naive idempotency misses

Most tutorials show a simple `SELECT` followed by an `INSERT`. That breaks in production in four ways:

1. **Concurrent double-click race:** Two identical requests arrive 2 milliseconds apart. Both run `SELECT`, see no row, and both execute the charge.
2. **Same key, different payload:** A buggy client reuses `Idempotency-Key: order-123` for a $500 request after previously sending a $50 request. Silently returning the $50 receipt hides a serious bug.
3. **Crash mid-flight:** The server inserts the key, crashes before finishing the external call or committing, and leaves the key stuck forever.
4. **Unbounded table growth:** Idempotency keys accumulate forever until the table bloats and slows down writes.

## The exact PostgreSQL schema

Scope every key to the caller (tenant/account) and endpoint, store a `request_hash` to catch payload mismatches, and record an `expires_at` timestamp so a background sweep can prune old keys cleanly:

```sql
CREATE TABLE idempotency_keys (
    tenant_id       uuid        NOT NULL,
    idempotency_key text        NOT NULL,
    request_hash    bytea       NOT NULL,
    status_code     smallint    NOT NULL,
    response_body   jsonb       NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX idx_idempotency_expires_at
    ON idempotency_keys (expires_at);
```

Notice the composite primary key `(tenant_id, idempotency_key)`: one tenant's key can never collide with or read another tenant's cached response.

## Handling concurrent retries safely inside one transaction

When the side effect itself lives in PostgreSQL (like committing a payment journal entry in [Payment Sandbox](@/payment-sandbox/_index.md) or creating a publish changeset in [Colophon CMS](@/colophon/_index.md)), the cleanest pattern is **insert-first or advisory-lock inside a single database transaction**:

```sql
-- Inside BEGIN ... COMMIT
INSERT INTO idempotency_keys (
    tenant_id, idempotency_key, request_hash,
    status_code, response_body, expires_at
)
VALUES ($1, $2, $3, 0, '{}'::jsonb, now() + interval '24 hours')
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
RETURNING idempotency_key;
```

Here is what happens for every possible case:

1. **`RETURNING` gives you the key (you won the race):**
   - Execute your business writes (insert journal entries, queue outbox row) in the **same transaction**.
   - `UPDATE idempotency_keys SET status_code = $4, response_body = $5 WHERE tenant_id = $1 AND idempotency_key = $2`.
   - `COMMIT`. If anything fails before `COMMIT`, Postgres rolls back both the business write *and* the idempotency row—so the client can safely retry with the exact same key.

2. **`RETURNING` is empty (a duplicate arrived):**
   - Because Postgres holds a row lock on the uncommitted `INSERT` from request #1, a concurrent request #2 automatically **waits** until request #1 commits or rolls back—eliminating the double-execution race.
   - Once unblocked, `SELECT request_hash, status_code, response_body FROM idempotency_keys WHERE tenant_id = $1 AND idempotency_key = $2`.
   - If the stored `request_hash` does not match the incoming request's hash, return **`409 Conflict`** (or `422 Unprocessable Entity`) with a clear error code—never silently return the old response.
   - Otherwise, replay the stored `status_code` and `response_body` verbatim.

## What if the side effect calls an external API?

Never hold a PostgreSQL transaction open while making an HTTP call to Stripe, an email provider, or a webhook receiver. Instead, combine idempotency keys with the **transactional outbox pattern**:

1. Inside the fast Postgres transaction, record the idempotency key **and** insert a pending row into an `outbox` table, then `COMMIT` immediately.
2. A background worker claims the outbox row, forwards the **same idempotency key** to the downstream provider, and marks the row delivered.

That way your API stays fast, your Postgres connection pool never stalls on slow third-party APIs, and crashes never leave half-committed state behind.

## Frequently asked questions

**How long should idempotency keys be retained?**
24 hours is the standard baseline for interactive API retries (Stripe uses 24 hours). For webhook receivers or asynchronous batch jobs that may retry over a weekend outage, keep keys for 7 to 30 days and prune expired rows in bounded batches.

**Should `GET` or `DELETE` endpoints require an idempotency key?**
`GET` is read-only and naturally idempotent. `POST` endpoints that create resources, move money, or trigger external side effects are where idempotency keys matter most.
