+++
title = "Checkpoint P7: a gap review, a security branch, and a CI that still isn't green"
description = "An outside gap review found 56 gaps in Colophon, 14 of them High. Repairs got main's Rust job green after nearly two weeks red, though its testbed still failed one flaky spec. Eleven security fixes, each with a test that failed before it, sit on a pushed branch whose CI has failed on every push. Its independent review says fix first: two new High-severity issues in the fixes. I'll describe the security details once the fixes are merged."
date = 2026-11-16T20:50:00-05:00

[extra]
kind = "failure"
milestone = "P7"
step = "security"
short_title = "Gap review and the security branch"
# Rust tests at main 94e63c0, including the stack tests, from the gap review's gate runs (up to the testbed).
tests = 770

[extra.summary]
goal = "Find what a careful attacker or an unlucky operator would hit first, fix the worst of it with a failing test for each, and get main's own checks running again."
built = "On main: the CI and testbed fixes, a cache-tag fix for hyphenated collections, and the Studio's first-run work. On a branch: eleven security fixes, npm advisory bumps and an MIT licence, described here once they merge."
proof = ["770 Rust tests green on main in three gate runs, up to the testbed", "main's CI at 94e63c0 still failed: testbed 52 of 53, one flaky spec", "11 code fixes on the branch, each with a test that failed first, plus npm bumps and the licence", "the branch's CI failed on every push, from two code failures being fixed", "branch review: fix first, two new High-severity issues in the fixes", "load smokes only, on a busy machine, and three of them missed"]
code = "akira-shirase-oss/colophon-cms · main @ 94e63c0 (fixes on fix/security-2026-11-16 @ cf26b95)"
+++

A test suite nobody reads is a decoration. I had one of those, and didn't know it.

Today an outside gap review read the whole project the way an attacker would. It found 56 gaps: 14
High, 38 Medium, 4 Low. This entry is what happened next, including the part where my own checks
turned out to have been quietly not running.

## What I built

**On `main`**, mostly repairs to the checks themselves:

- **The Rust job is green again.** Three database locale tests were missing the marker that keeps
  them out of the plain test job, which had failed `main`'s Rust job on every run since 2026-11-04.
  The SDK's generated API types were stale against the API document, and a ShellCheck directive
  covered the wrong line. All three are fixed.
- **The testbed runs again, and isn't green.** The integration job had skipped the testbed on every
  run since at least 2026-11-05, because an earlier step failed first. Running it found 7 failing
  tests across the 53 specs, all inherited: the Load tests page crashed on old failover entries with
  no latency field, one spec expected the old sign-in subject, one looked for a screen CI doesn't
  serve. Five of the seven are fixed, across four spec files. `main`'s CI run at `94e63c0` still
  failed: 52 of 53 specs passed, and the one that didn't is a known flake.
- **A cache-tag bug.** Collections with a hyphen in their name got no cache tag, so a purge could miss
  their list pages for up to 30 seconds.
- **The Studio's first-run work landed** (D-147): a setup link that fills in the setup code, an
  installation endpoint, clearer builder, roles and invite screens, and no text smaller than 14 px.

**On a branch, `fix/security-2026-11-16`**, pushed but not merged: eleven security fixes for the gap
review's findings, each with a test that fails without it, plus four npm advisory bumps and an MIT
licence. The gap review's security findings are unfixed on `main`, so I'm not describing them here.
Each one will get its write-up once its fix is merged.

One fix I can describe, because it isn't a security hole: the database driver is now built with TLS,
so managed Postgres can be reached. The test proves only that it asks the server for TLS; a real
connection to a managed Postgres such as Neon, and full certificate checking, are still unverified.

## How it works (the short version)

Every finding goes through the same loop. The fix lands on a short branch with a regression test, and
the test has to fail on the commit before the fix, otherwise it isn't proving anything. Then the full
gate runs, then an independent reviewer replays each test on its parent commit and attacks the fixed
code, and only then does the branch merge. Security details are published after the merge, not
before.

## Does it actually work?

- **`main` passes up to the testbed.** The review ran the gate three times at `94e63c0`: 770 Rust
  tests including the database stack tests, formatting, lints, architecture, typography, the
  simulator, the dependency audit, ShellCheck, the SDK, and 102 Studio browser tests all passed. The
  testbed then stopped the gate each time, so the Studio script and the load smokes never ran.
- **The testbed isn't green.** The last run had 1 of 53 specs failing. Three specs pass alone but can
  fail right after the outage spec, which kills the database's connections. That flake is still open,
  and it's why `main`'s own CI run failed.
- **Every code fix on the branch has a test that failed first.** The reviewer replayed each one on its
  parent commit, and each failed there.
- **Load numbers are smokes, on a busy machine, and several missed.** On the branch, the session
  scenario's p99 was 58 ms on one run and 347 ms on another, a miss against its 200 ms gate,
  at load averages of 43 to 53. The audience run missed by a hair (p99 704 ms against 700). A
  10,000-request members run had zero failed requests, but its p99 was 1,176 ms against a 700 ms gate
  at load averages of 58 to 72: a miss. The assets run missed too, at 1.13 s against 500 ms. These
  live in commit messages only, marked for a re-run on a quiet machine.
- **The branch's CI has failed on every push.** It ran on all 13 pushes: 9 failed, 4 were cancelled,
  none passed. Two code failures, both being fixed: the npm packaging test didn't expect the new
  `LICENSE` file in the package, and a rate-limit stack test got a 200 where it expected a 429.

## Where I messed up

- **I trusted a CI I wasn't reading.** `main`'s Rust job had failed on every run since 2026-11-04, and
  the testbed hadn't run since at least the 5th. Twelve days of "it's in CI" meant nothing. Every
  `main` run since 2026-11-05 has failed, including today's.
- **"Done" ran ahead of the code.** The review found the docs claiming things the code doesn't do,
  including a "Cloudflare CDN adapter" that doesn't exist and an agents file saying every milestone was
  built while roadmap rows were still open.
- **A decision number collided.** The Studio branch's D-082 had already been used on `main`; it's
  D-147 now.
- **The CI load smoke was too heavy.** At 400 requests a second a GitHub runner fell behind (p99
  1.47 s, 224 iterations dropped), so it now runs at 300, marked provisional.
- **I merged before the flake was fixed.** The review said fix the testbed flake first; `main` was
  fast-forwarded with it still open.

## What it doesn't do yet

- **The security fixes aren't on `main`, and the branch's review says fix first.** Ten of the eleven
  fixes close the path they were written for, and every test the reviewer replayed on its parent
  commit fails there. The independent review found two new High-severity issues in the fixes; they're
  being fixed, and I'll describe them here once the fix is merged.
- **Other High gaps still open:** a restore doesn't change delivery job keys, there's no real CDN
  adapter, and media isn't backed up or restorable to a point in time. Product gaps too: draft
  preview, image references in rich text that can point at missing files, release archives without
  the Studio, no Markdown import, and no password reset or email verification for SaaS accounts.
- **Some security findings, High and Medium, are still open on `main`** beyond the branch's eleven.
  They'll be described here once they're fixed.
- **Evidence owed:** the load smokes and the owed L-case runs on a quiet machine, a passing 24-hour
  soak, the usability sessions and an independent install, all before version 0.1.

The landing page is a separate repository, and it's live as a preview at
[colophon-landing.pages.dev](https://colophon-landing.pages.dev); its own domain isn't attached yet.
An independent fact-check of its 14 blog posts went from "deploy after fixes" to "deploy as is", and
the five Low items it left were fixed the same evening.

## Up next

Fix the review's two new Highs and get the branch's CI green, then a second review and the merge. Then the testbed
flake, the load smokes and L-case runs on a quiet machine, and the 24-hour soak before 0.1.
