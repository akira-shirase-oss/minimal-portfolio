+++
title = "M0–M5: fake money, real books"
description = "Day one of Payment Sandbox: a double-entry journal PostgreSQL won't let anyone edit, two-phase payments against a separate simulated network, signed webhooks fulfilled exactly once, and an explanation for every balance. Process kills, clock jumps and a restore found no double charge. The review then found five ways the books could still be bent."
date = 2026-11-16T23:20:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "M0–M5"
short_title = "Fake money, real books"
# Executed tests at a92e1f4 (the end of M5) in the independent review's run, including 4 fault-injection drills.
tests = 138

[extra.summary]
goal = "A payment sandbox whose simulated balances can always be explained by an immutable double-entry journal, and which never charges twice, whatever crashes."
built = "A pure money and accounting domain, a journal guarded by database triggers, scoped sandbox keys, two-phase payments with an identity committed before the network call, a separate simulator process, a recovery reconciler, signed webhooks with a leased deliverer, and explain-balance."
proof = ["138 tests at the end of M5, including 4 fault-injection drills", "reviewer's chaos run: 128 kill -9s, 13 clock jumps, 3 restores, 0 double charges", "64 concurrent refunds of 10 against 300 captured: exactly 30 admitted", "five accounting Highs from the review, fixed on main the same evening", "load: smokes only, two missed their latency gate"]
code = "akira-shirase-oss/payment-sandbox · main @ ed64527"
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

- **Tests.** The independent review ran the gate at the end of M5: 138 tests passed, including 4
  fault-injection drills.
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

The load runs were smokes on my development Mac (12 cores) while it was busy, recorded in the commit
messages rather than as result files. Some passed: the uncertain-outcome run resolved all 120
uncertain payments (p99 98 ms), and explain-balance answered at p99 26 ms. Two missed. The payment
lifecycle ran 3,121 requests with no failures and a clean reconciliation, but p99 was 635 ms against
a 250 ms gate. Webhooks delivered 501 for 501 with no duplicates, but p95 was 120 ms against 100 ms.

## Where I messed up

The smokes found two real bugs on the way: the database pool starved (1,030 timeouts), and 41
reservations were left in limbo. Requests for the same payment now wait in line on an in-process
lock before they touch the database, and recording an answer retries with jitter.

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

All five were fixed on `main` the same evening. One of those fixes went out with the gate red, over
a lint warning, and `main` was green again about a minute and a half later.

## What it doesn't do yet

- **Card-number guarding still has two gaps.** The sandbox refuses anything that looks like a real
  card number. The review stored eight shapes the first guard missed, like dots, full-width digits and
  slashes; the guard now joins digits across short separators and checks every 13-to-19-digit window,
  and all eight are refused. Still open: a number sent as a JSON number is echoed back in the error,
  and one in a URL path or request-id header can reach the logs.
- **Some docs claim too much.** The roadmap's status column still says "Planned" for finished
  milestones, and one row still names the simulator's old store.
- **No full load runs.** Seven scenarios each owe a run of at least a million requests, on a quiet
  machine, plus a scripted restore rehearsal.
- **No screen yet.** Checkout and the dashboard are M6.

## Up next

Close the last two card-guard findings, fix the docs, then M6: a hosted checkout and a dashboard, built with
SvelteKit, Tailwind and shadcn-svelte.
