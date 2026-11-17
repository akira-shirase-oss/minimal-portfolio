+++
title = "Fixes need a second reader. Some of mine are still waiting."
description = "One day: an outside gap review of the five built projects, fix rounds checked by reviewers who didn't write them, seven planned projects starting code, and decisions on eight new briefs. Plus an honest list of the fixes nobody has re-checked yet."
date = 2026-11-16T23:59:00-05:00

[extra]
kind = "experiment"
+++

Proofreading your own writing doesn't work. You read what you meant to write, not what's on the page.
Code is the same.

So today's rule was that a fix isn't finished until a second reviewer, one who didn't write it, has
attacked it on the real binaries. Most rounds got that. Some are still in the queue, and this post
says which.

## What I built

**A gap review of the five built projects.** An outside review read Colophon, Service Monitor,
Durable Runner, jsrt and MiniBTC against their own contracts, the way an attacker or an unlucky
operator would. It found 151 gaps, 50 of them High. Three patterns ran through all of them: gates that
only run by hand drift, "done" claims run ahead of the code, and the million-request rule wasn't met
everywhere it applies.

**Fix rounds, with a review after each.** jsrt, Service Monitor and MiniBTC went through four reviewed
rounds and Durable Runner through three. Colophon's fixes are on one branch. Each has its own
build-log entry: [Colophon](@/colophon/checkpoint-p7-security.md),
[Service Monitor](@/service-monitor/checkpoint-h-1.md),
[Durable Runner](@/durable-runner/checkpoint-0-6.md), [jsrt](@/js-runtime/checkpoint-h-1.md) and
[MiniBTC](@/minibtc/checkpoint-h-1.md).

**Seven planned projects started code**, each in its own public repository, each with a first
build-log entry:

- [Payment Sandbox](@/payment-sandbox/_index.md): simulated money, real double-entry accounting.
- [AI Operations Layer](@/ai-operations-layer/_index.md): a timeline that shows missing events as gaps.
- [Personal Voice Agent](@/personal-voice-agent/_index.md): an on-device assistant that can't act in
  your name.
- [Intent Studio](@/intent-studio/_index.md): client brief to published website, starting with a
  contact form that kept every lead in its drills.
- [Accounting Reconciliation](@/accounting-reconciliation/_index.md): every bank line matched,
  excluded or explained.
- [Native Workspace](@/native-workspace/_index.md): an optional, read-only Mac workbench.
- [Backend Platform](@/backend-platform/_index.md): parked, and its own first memo says keep it that
  way.

**Decisions on eight new project briefs.** Each one became a project, was set to fold into an existing
one, or was set aside, with the reason written down. None of the three folds is in its project's
public roadmap yet:

| Brief | Decision | Why |
|---|---|---|
| AI accounting reconciliation | **Promoted** to its own project | Deterministic matching for the bulk, a model only for the ambiguous rest, every decision explained. It fits "proof over breadth". |
| Payment rails for AI agents (HTTP 402) | **Decided to fold into** Payment Sandbox as a later milestone | Pay-then-retry with per-agent caps and allowlists, over simulated money only. |
| Scheduling with deposits | **Decided to fold into** Intent Studio | Bookings for the pilot businesses, with deposits on Payment Sandbox's simulated money. |
| Meeting notes to a CRM | **Decided to fold into** Personal Voice Agent's later plan | Summaries stay drafts, nothing reaches a CRM without approval, and recording consent comes first. |
| Niche prediction market | **Parked** | Real-money markets are gambling or derivatives law, and a play-money version proves little new. |
| AI DeFi yield optimizer | **Dropped** | It moves real funds. Everything here uses simulated money. |
| Tokenized private credit | **Dropped** | A securities offering almost everywhere, and the hard part can't be proven by code. |
| AI content repurposing | **Dropped** | A crowded market, and nothing to prove that Colophon and Intent Studio don't already. |

And a [progress page](@/progress/_index.md) that lists every project's stage, latest review verdict,
what's owed and what's next, with the time it was checked.

## How it works (the short version)

The loop is the same for every project:

1. A reviewer reads the code like an attacker and writes each finding down with a severity and the
   evidence.
2. A fixer works on a short branch. Every fix comes with a test that fails without it.
3. The full gate runs, and its exit code is read directly.
4. The branch merges, and a second reviewer reads the merged code and re-runs the attacks, live.
5. Repeat until the reviewer says ship.

Step 4 is the one that matters. Without it, a fix is just a change nobody checked.

## Does it actually work?

For the built projects, here's where the reviewed rounds ended. Test counts are from the reviewers'
own gate runs.

| Project | Reviewed rounds | Tests | Last review |
|---|---:|---:|---|
| jsrt | 4 | 84 → 130 | ship, 3 Low items left |
| Service Monitor | 4 | 137 → 215 | ship, 1 Medium and 4 Low items left |
| MiniBTC | 4 | 167 → 249 | the fixes hold live, 1 Medium and 1 Low left |
| Durable Runner | 3 | 26 → 96 | no acknowledged job lost, an older High found |
| Colophon | 1, on a branch | 770 on `main` | fix first: 10 of 11 fixes hold, 2 opened new Highs |

Durable Runner's reviewers killed it with `kill -9` in 142 rounds across three passes, and not one
acknowledged job was lost. MiniBTC's node that got stuck at block 128 now catches up 1,000 blocks in
17 seconds.

The new projects with code got first reviews. Payment Sandbox's five accounting Highs and the AI
Operations Layer's six Highs were fixed on `main` the same evening. The Voice Agent's seventeen fixes
merged, and its second review said fix first again: the crash, microphone and full-disk Highs are
closed, and the rest is being fixed in a second round. Backend Platform's review accepted its memo with corrections and sent
the spine back. Intent Studio's first review found no lost, duplicated or falsely acknowledged lead,
and still said fix first, for three issues that are being fixed.

## Where I messed up

The reviewers kept finding bugs that my fixes had created:

- **jsrt:** a request queue where 64 slow clients could hold every slot, then a byte budget for
  uploads that deadlocked.
- **Service Monitor:** a refusal recorded so that it never paged anyone, and a disk cap that left a
  full store unable to free space. Its restart limits would also have turned one slow boot into a
  permanently failed service, by the reviewer's reading of the unit file; there was no Linux host to
  run it on.
- **Durable Runner:** a clean-up that could delete the live journal, and an hourly default that stalled
  submits for over 6 seconds.
- **MiniBTC:** a reindex that failed at random, then a bounded header table that left any node more
  than 128 blocks behind stuck forever.
- **Colophon:** its branch review found two new High-severity issues in the fixes. They're being
  fixed, and I'll describe them in its build log once the fix is merged.

The new projects' first reviews found their own: ways to bend Payment Sandbox's books, AI Operations
Layer timelines that looked more certain than their evidence, and a Voice Agent microphone that kept
recording after push-to-talk ended.

One fix went out with the gate red, because the command that pushed it didn't stop on the gate's exit
status. The rule now is plain: read the exit code itself, never through a pipe or a filter.

And the oldest one: Colophon's CI had failed on `main` on every run since 2026-11-04. Today's repairs
got its Rust job green, but the `main` run still failed in the testbed, 52 of 53, on a flaky spec.

## What it doesn't do yet

The fixes still waiting for their second reader:

- **Colophon's security branch.** Its review said fix first, and its CI has failed on every push, from
  two code failures being fixed: a packaging test that didn't expect the new licence file, and a
  rate-limit test that got a 200 where it expected a 429.
- **jsrt's verification round**, merged with CI. Its first Linux run failed and was fixed; the review
  is running.
- **Service Monitor's and Durable Runner's late rounds**, both merged tonight without a review yet.
- **Payment Sandbox's, the AI Operations Layer's and Backend Platform's fix rounds**, and the Voice
  Agent's second round, which is still being written.
- **MiniBTC's fixes for its last Medium and Low**, which are on a branch that isn't pushed.
- **Intent Studio's fixes** for its first review, and **Native Workspace's first milestone**, built and
  under its first independent review.

And the evidence still owed:

- **No full load runs today.** The machine was shared by a dozen builds and reviews, with load
  averages mostly in the tens and sometimes in the hundreds, and the rule for a full run is below
  about 6. Every project owes its million-request runs, with machine and commit recorded.
- **Service Monitor's** SQLite advisory is waiting on an upstream release.
- **None of the seven new projects is usable yet.** Some are a few hours old.

## Up next

The waiting reviews first, then the quiet-machine load runs, Payment Sandbox's checkout and
dashboard, and the AI Operations Layer's first real host, which will be Durable Runner.
