+++
title = "The deadlock that only exists when two people publish at once"
description = "Colophon's concurrency tests caught a real FOR SHARE to UPDATE upgrade race in the publish path. The fix is one row of lock discipline: take the lock you actually need."
date = 2026-11-05T08:00:00Z
+++

Colophon's publish path reads a counter and then writes it. That pattern lives in thousands of codebases, and it's a deadlock waiting for exactly the right timing — which is why the test suite spends real money making that timing happen.

## The pattern

Publishing a release updates the environment's generation counter. The safe way to do that in one transaction looks innocent:

```sql
SELECT generation FROM environments WHERE id = $1 FOR SHARE;
-- compute the next generation
UPDATE environments SET generation = $2 WHERE id = $1;
```

`FOR SHARE` says "I'm going to read this row and I don't want it changing under me." Other transactions can hold the same share lock at once — that's the point of it.

Now run two publishes on the same environment at once:

```
T1: SELECT ... FOR SHARE        -- holds share lock
T2: SELECT ... FOR SHARE        -- also holds share lock (they coexist)
T1: UPDATE ...                  -- wants a row lock; blocked by T2's share lock
T2: UPDATE ...                  -- wants a row lock; blocked by T1's share lock
                                -- deadlock. Postgres shoots one.
```

Each transaction asked for a read lock, then tried to upgrade it to a write lock while the other's read lock was still held. Neither can ever proceed. Postgres detects the cycle and kills one — the request fails, and which one fails is luck.

The race is narrow: it needs two publishes on the *same* environment within the same few milliseconds. Code review reads it as correct. Unit tests with one transaction never see it. The only way to find it is to actually run two publishes at once — so the test does, in a loop, on a real Postgres.

## The fix

`FOR NO KEY UPDATE` takes a stronger lock from the start:

```sql
SELECT generation FROM environments WHERE id = $1 FOR NO KEY UPDATE;
```

It blocks other writers immediately — the second transaction waits at the `SELECT` instead of deadlocking at the `UPDATE`. Since the code *always* updates the row it locks, asking for the weaker lock bought nothing anyway. The discipline is one sentence: **if the transaction will write the row, take the write lock when you read it.**

`FOR NO KEY UPDATE` rather than plain `FOR UPDATE` because it's the weakest lock that still blocks another `FOR NO KEY UPDATE` — foreign-key checks and `FOR SHARE` readers elsewhere keep working.

## Why this counts

This is the kind of bug that ships. It reads correctly, it's right in every single-threaded run, and it only explodes in production at the worst possible moment — two editors hitting publish on the same release train. It exists in the codebase for exactly as long as nobody runs two writes at once.

The test that caught it isn't clever: it publishes concurrently until the deadlock fires, then asserts it can't fire again. What made it worth writing is the rule the project keeps — a concurrency claim you haven't raced isn't a claim, it's a hope.
