+++
title = "B0: the memo, corrected and accepted, and passwords in a log"
description = "The rest of the B0 fix round landed: the duplicate paths are drilled in every provider mode, and a new log-capture check caught the bootstrap tool writing both database role passwords into its log on its first run. The memo is accepted with seven corrections, and the next step is a copy-and-own starter template, not a platform."
date = 2026-11-17T00:05:00-05:00

[extra]
kind = "release"
milestone = "B0"
step = "accepted"
short_title = "Memo accepted, with corrections"
# Tests in CI at e5fa6e4: 65 in the workspace run plus 3 in the kill drill.
tests = 68

[extra.summary]
goal = "Finish the review's fixes, correct the memo, and make the starter-or-platform decision."
built = "A late-create fault and a re-check of every create by name, a log-capture check over every test and drill, an in-flight limit proven against the pool, drills against providers that refuse taken names, a concurrency drill, pin checks proven able to fail, and D-036 accepting the corrected memo."
proof = ["10,000 fault schedules per provider mode: 0 orphans in every mode, 0 duplicates with unique names or idempotency keys", "with neither, 1,387 duplicates from late creates, every one reported", "the log check caught both role passwords in the bootstrap log", "68 tests green in CI", "no re-review of the fixes yet"]
code = "akira-shirase-oss/backend-platform · main @ e5fa6e4"
+++

A smoke detector that's never been near smoke is a guess. My new log check found smoke on its first
run.

## What I built

- **The late-create path is drilled.** The fake provider can now apply a create *after* reporting a
  timeout, the way real providers sometimes do. Every create, and every adoption after an unknown
  outcome, is re-checked by name, and a second holder of the same name blocks as a duplicate instead of
  being adopted.
- **The log-capture check** runs over the API tests (success, refusal, a dead database), the in-process
  drill in every provider mode, the pause drill, and every kill-drill worker's output. It captures at the
  most verbose level, database driver included.
- **The limits are tested.** The in-flight limit is proven to be at most four times the connection pool,
  and a full server refuses at once with 503 and `Retry-After`.
- **The adopt path is exercised.** The drills also run against a provider that refuses taken names, so
  "already exists, look it up, adopt it" is tested.
- **A concurrency drill**: 3 workers with 4 tasks each, 40 projects with 3 operations, 3 ms of provider
  latency and 8% faults. It fails if the per-project claim order is removed.
- **The pin check is proven able to fail** on an unpinned image and on an unpinned action, each on its
  own, in CI and in the local gate.
- **D-036 accepts the memo with corrections**, and `docs/STARTER_TEMPLATE.md` describes what comes next.

## How it works (the short version)

There are three ways a provider can behave, and the reconciler is drilled against all three. With unique
names, a retry gets "already exists" and adopts the existing resource. With idempotency keys, a late
create is replayed by its key. With neither, a duplicate can't be prevented, only seen, so every one has
to be reported.

## Does it actually work?

- **10,000 fault schedules per provider mode:**

| provider mode | duplicates | orphans |
|---|---:|---:|
| unique names (1,388 "already exists" answers, resolved by adoption) | 0 | 0 |
| idempotency keys (1,386 late creates replayed by key) | 0 | 0 |
| neither | 1,387, all reported, none silent | 0 |

  Those totals are recorded in the memo; there's no committed run record with machine and load for them.
- **The process-level drill** runs 32 kill cases and 50 provider-fault cases.
- **Tests.** 68 in CI (65 in the workspace run, 3 in the kill drill), up from 57, and CI is green at
  `e5fa6e4`.

## Where I messed up

**The bootstrap tool logged both database role passwords.** The database driver logs statements at
debug level, and as a warning for any statement over a second, so the password-setting statements went
into the log. The new check caught it on its first run. That connection now logs no statements. The
check itself missed tests run in parallel at first; that's fixed too.

**The memo needed seven corrections**, now made and accepted:

- The accounts kit is back in the template option.
- The products are *planned* for small servers, not running there.
- The operations material is about 3,200 lines, and little of it is duplication.
- The smoke figures are scenario-only, with every missed threshold listed.
- The strongest case for a platform now includes a run-to-completion reconciler CLI and adopting an
  existing tool.
- One threat row and the threat count are corrected.
- "0 duplicates" is scoped per provider mode.

## What it doesn't do yet

- **The starter template is planned, not built.** It's eleven parts: a copy-and-own accounts kit, the
  host layer, configuration and secrets, releases, a health contract, restore drills, an upgrade
  rehearsal, a CI and evidence kit, an observability minimum, upkeep, and acceptance. Acceptance means
  Durable Runner adopts it on a fresh small server, faster than a timed hand-built baseline.
- **Everything past that stays parked.** No shared service and no shared login.
- **No one has re-reviewed the fixes.** The review predates every fix commit.
- A quiet-machine 100,000-request smoke and the 1,000,000-request run are owed, and two older figures on
  `main` still need updating.

## Up next

B1-T: the starter template.
