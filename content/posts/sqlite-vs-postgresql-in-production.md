+++
title = "SQLite vs PostgreSQL in production: when single-node WAL beats a remote DB"
description = "An honest comparison of SQLite in WAL mode vs PostgreSQL for production services: latency, write concurrency, backups, multi-node scaling, and when to switch."
date = 2026-11-22T09:10:00-05:00

[taxonomies]
tags = ["postgres", "databases", "reliability", "architecture"]

[extra]
kind = "guide"
+++

**Use SQLite (in WAL mode) in production when your service runs on a single server, reads vastly outnumber writes, and you want sub-millisecond local queries with zero network hops. Use PostgreSQL when you need multiple app servers writing concurrently, Row-Level Security, heavy concurrent write throughput, or managed remote hosting.**

We run **both** across our own Rust services: [Service Monitor](@/service-monitor/_index.md) uses **SQLite** on its own droplet so it can keep observing even if external database networks wobble, while [Colophon CMS](@/colophon/_index.md) and [Payment Sandbox](@/payment-sandbox/_index.md) use **PostgreSQL** for strict multi-tenant RLS and concurrent writes. Neither choice is ideological—each matches the failure mode of the service.

## SQLite vs PostgreSQL at a glance

| Dimension | SQLite (WAL mode) | PostgreSQL |
|---|---|---|
| **Architecture** | Embedded file in the same process | Separate client-server database process |
| **Network latency** | **0 ms** (in-process file I/O) | 0.2 ms (local) to 5–30 ms (remote/cloud) |
| **Read concurrency** | Excellent (many concurrent readers in WAL mode) | Excellent (MVCC + connection pooling) |
| **Write concurrency** | **One writer at a time** per database file | Many concurrent writers (row-level locking) |
| **Horizontal app scaling** | Single-node only (unless using replication tools) | Multiple stateless app instances out of the box |
| **Security & tenancy** | File permissions; app enforces tenant scoping | Roles, `GRANT`, and Row-Level Security (RLS) |
| **Backups** | Online backup API / `VACUUM INTO` / Litestream | `pg_dump`, WAL archiving / PITR, managed snapshots |

## Why SQLite in WAL mode is much faster than people think

Out of the box, SQLite uses rollback journaling, which blocks readers during writes and earns SQLite an unfair reputation for locking up. Turning on **Write-Ahead Logging (WAL)** and a few sane pragmas changes its behavior completely:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
```

With WAL enabled:
- **Readers never block writers, and writers never block readers.**
- Because there is **zero network round-trip**, a query that takes 12 ms over a remote cloud Postgres connection often finishes in **< 0.1 ms** in SQLite. That eliminates the classic N+1 network latency tax on read-heavy dashboards.
- Operations are dramatically simpler: no connection pooler, no TLS cert rotation to a database host, and no database container to keep alive.

## Where SQLite hits a real wall

SQLite has one hard physical constraint: **only one write transaction can commit at a time per database file.**

If your app runs on one machine and writes a few dozen or a few hundred small transactions per second (batched cleanly), SQLite handles it effortlessly. You hit trouble when:

1. **You need two or more app servers writing to the same state** (zero-downtime blue/green deploys across hosts, or horizontal autoscaling behind a load balancer).
2. **Multiple endpoints hold write transactions open concurrently**—you will start seeing `SQLITE_BUSY` errors once `busy_timeout` is exhausted.
3. **You need database-enforced multi-tenancy or complex types**—PostgreSQL gives you native `uuid`, `timestamptz`, `jsonb`, `LISTEN`/`NOTIFY` (watch the [sqlx reconnect gap](@/posts/sqlx-pglistener-silently-drops-notifications.md)), and Row-Level Security.
4. **Your backup strategy is "just copy the file."** Copying a live SQLite file with `cp` while WAL writes are in flight can produce a corrupted backup. Always use SQLite's online backup API or `VACUUM INTO 'backup.db'`, and rehearse restoring it.

## When should you choose SQLite vs PostgreSQL?

**Choose SQLite in production if:**
- One server (one VPS / droplet) comfortably handles your traffic and you want the simplest possible failure domain.
- Your workload is read-heavy or single-writer (monitoring agents, local-first tools, small SaaS, internal consoles, edge caches).
- You want zero network hops between app and data.

**Choose PostgreSQL in production if:**
- Multiple app instances or background workers need to write concurrently.
- You are building multi-tenant SaaS where RLS and strict role separation matter.
- You want managed point-in-time recovery (PITR) and remote hosting (such as Neon or RDS) decoupled from your app server's disk.

## Frequently asked questions

**Can SQLite handle 100,000+ requests per day in production?**
Yes, easily—if most of those requests are reads and writes are kept short in WAL mode. On a modest NVMe VPS, SQLite routinely serves tens of thousands of reads per second because there is no TCP serialization overhead.

**Is it hard to migrate from SQLite to PostgreSQL later?**
Not if you keep your SQL standard and avoid SQLite's loose typing (use `STRICT` tables, explicit ISO-8601 timestamps or integer epochs, and `PRAGMA foreign_keys = ON` from day one). If you already know you will need multi-node writes or RLS, start on PostgreSQL and skip the migration.
