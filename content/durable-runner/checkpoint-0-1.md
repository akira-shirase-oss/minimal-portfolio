+++
title = "Checkpoint 0.1: the contract and the scaffold"
description = "Guide 04 read end to end: a file journal is the authority, one writer, at-least-once attempts — the workspace, docs and crate skeletons are laid out."
date = 2026-11-08T01:00:00Z

[extra]
kind = "experiment"
milestone = "D0"
step = "0.1"
short_title = "Contract + scaffold"
tests = 0

[extra.summary]
goal = "Turn the guide into a buildable shape: end goal, architecture, roadmap and decisions written down; a compiling workspace to hang the model on."
built = "docs/ (END_GOAL, ARCHITECTURE, ROADMAP, DECISIONS), AGENTS.md, the cargo workspace with durable-domain/-journal/-engine/-server/-cli skeletons."
proof = ["cargo build/fmt/clippy/test clean on the empty scaffold", "zero implementation — honesty about what exists"]
code = "local projects/durable-runner · main @ 280bb75 (remote pending)"
+++

The fourth project guide asks for the background-task handler the earlier
projects kept needing: jobs that survive a restart because **accepting** them
was already a durable commit — not because a queue hoped for the best.

The contract's shape is deliberately opinionated. A **framed append-only
journal** — sequence numbers, checksums, generation manifests — is the only
authority, written by exactly one writer behind an exclusive lock. An
in-memory index is rebuilt at startup and never trusted. Attempts are
**at-least-once** under one business idempotency key; when a handler's reply
vanishes the runner reconciles uncertainty instead of pretending delivery was
exactly-once. Terminal history expires after seven days; live state never
expires.

Four failure cases are required, not aspirational: crash around the
acknowledgment, a handler reply that never arrives, a crash mid-compaction,
and a second writer or full disk — each has a stated correct behavior.

This checkpoint is deliberately boring: the contract distilled into
`docs/END_GOAL.md` (scope, invariants, the failure table, the ship gate),
`ARCHITECTURE.md`, `ROADMAP.md` (D0 model → D1 journal → D2 execute → D3
maintain → D4 ship) and `DECISIONS.md`, plus a cargo workspace that compiles
clean and implements nothing. The first real work is the D0 state machine —
transitions and their refusals, under a fake clock.
