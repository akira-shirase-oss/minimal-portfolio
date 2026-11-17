+++
title = "Every fix got a second reader, and the readers kept finding bugs"
description = "One day: a security pass over the five built projects where every fix round was checked by a reviewer who didn't write it, seven planned projects starting code, and decisions on eight new project briefs."
date = 2026-11-16T23:59:00Z

[extra]
kind = "experiment"
+++

Proofreading your own writing doesn't work. You read what you meant to write, not what's on the page.
Code is the same, and today I stopped pretending otherwise.

Every fix on this site today was read by a second reviewer who didn't write it. That reviewer then
ran the attacks again, on the real binaries, and wrote down what still broke.

## What I built

**A gap review of the five built projects.** An outside review read Colophon, Service Monitor,
Durable Runner, jsrt and MiniBTC against their own contracts, the way an attacker or an unlucky
operator would. It found 151 gaps, 50 of them High. Three patterns ran through all of them: gates that
only run by hand drift, "done" claims run ahead of the code, and the million-request rule wasn't met
everywhere it applies.

**Fix rounds, each one reviewed.** jsrt, Service Monitor and MiniBTC went through four rounds, Durable
Runner three, and Colophon one, which is still on a branch. Each has its own build-log entry:
[Colophon](@/colophon/checkpoint-p7-security.md), [Service Monitor](@/service-monitor/checkpoint-h-1.md),
[Durable Runner](@/durable-runner/checkpoint-0-6.md), [jsrt](@/js-runtime/checkpoint-h-1.md) and
[MiniBTC](@/minibtc/checkpoint-h-1.md).

**Seven planned projects started code**, each in its own public repository, each with a first
build-log entry:

- [Payment Sandbox](@/payment-sandbox/_index.md): simulated money, real double-entry accounting.
- [AI Operations Layer](@/ai-operations-layer/_index.md): a timeline that shows missing events as gaps.
- [Personal Voice Agent](@/personal-voice-agent/_index.md): an on-device assistant that can't act in
  your name.
- [Intent Studio](@/intent-studio/_index.md): client brief to published website, starting with leads
  that can't get lost.
- [Accounting Reconciliation](@/accounting-reconciliation/_index.md): every bank line matched,
  excluded or explained.
- [Native Workspace](@/native-workspace/_index.md): an optional, read-only Mac workbench.
- [Backend Platform](@/backend-platform/_index.md): parked, and its own first memo says keep it that
  way.

**Decisions on eight new project briefs.** Each one either became a project, joined an existing one,
or was set aside, with the reason written down:

| Brief | Decision | Why |
|---|---|---|
| AI accounting reconciliation | **Promoted** to its own project | Deterministic matching for the bulk, a model only for the ambiguous rest, every decision explained. It fits "proof over breadth". |
| Payment rails for AI agents (HTTP 402) | **Merged** into Payment Sandbox as a later milestone | Pay-then-retry with per-agent caps and allowlists, over simulated money only. |
| Scheduling with deposits | **Merged** into Intent Studio | Bookings for the pilot businesses, with deposits on Payment Sandbox's simulated money. |
| Meeting notes to a CRM | **Merged** into Personal Voice Agent's later plan | Summaries stay drafts, nothing reaches a CRM without approval, and recording consent comes first. |
| Niche prediction market | **Parked** | Real-money markets are gambling or derivatives law, and a play-money version proves little new. |
| AI DeFi yield optimizer | **Dropped** | It moves real funds. Everything here uses simulated money. |
| Tokenized private credit | **Dropped** | A securities offering almost everywhere, and the hard part can't be proven by code. |
| AI content repurposing | **Dropped** | A crowded market, and nothing to prove that Colophon and Intent Studio don't already. |

And a [progress page](@/progress/_index.md) that lists every project's stage, latest review verdict,
what's owed and what's next, with the time it was checked.

## How it works (the short version)

The loop is simple, and it's the same for every project:

1. A reviewer reads the code like an attacker and writes each finding down with a severity and the
   evidence.
2. A fixer works on a short branch. Every fix comes with a test that fails without it.
3. The full gate runs, and its exit code is read directly.
4. The branch merges, and a second reviewer reads the merged code and re-runs the attacks, live.
5. Repeat until the reviewer says ship.

Step 4 is the one that matters. Without it, a fix is just a change nobody checked.

## Does it actually work?

For the built projects, here's where the day ended. Test counts are from the reviewers' own gate runs.

| Project | Rounds | Tests | Last review |
|---|---:|---:|---|
| jsrt | 4 | 84 → 130 | ship, 3 Low items left |
| Service Monitor | 4 | 137 → 215 | ship, 4 Low items left |
| MiniBTC | 4 | 167 → 249 | the fixes hold live, 1 Medium left |
| Durable Runner | 3 | 26 → 96 | no acknowledged job lost, an older High found |
| Colophon | 1, on a branch | 770 on `main` | the branch isn't reviewed yet |

Durable Runner's reviewers killed it with `kill -9` in 142 rounds across three passes, and not one
acknowledged job was lost. MiniBTC's node that got stuck at block 128 now catches up 1,000 blocks in
17 seconds.

The new projects got the same treatment where they had code to review. Payment Sandbox's five
accounting Highs and the AI Operations Layer's six Highs were all fixed on `main` the same
evening. The Voice Agent's five Highs are being fixed on a branch.

## Where I messed up

The reviewers kept finding bugs that my fixes had created:

- **jsrt:** a request queue where 64 slow clients could hold every slot, then a byte budget for
  uploads that deadlocked.
- **Service Monitor:** a refusal recorded so that it never paged anyone, then restart limits that
  turned one slow boot into a permanently failed service.
- **Durable Runner:** a clean-up that could delete the live journal, and an hourly default that stalled
  submits for over 6 seconds.
- **MiniBTC:** a reindex that failed at random, then a bounded header table that left any node more
  than 128 blocks behind stuck forever.
- **Payment Sandbox, the AI Operations Layer and the Voice Agent:** reviews found ways to bend the
  books, timelines that looked more certain than their evidence, and a microphone that stayed on after
  push-to-talk.

One fix went out with the gate red, because the command that pushed it didn't stop on the gate's exit
status. The rule now is plain: read the exit code itself, never through a pipe or a filter.

And the oldest one: Colophon's CI had failed on `main` on every run since 2026-11-04, and its testbed
hadn't run at all since at least the 5th. Twelve days of "it's in CI" meant nothing, because I wasn't
reading it.

The lesson: a fix is a change like any other. It needs its own reviewer, and that reviewer needs to
attack it, not just read the diff.

## What it doesn't do yet

- **No full load runs today.** The machine was shared by a dozen builds and reviews, with load
  averages mostly in the tens and sometimes in the hundreds, and the rule for a full run is below
  about 6. Every project owes its million-request runs, on a quiet machine,
  with machine and commit recorded. The [progress page](@/progress/_index.md) lists them.
- **Two fix sets aren't merged:** Colophon's security branch and the Voice Agent's fix round.
- **Durable Runner** still has a truncation bug and a red sustained-load gate.
- **Service Monitor's** SQLite advisory is waiting on an upstream release.
- **None of the seven new projects is usable yet.** Some are a few hours old.

## Up next

Review and merge the open branches. Then the quiet-machine load runs, Durable Runner's frame-header
fix, Payment Sandbox's checkout and dashboard, and the AI Operations Layer's first real host, which
will be Durable Runner.
