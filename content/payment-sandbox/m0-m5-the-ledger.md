+++
title = "M0–M5: fake money, real books"
description = "Day one of Payment Sandbox: a double-entry journal PostgreSQL won't let anyone edit, two-phase payments against a separate simulated network, signed webhooks fulfilled exactly once, and an explanation for every balance. Process kills, clock jumps and a restore found no double charge. The review then found five ways the books could still be bent; those and five Mediums are fixed, and a second round is under way."
date = 2026-11-16T18:20:00-05:00

[extra]
kind = "experiment"
milestone = "M0–M5"
step = "build"
short_title = "Fake money, real books"
# Executed tests at a92e1f4 (the end of M5) in the independent review's first and third gate runs,
# including 4 fault-injection drills; its second run failed one flaky test.
tests = 138

[extra.summary]
goal = "A payment sandbox whose simulated balances can always be explained by an immutable double-entry journal, and which never charges twice, whatever crashes."
built = "A pure money and accounting domain, a journal guarded by database triggers, scoped sandbox keys, two-phase payments with an identity committed before the network call, a separate simulator process, a recovery reconciler, signed webhooks with a leased deliverer, and explain-balance."
proof = ["138 tests at the end of M5 in 2 of the reviewer's 3 gate runs; the other failed a flaky test", "reviewer's chaos run: 128 kill -9s, 13 clock jumps, 3 restores, 0 double charges", "64 concurrent refunds of 10 against 300 captured: exactly 30 admitted", "five accounting Highs and five Mediums from the review, fixed on main the same evening", "load: smokes only, 9 of 16 failed their thresholds"]
code = "akira-shirase-oss/payment-sandbox · main @ 1756a3c"
+++

If your bank app shows £50 but nobody can say where it came from, it's not a balance. It's a
rumour. A real payment system can trace every penny to the entries that put it there.

Payment Sandbox pretends about the money and refuses to pretend about the books.

## What I built

Six milestones in one day:

- **M0, the spine.** Money as exact whole numbers of the smallest unit (cents, yen, fils), never
  floating point. A chart of accounts, balanced entries, and a journal that PostgreSQL protects with
  triggers: no updates, no deletes, no unbalanced or one-sided entries, no lines from another
  currency or project, and no posting time chosen by the client.
- **M1, keys.** Sandbox keys start with `sk_sim_`, are stored only as a hash, have scopes, and stop
  working on the very next request after they're revoked. A key that looks like a real provider's
  `sk_live_` or `sk_test_` never authenticates. The last admin key can't be revoked, even by two
  requests racing.
- **M2, payments.** Authorize, capture, void and refund work as two-phase holds, like a hotel holding
  money on your card before it charges you. Each operation's identity is derived from the client's
  idempotency key and committed *before* the simulated network is called.
- **M3, uncertainty.** The simulator can lose replies or time out. A reconciler runs at startup and
  every 5 seconds, asks the network what really happened, and settles it.
- **M4, webhooks.** The event is written in the same transaction as the payment change, then a
  deliverer sends it, signed, with retries. A small test store receives them and fulfils each
  payment exactly once.
- **M5, explain.** Any balance can be explained posting by posting, with running totals, and a report
  checks the journal against the payments in both directions.

The simulator is a separate process with its own store, so the sandbox and "the network" can
disagree the way real systems do.

## How it works (the short version)

The trick that prevents double charges is **write down what you're about to do before you do it.**
The operation's identity is saved first. If the server dies after the network said yes but before it
recorded the answer, the reconciler finds the saved identity, asks the network, and records what
happened. A retry with the same key finds the same operation instead of making a new one.

The trick that keeps the books honest is **let the database refuse.** The rules about the journal
aren't in my application code where a bug could skip them. They're in PostgreSQL, so even a broken
server can't write an unbalanced entry.

## Does it actually work?

- **Tests.** The independent review ran the gate three times at the end of M5. Twice, 138 tests passed,
  including 4 fault-injection drills. Once, a readiness test failed because the database pool's first
  connect missed its 500 ms deadline on the busy machine: a flaky gate, now fixed.
- **The three drills.** (a) Kill the real server right after the network approved a payment: no
  second charge or capture on retry. (b) Jump a virtual clock 90 days forward and 180 back: the
  journal and the network's records come out byte for byte the same. (c) Restore an older server
  backup next to a newer network: the report finds exactly the 2 missing operations, and client
  retries close the gap without charging twice.
- **Races.** 64 concurrent refunds of 10 against a payment with 300 captured: exactly 30 admitted.
- **Webhooks.** 30 payments, each event delivered one to three times, shuffled and concurrent: exactly
  one fulfilment per captured payment.
- **The reviewer's own chaos run:** 72 server, 46 simulator and 10 test-store `kill -9`s, 13 clock
  jumps, 3 dump-and-restores and 19,820 network operations. No double charge, no lost capture, no
  duplicate fulfilment.

The load runs were smokes on my development Mac (Apple M2 Pro, 12 cores, 32 GB) while it was busy,
on working trees with uncommitted changes. All sixteen smoke records are now committed, failures
included, each with a note on what it showed. **9 of the 16 failed their thresholds.** Counting only
the latest run of each of the seven scenarios, two still miss. The payment lifecycle ran 3,121 requests
with no failures and a clean reconciliation, but p99 was 635 ms against a 250 ms gate. Webhooks
delivered 501 for 501 with no duplicates, but p95 was 120 ms against 100 ms. The others pass in their
latest run: the uncertain-outcome run resolved all 120 uncertain payments (p99 98 ms), and
explain-balance answered at p99 26 ms.

## Where I messed up

The smokes found four real bugs on the way. The database pool starved (1,030 timeouts) and 41
reservations were left in limbo: requests for the same payment now wait in line on an in-process lock
before they touch the database, and recording an answer retries with jitter. A reverse-reconciliation
listing went over its size cap. And a report ran past its 5-second deadline.

Then the review, whose verdict was "fix first, then M6". Its five Highs were all ways to bend the
books without breaking a test:

- **The server ran as the database superuser** that owns the tables, so it could have switched off
  the very triggers that guard the journal. It now runs as a separate, limited role.
- **A temporary table could stand in for the journal** inside those triggers, because they looked
  tables up by name through the search path. They now name the schema exactly.
- **After a restore, the same idempotency key with a different amount was quietly accepted** as the
  old operation, and the report still said everything was clean. A conflict with the network is now
  final, and records carry a fingerprint of what was asked.
- **The network-agreement report could stop early** without saying so, and only checked one
  direction. It now reads to the end, both ways, field by field.
- **A paged explanation didn't add up** under concurrent writes. In the reviewer's case the lines
  summed to −150 against a balance of −350, because a posting that took an earlier number but
  committed later was skipped. An explanation is now of one database snapshot, so every page agrees.

All five were fixed on `main` the same evening, and so were the review's three card-number findings.
The sandbox refuses anything that looks like a real card number, but the first guard missed eight
common shapes, like dots, full-width digits and slashes; it now joins digits across short separators
and checks every 13-to-19-digit window. A card number sent as a JSON number used to be echoed back in
the error, and one in the URL path or the request-id header reached the logs; neither happens now.
The flaky gate and a disabled webhook endpoint that kept getting delivery attempts are fixed too.

`main`'s CI went red three times along the way. One fix went out with the gate red over a lint
warning, and `main` was green again about a minute and a half later. Two more red runs were flaky
tests on a slow runner, a property test and a lock-timeout test, both since fixed. CI is green at
`1756a3c`.

## What it doesn't do yet

- **Four Mediums are open, and a second fix round on them is under way.** Any read-only key can ask
  for expensive reconciliation reports with no rate limit; the simulator's control endpoints (faults,
  the clock) have no authentication and are built into the release binary; the reconciler reads
  uncertain operations one at a time across every project, so one project can hold up the rest; and
  one project's dead webhook endpoint can slow delivery for everyone. Four Lows are open too.
- **None of the fixes has had a second review yet.**
- **"Done" now waits for load.** The review caught the roadmap calling M2 to M5 done while their
  status cells said planned, and claiming account checkpoints that were never built. The rule now
  requires a committed full load run before anything is called done, so M0 to M5 read "in progress,
  functional gates pass, full load run owed".
- **No full load runs.** Seven scenarios each owe a run of at least a million requests, on a quiet
  machine, plus a scripted restore rehearsal.
- **No screen yet.** Checkout and the dashboard are M6.

## Up next

The second fix round on the four Mediums, a second review, then M6: a hosted checkout and a
dashboard, built with SvelteKit, Tailwind and shadcn-svelte.
