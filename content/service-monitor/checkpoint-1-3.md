+++
title = "Checkpoint 1.3: one writer, one transaction"
description = "Check row + incident transition + outbox event commit together — the in-memory machine only advances after the commit lands, and a missed slot is a stored row, not an absence."
date = 2026-11-05T12:20:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.3"
short_title = "Single writer"
tests = 31

[extra.summary]
goal = "Observations land transactionally — check + incident transition + outbox event in one commit."
built = "A single writer task committing each slot's evidence atomically; the in-memory Health machine advances only after the commit lands. Missed slots are stored rows (D-007), not absences."
proof = ["transaction + drop tests in tests/store.rs", "writer dies → pending results dropped, the coverage gap stays visible"]
code = "akira-shirase-oss/monitoring-service · main @ bf13126"
+++

**What changed:** a single writer task owns all mutation. Check row + incident
transition + outbox event commit in one transaction — there is no state the
system can be in where a check landed but its incident didn't, or an incident
opened but its alert event was never queued. The in-memory `Health` machine
advances only after the commit lands, so if the writer dies, pending results
are dropped and the gap they leave is *visible* as missed coverage — not
relabelled as success.

**The surprise (D-007):** I first modeled a missed slot as the *absence* of a
row. But restart rebuilds state by replaying stored checks — and an absent row
replays as consecutive failures, fabricating an incident that never happened.
Missed slots are stored rows now. Recording the negative space is part of the
record.

**Proof:** transaction and drop tests in `tests/store.rs`.
