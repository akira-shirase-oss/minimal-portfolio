+++
title = "How to isolate PostgreSQL for AI coding agents without breaking staging"
description = "Give AI coding agents fast, disposable PostgreSQL databases with per-test templates, migration checksums, and non-superuser CI checks."
date = 2026-11-23T12:15:00-05:00

[taxonomies]
tags = ["postgres", "ai", "security", "reliability"]

[extra]
kind = "guide"
+++

Let an AI coding agent run tests against a shared staging PostgreSQL database and two things happen within an hour: it runs `DROP SCHEMA public CASCADE` while trying to fix a migration error, or it edits an already-applied migration file in place so every real database refuses to boot.

We learned both lessons the hard way while running parallel agent sessions across our Rust + PostgreSQL projects. Isolating Postgres for agents takes less than an hour to set up and eliminates an entire class of "who broke staging?" incidents.

## The four walls between an AI agent and your real database

### 1. Zero production or staging credentials in the agent's environment
The agent's workspace `.env` should point **only** to a local Postgres container (`127.0.0.1:5432`) or an ephemeral branch. Never put staging or production `DATABASE_URL` strings in shell profiles, `.env` files, or repo fixtures that an agent can read or accidentally invoke.

### 2. One ephemeral database per test run
If two parallel agent sessions (or two `cargo test` binaries) share one local database, tests race each other and produce phantom failures that cause the agent to "fix" working code.

Give every integration test its own database created from a pre-migrated template (takes ~15 ms in Postgres):

```sql
-- Once per test binary startup: migrate `app_test_template`
-- Per test case:
CREATE DATABASE test_case_8f3a1c TEMPLATE app_test_template;
```

Or use `sqlx::test` (which creates and drops a fresh database per test automatically). Each test starts from a clean, identical state and never collides with parallel runs.

### 3. Lock applied migrations with a committed checksum manifest
On 2026-11-20, an in-place edit to an existing migration (`0018`) broke boot compatibility for any database that had already applied the original file. AI agents love editing the last migration file instead of creating a new one unless a check physically stops them.

Commit a `migrations.sha256` manifest alongside your migrations and enforce in CI:
- Every existing migration file's SHA-256 must match the committed manifest byte-for-byte.
- New changes must go into a **new** numbered migration file (and append its hash to the manifest).

```bash
# Fails immediately if an agent modified an already-committed migration
sha256sum -c migrations/migrations.sha256
```

### 4. Test migrations as a non-superuser owner
Local Docker Postgres runs as superuser `postgres`, so an agent can write migrations with `ALTER ROLE ... SUPERUSER` or `CREATE FUNCTION ... SET app.tenant_id = ''` that pass locally and fail on managed hosts like Neon. Add a CI job that creates a **non-superuser `CREATEROLE` owner** and runs `init-roles` + migrations + a smoke test against it (see [Migrating to Neon Postgres without superuser](@/posts/neon-postgres-migrations-without-superuser.md)).

## What this unlocks for parallel agent workflows

With disposable local databases, immutable migration checksums, and non-superuser CI checks:
- Multiple agents can run full integration and attack suites concurrently in separate git worktrees without stepping on each other.
- Destructive resets only ever touch throwaway local databases.
- Migration drift or Neon-incompatible SQL is caught in seconds, before review.
