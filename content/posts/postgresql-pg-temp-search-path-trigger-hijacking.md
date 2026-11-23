+++
title = "PostgreSQL pg_temp search_path hijacking: how a temp table fools triggers"
description = "Why CVE-2018-1058-style search_path shadowing still breaks PostgreSQL triggers in 2026: how a session's pg_temp table can bypass an accounting trigger, and the exact fix."
date = 2026-11-23T14:30:00-05:00

[taxonomies]
tags = ["postgres", "security", "databases", "reliability"]

[extra]
kind = "failure"
+++

PostgreSQL's `search_path` hijacking class (made famous by **CVE-2018-1058**) is eight years old, and it still slips into brand-new production schemas—including our own first migration of [Payment Sandbox](@/payment-sandbox/_index.md).

During our independent security review of Payment Sandbox's double-entry accounting triggers, a reviewer caught a subtle bypass (review finding 2, fixed in `0006_trigger_search_path.sql`): even though our trigger checked `journal_entries` and `journal_lines` on every insert, it referenced them **without schema prefixes** and **without pinning `search_path`**.

## How `pg_temp` silently shadows your real tables

In PostgreSQL, **the session's temporary schema (`pg_temp`) is searched *first* for unqualified table names** unless `pg_temp` is explicitly listed later in `search_path`.

Suppose a trigger function runs:

```sql
-- Vulnerable: unqualified table names, unpinned search_path
SELECT count(*), coalesce(sum(amount_minor), 0)
  FROM journal_lines
 WHERE project_id = NEW.project_id AND entry_id = NEW.id;
```

If a session with `TEMP` privileges runs:

```sql
CREATE TEMP TABLE journal_lines (
    project_id uuid,
    entry_id uuid,
    amount_minor bigint
);
-- Insert fake balanced rows into the temp table...
```

When that session inserts an **unbalanced** real row into `public.journal_entries`, the trigger resolves `FROM journal_lines` to **`pg_temp.journal_lines`** instead of **`public.journal_lines`**. The trigger sees the fake balanced rows in the temp table and waves the corrupted entry right through.

## The exact fix: pin `pg_catalog, pg_temp` and schema-qualify every relation

Putting `pg_temp` **last** in `SET search_path = pg_catalog, pg_temp` stops PostgreSQL from implicitly prepending `pg_temp` ahead of everything else, and schema-qualifying every table (`public.journal_lines`) and built-in (`pg_catalog.pg_current_xact_id()`, `pg_catalog.now()`) removes ambiguity completely.

Here is the real fix from `planned/payment-sandbox/crates/sandbox-db/migrations/0006_trigger_search_path.sql`:

```sql
CREATE OR REPLACE FUNCTION public.journal_entries_check_lines() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    line_count bigint;
    total numeric;
BEGIN
    SELECT count(*), coalesce(sum(amount_minor), 0) INTO line_count, total
      FROM public.journal_lines
     WHERE project_id = NEW.project_id AND entry_id = NEW.id;
    IF line_count < 2 OR total <> 0 THEN
        RAISE EXCEPTION 'journal entry % has no balanced lines at commit', NEW.id
            USING ERRCODE = 'PSJ03';
    END IF;
    RETURN NULL;
END
$$;
```

And for trigger functions that don't query tables at all (like append-only guards), pin `search_path` anyway:

```sql
ALTER FUNCTION public.journal_refuse_change()
    SET search_path = pg_catalog, pg_temp;
```

## Two extra hardening steps worth taking

1. **Revoke `TEMP` from your runtime app role** (`REVOKE TEMP ON DATABASE app FROM app_runtime;`) if your application never needs temporary tables. Defense in depth means closing both the privilege *and* the trigger resolution path.
2. **Note the difference with Neon Postgres:** `SET search_path = pg_catalog, pg_temp` is a built-in PostgreSQL parameter and works cleanly for non-superusers on Neon—unlike custom `SET app.tenant_id = ''` clauses on functions, which Neon refuses (see [Migrating to Neon Postgres without superuser](@/posts/neon-postgres-migrations-without-superuser.md)).

## Frequently asked questions

**Does `SET search_path = ''` work too?**
Yes—an empty `search_path` forces every table, type, and operator not in `pg_catalog` to be schema-qualified (note that `pg_catalog` is still searched implicitly unless you want explicit `pg_catalog.` prefixes everywhere). `SET search_path = pg_catalog, pg_temp` with explicit `public.<table_name>` achieves the same protection against `pg_temp` shadowing while keeping built-in operators readable.
