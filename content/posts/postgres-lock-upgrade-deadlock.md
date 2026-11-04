+++
title = "The deadlock that only exists when two people publish at once"
description = "Colophon's concurrency tests caught a real FOR SHARE to UPDATE upgrade race in the publish path. The fix is one row of lock discipline: take the lock you actually need."
date = 2026-11-05T08:00:00Z
+++

Here's a pattern that lives in thousands of codebases: read a counter, then write it back. It looks safe. It isn't — and Colophon's publish path just proved it the hard way.

## The pattern

Publishing a release updates the environment's generation counter. The innocent version:

```sql
SELECT generation FROM environments WHERE id = $1 FOR SHARE;
-- compute the next generation
UPDATE environments SET generation = $2 WHERE id = $1;
```

`FOR SHARE` means "don't let this row change while I read it." Several transactions can hold it at once — that's the point.

Now run two publishes on the same environment at once:

```
T1: SELECT ... FOR SHARE        -- holds share lock
T2: SELECT ... FOR SHARE        -- also holds share lock (they coexist)
T1: UPDATE ...                  -- needs a write lock; T2's share lock blocks it
T2: UPDATE ...                  -- needs a write lock; T1's share lock blocks it
                                -- deadlock. Postgres shoots one.
```

Each transaction took a read lock, then tried to upgrade to a write lock while the other's read lock was still held. Neither can ever move. Postgres spots the cycle and kills one — and which one dies is luck.

## Why it survives review

The race is narrow: two publishes on the *same* environment inside the same few milliseconds.

Code review reads it as correct. Every single-threaded test passes. The only way to find it is to actually run two publishes at once — so the test does exactly that, in a loop, against a real Postgres.

That's where it fired.

## The fix

Take the stronger lock from the start:

```sql
SELECT generation FROM environments WHERE id = $1 FOR NO KEY UPDATE;
```

Now the second transaction waits politely at the `SELECT` instead of deadlocking at the `UPDATE`. And it costs nothing — the code was always going to write that row anyway.

The rule is one sentence: **if you're going to write the row, take the write lock when you read it.**

Why `FOR NO KEY UPDATE` and not plain `FOR UPDATE`? It's the weakest lock that still blocks another writer — so foreign-key checks and `FOR SHARE` readers elsewhere keep working.

## Why this counts

This bug was always going to ship. It reads correctly, it works in every single-threaded run, and it explodes in production at the worst moment — two editors hitting publish on the same release train.

The test that caught it isn't clever. It publishes concurrently until the deadlock fires, then asserts it can't fire again. What makes it worth having is the rule behind it: a concurrency claim you haven't raced isn't a claim. It's a hope.
