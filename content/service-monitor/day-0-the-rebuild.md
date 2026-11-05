+++
title = "Day 0: the rebuild"
description = "The first monitor's code is gone. This log restarts with a contract-first rebuild — and one rule from the old build that never changed: unknown is a state, not a bug."
date = 2026-11-05T10:00:00Z

[extra]
kind = "experiment"
milestone = "M0"
step = "0.1"
short_title = "The rebuild"
tests = 11

[extra.summary]
goal = "Start over on purpose: the contract as domain types, the plan as docs, the old monitor's lessons kept."
built = "Cargo workspace, incident state machine, SQLite store, management API, CLI, and a dashboard that says 'cannot see' instead of painting a dead server green."
proof = ["11 tests across domain + API, full gate green", "dashboard renders 'cannot see' with the server down, never fabricated rows"]
code = "ab00fbf"
+++

The first Service Monitor's build log is retired. Its code isn't on this machine anymore, so this is a rebuild, not a port — the old entries came down with it, and what stays is the list of things it taught me:

**"Unknown" is a state, not a bug.** A monitor that can't see must never say "down" — and a gap in the record must never be smoothed over.

**One writer owns the truth.** If two things can write, they will disagree at 3 am.

**Bounded everything.** Queues, retries, bodies, pages — every one gets a limit and a deadline.

So the rebuild starts differently: the contract lives in a pure domain crate (no I/O allowed — a script enforces it), the plan lives in `docs/` (nine module docs, each with failure cases and test parameters), and every milestone answers to a roadmap table of outcome / invariant / failure case / acceptance test.

## What I built

The scaffold: `monitor-domain` (monitor types, the outcome model — pass, HTTP fail, transport, timeout are *different* kinds of evidence — and the incident state machine), `monitor-db` (SQLite, WAL, one migration), `monitor-server` (`/livez`, `/readyz`, monitor CRUD, serves the dashboard), a `monitor` CLI, and a SvelteKit + Tailwind + shadcn-svelte dashboard that distinguishes "server unreachable" from "everything is fine".

Eleven tests, the full gate green, and one honest shell.
