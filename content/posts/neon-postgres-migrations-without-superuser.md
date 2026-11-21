+++
title = "Neon Postgres migrations without superuser: four refusals CI misses"
description = "Stock Postgres CI runs as a superuser. Neon doesn't give you one. Four migration patterns that pass locally and fail on real Neon."
date = 2026-11-21T15:10:00-05:00

[taxonomies]
tags = ["postgres", "reliability", "security"]

[extra]
kind = "failure"
+++

Nothing wastes a deploy day faster than a migration that passed 500 times in CI and refuses to run on your real database.

Stock Postgres Docker images hand you a `postgres` superuser by default. Everything succeeds: setting custom parameters, changing object owners, creating roles, passing pre-hashed passwords. Then you point the exact same migration folder at **Neon**, which never gives tenants superuser access—and Postgres politely refuses four different things your CI never caught.

We hit all four while preparing [Colophon CMS](@/colophon/_index.md) for its first Neon deployment. Here is every refusal and the exact fix that works on both Neon and stock Postgres.

## 1. Passing a SCRAM verifier as a role password

If your role-bootstrap script hashes a password into a `SCRAM-SHA-256$...` verifier string and sends it to `ALTER ROLE ... PASSWORD`, Neon refuses it for non-superusers.

**Fix:** Send the plaintext password over a `sslmode=verify-full` TLS connection on Neon and let Postgres compute the SCRAM verifier server-side. Keep the credential out of argv and logs (read from stdin or a root-only file).

## 2. `ALTER FUNCTION ... SET app.custom_setting = ''`

If you use Row-Level Security (RLS) with custom session settings like `app.tenant_id`, it is tempting to clear or pin them on a `SECURITY DEFINER` function header:

```sql
-- Passes as superuser in stock Postgres; fails on Neon
ALTER FUNCTION auth_lookup(text) SET app.tenant_id = '';
```

Setting a custom GUC on a function or role requires superuser—and Neon also refuses `GRANT SET ON PARAMETER`.

**Fix:** Drop the function-header `SET` clause and save, clear, and restore the setting inside the function body using `current_setting('app.tenant_id', true)` and `set_config('app.tenant_id', ..., true)` (transaction-local).

## 3. `ALTER TABLE ... OWNER TO app_role`

When a migrator role creates tables and then hands ownership to an application role, Postgres 16+ (and Neon) enforces strict role-membership checks:

- The migrator must have `SET` on the target role (and `INHERIT` if it needs to replace objects owned by that role later).
- The new owner must have `CREATE` privilege on the schema.

**Fix:** Grant `CREATE` on the schema to the target role for the duration of the migration run and revoke it immediately afterward, rather than leaving permanent schema-DDL privileges on the runtime application role.

## 4. Roles created inside migrations

If your bootstrap or early migrations execute `CREATE ROLE`, Postgres 16+ no longer automatically grants the creating role `SET` and `INHERIT` on the new role unless configured to do so. That breaks subsequent `ALTER ... OWNER TO` statements later in the same migration set.

**Fix:** Run the migrator session with:

```sql
SET createrole_self_grant = 'set, inherit';
```

## Catch it in CI, not on deploy day

Two habits keep these from ever coming back:

1. **Test migrations in CI as a non-superuser `CREATEROLE` owner**, not `postgres`. Create a normal owner role in your CI Postgres container and run `init-roles` + migrations + a smoke query as that role on every push.
2. **Keep a scratch-database probe against real Neon** that applies your migrations to a temporary database as the real Neon owner, reports any refusal, and drops the scratch database when done.

Five minutes in CI beats two hours of debugging `permission denied` on deploy day.
