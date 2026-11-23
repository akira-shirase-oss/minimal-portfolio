+++
title = "Double-entry accounting enforced by PostgreSQL triggers"
description = "Enforce immutable, balanced double-entry accounting inside PostgreSQL using statement triggers, deferred commit checks, and pg_current_xact_id()."
date = 2026-11-23T11:00:00-05:00

[taxonomies]
tags = ["postgres", "databases", "reliability", "architecture"]

[extra]
kind = "guide"
+++

If your accounting invariant ("every journal entry balances to zero, and posted entries are never edited") lives only in application code, it is a convention, not a guarantee. One buggy background script, one rushed SQL hotfix, or one partial write during a deploy can silently corrupt a balance—and you won't notice until reconciliation fails a month later.

In [Payment Sandbox](@/payment-sandbox/_index.md), **PostgreSQL itself enforces the double-entry journal** (`0001_spine.sql`). Even a direct `psql` connection cannot update a posted line, post an unbalanced entry, or sneak a new line onto an old transaction.

## The five invariants we enforce in SQL

1. **Append-only history:** `UPDATE`, `DELETE`, and `TRUNCATE` on `journal_entries` and `journal_lines` raise custom SQLSTATE `PSJ01`. Mistakes are fixed by posting a reversing entry, never by editing the past.
2. **Database-owned timestamps and transaction IDs:** a `BEFORE INSERT` trigger overwrites `posted_at := now()` and `created_xact := pg_current_xact_id()` so no application clock can backdate history.
3. **Every insert balances immediately:** an `AFTER INSERT ... REFERENCING NEW TABLE AS new_lines FOR EACH STATEMENT` trigger checks that every touched entry has at least two lines, sums to `0` in signed minor units (integer cents/smallest currency unit, never floats), and belongs to `pg_current_xact_id()` (`PSJ02`).
4. **No empty headers at commit:** a `DEFERRABLE INITIALLY DEFERRED` constraint trigger on `journal_entries` verifies at `COMMIT` that every new header actually received its balanced lines (`PSJ03`).
5. **Same currency and chart of accounts:** composite foreign keys guarantee a USD line cannot attach to a EUR entry and every account exists in the project's chart.

## The core schema and triggers

Here is the real trigger structure from `planned/payment-sandbox/crates/sandbox-db/migrations/0001_spine.sql`:

```sql
CREATE FUNCTION journal_refuse_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'the journal is append-only: % on % refused', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'PSJ01',
              HINT = 'correct a posted entry with a reversing entry';
END
$$;

CREATE TRIGGER journal_entries_append_only
    BEFORE UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION journal_refuse_change();

CREATE TRIGGER journal_entries_no_truncate
    BEFORE TRUNCATE ON journal_entries
    FOR EACH STATEMENT EXECUTE FUNCTION journal_refuse_change();
```

And the statement-level balance check that stops both unbalanced writes *and* post-commit tampering:

```sql
CREATE FUNCTION journal_lines_check_balance() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    offending uuid;
BEGIN
    SELECT e.id INTO offending
      FROM (SELECT DISTINCT project_id, entry_id FROM new_lines) touched
      JOIN journal_entries e
        ON e.project_id = touched.project_id AND e.id = touched.entry_id
      JOIN journal_lines l
        ON l.project_id = touched.project_id AND l.entry_id = touched.entry_id
     GROUP BY e.project_id, e.id, e.created_xact
    HAVING sum(l.amount_minor) <> 0
        OR count(*) < 2
        OR e.created_xact <> pg_current_xact_id()
     LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'journal entry % is unbalanced, has < 2 lines, or was posted earlier', offending
            USING ERRCODE = 'PSJ02';
    END IF;
    RETURN NULL;
END
$$;

CREATE TRIGGER journal_lines_balanced
    AFTER INSERT ON journal_lines
    REFERENCING NEW TABLE AS new_lines
    FOR EACH STATEMENT EXECUTE FUNCTION journal_lines_check_balance();
```

Notice `e.created_xact <> pg_current_xact_id()`. Without that check, a buggy caller could insert two extra offsetting lines onto an entry from last Tuesday and rewrite historical account activity while still summing to zero.

## Fast balance reads without mutable balance columns

Never store a mutable `accounts.balance` column that can drift from the ledger. Instead, compute balances as `SUM(amount_minor)` backed by a covering index:

```sql
CREATE INDEX journal_lines_by_account
    ON journal_lines (project_id, dataset_epoch, currency, account_kind)
    INCLUDE (amount_minor);
```

Because `amount_minor` is in `INCLUDE`, PostgreSQL serves balance queries via an **index-only scan**—fast reads, zero drift, and every dollar is directly explainable by the journal lines that produced it.

## Frequently asked questions

**Why integer `bigint` minor units instead of `NUMERIC` or `FLOAT`?**
Floats lose precision on base-10 decimals (`0.1 + 0.2 != 0.3`). Signed `bigint` minor units (cents for USD, yen for JPY, fils for KWD) are exact, compact, and fast to sum. Store the currency alongside the amount so formatting knows the decimal scale.

**Why set `search_path` on trigger functions?**
In PostgreSQL, always pin `SET search_path = pg_catalog, public` (or your explicit schema) on trigger functions—and watch out for [Neon non-superuser migration rules](@/posts/neon-postgres-migrations-without-superuser.md) when setting function attributes.
