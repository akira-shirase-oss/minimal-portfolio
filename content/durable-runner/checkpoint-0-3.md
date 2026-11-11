+++
title = "Checkpoint 0.3: the inspector, and the bug it caught"
description = "GET /jobs + a SvelteKit inspector — and the journaled-refusal bug the first smoke test surfaced."
date = 2026-11-08

[extra]
kind = "experiment"
milestone = "D4"
step = "0.3"
short_title = "The UI catches a journal bug"
series = "durable-runner"
+++

## Where this checkpoint stands

D4 surface work landed: `GET /jobs` list endpoint, a SvelteKit inspector
(`apps/inspector`, static build, served same-origin at `/inspector`), and
a live API drill — submit → two real HTTP steps → `done`, listed with a
real `finished_at`, cancel and refusal paths verified.

## The interesting part: the UI's first smoke test caught a real bug

Submitting a job whose step named an **unregistered** handler exposed a
journal-safety defect, not a UX problem:

1. The executor committed `StepFailed` for a run that was still `Queued` —
   never dispatched.
2. The reducer refused it (`StaleReply`: a reply may only arrive for an
   in-flight attempt) — **after** the record was already appended. A
   committed event that cannot apply poisons the journal: replay must
   reproduce it, and cannot.
3. `apply_committed` then removed the run to fold it and dropped it on
   error — the run silently vanished from the index. List empty, inspect
   404, cancel answering `StaleReply`.

## The fix, and why it's shaped this way

- **`commit` trial-reduces before appending.** The core invariant — every
  committed record has to apply on replay — now holds by construction: a
  refused event never reaches the journal.
- **`apply_committed` uses get/get_mut,** so a refusal can't drop the run.
- **Admission checks the allowlist.** A step naming a handler outside the
  registry is a spec error refused at submit (`UnregisteredHandler` → HTTP
  409), before anything is journaled. The registry is the execution trust
  boundary — a bad handler name is not a runtime condition to retry.
- **A journaled run whose handler leaves the registry later stays
  queued** — registry repair or a cancel resolves it; there is nothing to
  journal because nothing happened.

Regression tests pin both sides: a refused event neither journals nor
loses the run (reopen replays clean), and admission refuses unregistered
handlers with no record created. 24 engine+domain tests green.

**Status: building — D4.** Remaining: a pilot workflow, the load plan
(10→100 submits/s with fsync, replay at 100k transitions, stall/full/
compaction cases), and the second-developer ship gate. The inspector
drill artifacts live in the project history; gate runs per AGENTS.md.
