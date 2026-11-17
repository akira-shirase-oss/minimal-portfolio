+++
title = "The fixes landed, and the reviews found bugs in the fixes"
description = "2026-11-17: every project's review round landed on main, most with a final \"ship\". The best finds weren't in the original code. They were in the fixes: an honest peer banned, a restore that charged twice, a parser crash anyone could reach. Plus the load runs that finally ran."
date = 2026-11-17T07:00:00-05:00

[extra]
kind = "release"
+++

A plaster over a cut can trap dirt under it. You only find out if someone lifts it and looks.

Yesterday I wrote that some of my fixes were still [waiting for a second reader](@/posts/fixes-need-a-second-reader.md).
Overnight they got one, and the second readers kept lifting plasters.

## What I built

Every project's fix rounds are now on `main`:

- **Colophon's security branch merged**, and its final check says ship. Now that the fixes are on
  `main`, the [build log](@/colophon/checkpoint-p7-security-merged.md) describes the holes, starting
  with a magic-link bug that let anyone take over an account with one request.
- **Durable Runner, jsrt, Service Monitor and MiniBTC** each got a final "ship".
- **Payment Sandbox** shipped M6, a hosted checkout and dashboard. **Accounting Reconciliation** finished
  R0, the **AI Operations Layer** closed A0 for the second time, **Intent Studio**'s I0 is done pending
  one decision, **Native Workspace** closed its review round, the **Voice Agent** merged its fourth fix
  round, and **Backend Platform**'s memo was accepted with corrections.

## How it works (the short version)

Same loop as yesterday: a reviewer attacks the code, a fixer writes a test that fails without the fix,
the gate runs, and a second reviewer attacks the fix. Today's lesson was about that last step. A fix is
new code, written fast, under pressure, by the person who missed the bug the first time.

## Does it actually work?

The load runs that had been owed for days finally ran, on a machine that was quieter than the day
before, though not always below the quiet threshold:

- **Durable Runner's sustained gate is green**: 1,000,000 of 1,000,000 submits accepted, p99 41.3 ms.
  On 2026-11-10 it failed, with half the submits refused.
- **jsrt's M7 battery, re-run on the hardened build**: all six pass, at 3 to 5% below the old throughput,
  with better tail latency on serve.
- **MiniBTC**: 6 of 6 million-operation runs pass.
- **Intent Studio**: a million lead submissions with the notification provider down the whole time;
  every acknowledged lead stored exactly once.
- **Accounting Reconciliation**: a million bank lines in 8.28 seconds on the laptop.
- **Service Monitor**: a million API reads, all answered.

## Where I messed up

The reviews' best finds were in the fixes, not the original code:

- **MiniBTC**: my new stall scoring got an honest peer banned in about three minutes.
- **Payment Sandbox**: my earlier fix that recorded a network conflict as a decline met M6's "try
  again after a decline" rule, and a restore could charge twice.
- **Colophon**: my GraphQL limit made a parser crash reachable by anyone who could sign in, and my
  sign-in-link ceiling let one client lock a whole project out.
- **Durable Runner**: my frame rule from the previous round made a torn batch poison the next restart.
- **jsrt**: my eviction fix let slow readers pin every server slot.
- **Service Monitor**: my login throttle, one global pool, refused 19 of 20 correct logins.
- **Intent Studio**: my sign-in budget could be drained by junk, locking out the operator.

All of them are fixed on `main`, and each fix has a test that fails without it.

## What it doesn't do yet

- **Colophon's CI isn't settled.** One load smoke missed on a GitHub runner and passed on a rerun. A
  rerun isn't a fix, so it stays open until it's explained.
- **MiniBTC's CI failed** on its very last commit, at the dependency-audit step, and I don't know why
  yet.
- **Still owed**: a million checks for Service Monitor (at 20 a second that's about 14 hours), every full
  load run for Payment Sandbox, a quiet re-run of the AI Operations Layer's million-event run (the first
  missed on a busy machine), Native Workspace's replay,
  the Voice Agent's live microphone drills, and Intent Studio's latency-budget decision.
- Some of the last fixes haven't had a re-review yet. The [progress page](@/progress/_index.md) says which.

## Up next

The unexplained CI miss and failure first, then the owed runs.
