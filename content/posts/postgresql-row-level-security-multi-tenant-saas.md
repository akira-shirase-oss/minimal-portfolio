+++
title = "Row-Level Security (RLS) in PostgreSQL for multi-tenant SaaS"
description = "How to enforce tenant isolation inside PostgreSQL with RLS, FORCE ROW LEVEL SECURITY, transaction-scoped SET LOCAL, Neon non-superuser gotchas, and cross-tenant attack tests."
date = 2026-11-23T11:15:00-05:00

[taxonomies]
tags = ["postgres", "security", "databases", "architecture"]

[extra]
kind = "guide"
+++

**Row-Level Security (RLS) moves tenant isolation from "every engineer remembers `WHERE tenant_id = $1`" to "PostgreSQL refuses to return another tenant's rows even if a query forgets the filter."**

In a multi-tenant SaaS product, forgetting a single `WHERE tenant_id = $1` in one reporting query or background job is an instant S1 data breach. In [Colophon CMS](@/colophon/_index.md), we pair type-level tenant scoping in Rust with PostgreSQL RLS so both layers have to fail simultaneously before a cross-tenant read can happen.

## The four rules of production RLS

Most RLS tutorials stop right after `ENABLE ROW LEVEL SECURITY`, leaving three dangerous gaps open:

1. **Run the app as a non-superuser role without `BYPASSRLS`.** Superusers and roles with `BYPASSRLS` ignore every RLS policy silently. Separate your **migrator role** (owns tables) from your **runtime app role** (least-privilege `SELECT, INSERT, UPDATE, DELETE` only).
2. **Always add `FORCE ROW LEVEL SECURITY` if the table owner could ever query it.** Without `FORCE`, the table owner bypasses RLS by default.
3. **Set tenant context with `SET LOCAL` inside a transaction, never session-level `SET`.** With connection pooling (`PgPool`, PgBouncer), a session-level `SET app.tenant_id` leaks onto the *next* HTTP request that borrows that pooled connection. `SET LOCAL` resets automatically at `COMMIT` or `ROLLBACK`.
4. **Fail closed when the setting is missing.** Use `current_setting('app.tenant_id', true)` and compare strictly—if the variable is unset or empty, return zero rows instead of throwing or matching everything.

## Exact schema and policy setup

```sql
CREATE TABLE documents (
    id          uuid PRIMARY KEY,
    tenant_id   uuid NOT NULL,
    title       text NOT NULL,
    body        jsonb NOT NULL
);

CREATE INDEX idx_documents_tenant ON documents (tenant_id, id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
    AS RESTRICTIVE
    FOR ALL
    TO app_runtime
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );
```

Notice both `USING` (guards `SELECT`, `UPDATE`, `DELETE`) and `WITH CHECK` (guards `INSERT` and `UPDATE` so Tenant A cannot insert a row claiming to belong to Tenant B).

And on every request in Rust (`sqlx`):

```rust
let mut tx = pool.begin().await?;
sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
    .bind(tenant_id.to_string())
    .execute(&mut *tx)
    .await?;

// All queries on &mut *tx are now strictly scoped to `tenant_id`.
// On commit or drop/rollback, the local setting disappears automatically.
```

The third argument `true` in `set_config('app.tenant_id', $1, true)` is the SQL equivalent of `SET LOCAL`.

## Watch out for the Neon Postgres gotcha

If you host on Neon (where there is no superuser), **do not** attach `SET app.tenant_id = ''` directly onto a `CREATE FUNCTION ... SET` or `ALTER DATABASE ... SET` statement—Neon refuses custom parameter `SET` clauses for non-superusers and refuses `GRANT SET ON PARAMETER`. Instead, save, clear, and restore the setting *inside* the function body with `set_config`. (See [Migrating to Neon Postgres without superuser](@/posts/neon-postgres-migrations-without-superuser.md).)

## Prove RLS works with a cross-tenant attack test

Never assume a policy is active until a test tries to break it:

1. Insert a row for Tenant A and a row for Tenant B.
2. Connect using the **actual `app_runtime` role** (not the test superuser!).
3. Run `SELECT count(*) FROM documents` *without* setting `app.tenant_id` → assert `0`.
4. Set `app.tenant_id` to Tenant A and run `SELECT * FROM documents WHERE id = $tenant_b_row_id` → assert `0` rows.
5. Attempt `INSERT INTO documents (id, tenant_id, ...) VALUES (..., $tenant_b_id, ...)` while scoped to Tenant A → assert PostgreSQL rejects it with a policy violation (`42501`).

Pair that test with a [mutation proof](@/posts/proving-security-attack-tests-fail-with-mutation-harness.md) so you know it goes red if someone accidentally grants `BYPASSRLS` or drops the policy.
