+++
title = "R0: a penny is a whole number"
description = "Day one of Accounting Reconciliation: money as exact integers parsed digit by digit, a line state machine where every wrong move is a named refusal, a CSV reader that refuses a bad file whole, by row number, and a decision log the database itself chains and won't let anyone edit. Four slices of the spine; no matching, drills or load yet."
date = 2026-11-16T21:06:00-05:00

[extra]
kind = "experiment"
milestone = "R0"
step = "spine"
short_title = "A penny is a whole number"

[extra.summary]
goal = "Start the spine of a reconciliation tool whose numbers can't drift and whose decisions can't be quietly rewritten."
built = "A pure domain crate (checked integer money, strict dates, normalization, a tuple hash per line, the line state machine, balanced matches, a hash-chained decision record with a verifier), a strict streaming CSV reader with the first statement profile, and the PostgreSQL schema with three roles, an append-only chained decision log and a staged import, plus the gate and CI."
proof = ["property tests: formatting and parsing money round-trip exactly; overflow and 20-digit amounts are refused", "any way of chunking an upload reads exactly as one piece does", "every refusal named, with row numbers, up to 1,000 per file", "the decision log refuses UPDATE, DELETE and TRUNCATE, even for its owner", "no matching, drills or load run yet"]
code = "akira-shirase-oss/accounting-reconciliation · main @ 49a90cc"
+++

Ask a computer what 0.1 + 0.2 is, in the usual way, and it says 0.30000000000000004. That's fine for a
game. It's not fine when an accountant has to explain to a client why a bank line is a fraction of a
cent off from its invoice.

So the first rule here: money is a whole number.

## What I built

Four slices of R0, the spine:

- **Money as checked whole numbers** of the smallest unit, using a table of how many decimal places each
  currency has. Amounts are parsed digit by digit, never through floating point. Overflow is refused,
  and so are 20-digit amounts.
- **Strict dates and text rules**: ISO dates only, field-text rules, and one normalization for
  narrations and counterparty names, with a version number (v1).
- **A fingerprint per line**: a hash over the line's identifying fields, pinned against an independent
  computation, so the same line imported twice is recognised.
- **The line state machine.** Every transition is either in the table or a named refusal. A match that
  doesn't balance can't even be constructed.
- **The decision record**: each decision carries the hash of the previous one, and a verifier walks the
  chain and names the first broken link.
- **A strict CSV reader** that reads an upload chunk by chunk, holding at most one record in memory. It
  refuses, by name, stray quotes, bare carriage returns, unterminated quotes, empty rows, invalid UTF-8,
  and control and bidi-override characters (the invisible ones that can make text display in a
  different order than it's stored). It has hard limits: 64 KiB per record, 8 KiB per field, 256
  fields, 2,000,000 rows, 50 MiB.
- **The first statement profile**: it checks the header exactly, parses dates and plain decimals without
  floats, requires the account's currency, refuses zero amounts, computes each row's hash and the file's
  SHA-256, and reports up to 1,000 refused rows by code and row number while counting all of them.
- **The database schema**: firms, users, clients, accounts, imports, statement lines, duplicates and the
  decision log. The database enforces the rules itself. Every reference carries the firm, so a cross-firm
  reference fails even as raw SQL. The decision log refuses `UPDATE`, `DELETE` and `TRUNCATE`, for its
  owner too, and a trigger the application can't bypass chains each record to the previous one per
  client. Lines only become visible when their import flips to complete, in the same transaction.
- **Three database roles**: one that only creates databases, one that only migrates, and the server's,
  which owns nothing and can't change the schema or create temporary tables.
- **The staged import**: rows are staged in batches under a lease, then flipped to complete one account at
  a time. A repeated file gets the earlier import back, and a duplicate line is recorded with a pointer to
  the line it duplicates.
- **A command line and a data generator.** `recon` sets up the roles and the locked-down database,
  applies the schema, walks every client's chain and names the first broken link, and replays the log
  against the stored state. A seeded generator writes the same bytes for the same seed: statements with
  references, quoted narrations, running balances and identical same-day twins, in USD, JPY and KWD.
  The drills and load runs will use it.

## How it works (the short version)

A malformed file is **refused whole**, with row numbers, instead of half-imported. That sounds strict,
and it is on purpose: a partly imported statement is worse than none, because the missing lines look
like they were never there. The accountant gets a list of exactly what's wrong and where, fixes the
file, and imports it again.

## Does it actually work?

It's early, so the honest list is short:

- **Property tests** (many generated cases instead of a few hand-picked ones): formatting then
  parsing an amount gives back exactly the same amount, parsing equals the exact integer, and overflow
  and 20-digit amounts are refused.
- **Chunking doesn't matter.** A property test proves that any way of splitting any input into chunks
  reads exactly the same as reading it in one piece, which is what a streaming reader has to promise.
- **The chain survives the tricks it was tested against.** Every database function pins its search path, and a test plants a
  hostile `public.sha256` function to show it wins in an unpinned context but can't reach the chain. The
  server checks its own role at startup, and that check is shown to fail for the owner, the superuser and
  an unpinned function.
- **The gate is real**: toolchain pin, formatting, lints as errors, the architecture rules with a
  self-test proving each can fail, the tests and a dependency audit, run in CI.

The commits don't record a test count yet, so I'm not quoting one. There's no load run and no drill;
those need the database and the import pipeline.

## Where I messed up

Nothing worth a confession yet: four slices in about half an hour, and no review. The one honest slip
is the README, which still says "contract documents only; no code yet" on `main`.

## What it doesn't do yet

- **No server yet.** The Axum skeleton is the rest of R0's building; the data generator is done.
- **No matching**, no exception queue, no review screens, no model.
- **No drills or load.** R0's own gate asks for a `kill -9` at 20 points while staging 200,000 rows (each
  import complete or invisible), a database-down drill, and a 1,000,000-line import with throughput and
  memory recorded.
- **No real data, and no accountants yet.** The ship gate needs one or two practising accountants to close
  a real month on it. They haven't been found.

## Up next

The rest of R0: the server skeleton, the drills and the million-line import. Then an independent
review.
