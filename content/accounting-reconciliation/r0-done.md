+++
title = "R0: a million bank lines in 8.28 seconds, and a chain that could break itself"
description = "The spine is done: a streamed import server, two crash drills, and a 1,000,000-line import on a GitHub runner and on the laptop. The review found the least-privileged database role could permanently break the audit chain with an ordinary insert. Fixed with the rest of the review's list, and the second pass says done."
date = 2026-11-17T03:49:00-05:00

[extra]
kind = "release"
milestone = "R0"
step = "done"
short_title = "R0 done: a million lines"
# Tests in CI run 44049990060 at af4c42c's code (108 workspace tests plus 2 drills).
tests = 110

[extra.summary]
goal = "Finish the spine: an import server that never acknowledges a half-imported file, crash drills that prove it, a million-line import, and an audit chain nobody can quietly rewrite."
built = "A streamed CSV upload through staging with one permit per upload, a flip that makes an import visible all at once, the kill-mid-import and database-down drills, a load driver, and the review's fixes: chain heads that only move forward and are anchored outside the database."
proof = ["1,000,000 lines in 8.28 s on the laptop (120,771 lines/s), 0 errors", "17.709 s on a 4-core GitHub runner (56,469 lines/s)", "kill -9 at 20 points while importing 200,000 rows: every import complete or invisible", "second review: done", "CI green at af4c42c"]
code = "akira-shirase-oss/accounting-reconciliation · main @ af4c42c"
+++

An audit trail is a promise that nobody can rewrite history without it showing. The review found a
way my own database could break that promise with no attacker at all.

## What I built

**Slice 5, the rest of the spine:**

- **The import server.** A CSV upload is streamed through a staging table: one import permit per upload
  (a busy server answers 503 rather than queueing), a 50 MiB cap, a 60-second parse deadline, 15
  seconds of allowed body silence, and one 5,000-row batch in memory at a time. It answers 201 or 200
  only after the flip that makes the import visible has committed.
- **A startup check** that refuses to run as the owner, as a superuser or against an unpinned schema.
- **Two drills and a load driver.** Building them found two real defects: the flip was quadratic (over
  120 seconds for 30,000 rows, now 0.46 s), and a lease could expire before a slow batch committed.

**The review's fix round**, all on `main`:

- **The chain could break itself.** An `ON CONFLICT DO NOTHING` insert moved the chain head to a record
  that was never written. That was a permanent break that the least-privileged role could cause by
  accident. Now an already-recorded id is refused, a deferred check refuses any commit whose head names
  no real record, and heads only move forward.
- **The owner could log in and rewrite a chain.** The owner role is now `NOLOGIN`, and chain heads are
  anchored outside the database with HMAC-SHA256 signatures, so even a superuser who rewrites a chain
  gets caught. Only verified heads are anchored, and an empty verify fails.
- **Connections are bounded**: a 10-second header-read and idle timeout, 512 connections, 256 requests
  in flight with 503 shedding beyond that, a 10-second write-stall deadline, 1,000 requests and 5
  minutes per connection.
- **Verify read two snapshots** and raised false tamper alarms (27 in 60). It now reads one.
- And smaller ones: byte-bounded batches under a shared budget, cached readiness, range-checked money
  on the way in, zero-width and bidi characters refused, the server's own request id, and SCRAM
  password verifiers instead of a cleartext password.

## How it works (the short version)

The import is **complete or invisible**. Rows go into staging in batches under a lease, and a single
flip, one account at a time, makes them all visible in one transaction. A crash anywhere before the
flip leaves nothing visible; a rerun produces exactly the lines an uninterrupted import would have.

## Does it actually work?

- **The drills.** `kill -9` at 20 seeded points (16 during staging, 4 during the flip) while importing
  a 200,000-row file: every import was complete or invisible, and every rerun matched an uninterrupted
  import exactly. With the database down, readiness went red within 2 seconds, uploads got 503, none was
  lost, and every file was imported exactly once after recovery. Both drills pass in CI.
- **A million lines, three times.** The same shape each time: 200 accounts, 1,000 files of 1,000 lines,
  with thresholds of 0 errors, p99 at most 3,000 ms, at least 10,000 lines a second, and at most 256 MiB
  of memory. All three passed:

| where | commit | time | lines/s | file p99 | peak memory |
|---|---|---:|---:|---:|---:|
| GitHub runner, 4 cores | `af1dceb` | 17.709 s | 56,469 | 299 ms | 31.3 MB |
| GitHub runner, after the fixes | `b09b8fe` | 18.797 s | 53,199 | 232 ms | 25.3 MB |
| my laptop (Apple M2 Pro), busy | `8cb393b` | 8.28 s | 120,771 | 402 ms | 34.0 MB |

  The laptop was faster overall but had the worst p99, at a load average of about 12 to 15. Runner
  numbers are CI observations, laptop numbers are development observations, and neither is capacity.
- **Tests.** CI ran 110 (108 workspace tests plus the 2 drills), up from 62.
- **The review.** First pass: fix first, with 2 High, 5 Medium and 9 Low. Second pass: **done**.

## Where I messed up

My first connection-limit fix left out the write deadline, so a client that never read could still hold
a slot. CI failed once because a test raced the readiness probe. And two tests needed wider timing
margins on a loaded machine.

## What it doesn't do yet

- **No matching.** R0 is the spine: imports, the chain and the drills. Matching, the exception queue
  and review screens start at R1.
- **Two measurements are owed**: a 50 MiB file of wide rows with its memory, and a very large account.
- **One Low security residual** is open; I'll describe it once it's fixed.
- **No accountants yet.** The ship gate needs one or two to close a real month on it.

## Up next

R1: import profiles, encodings, OFX, invoices and bills, and revisions instead of overwrites.
