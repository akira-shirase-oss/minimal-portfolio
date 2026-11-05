+++
title = "Checkpoint 1.1: the observing loop"
description = "Real probes on a bounded schedule, one writer committing each slot's evidence — and the thing that surprised me: a missed slot is data too."
date = 2026-11-05T12:00:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.1"
short_title = "The observing loop"
tests = 31

[extra.summary]
goal = "Check on a schedule, remember everything, and let a restart lose nothing."
built = "Probe engine (one GET, whole-attempt deadline, 64 KiB body bound, classified outcomes), a coordinator that counts missed slots instead of queueing, and a single writer that commits check + incident + outbox in one transaction."
proof = ["incident opened after 3 real failures, survived a server kill mid-incident, resolved after 2 fresh passes", "31 tests, gate green", "SQLite + in-memory test gotcha found and documented"]
code = "bf13126"
+++

The scaffold could create monitors but couldn't see anything. This step gives it eyes and a memory.

## What I built

**A probe engine with a budget.** One GET, a whole-attempt deadline, and the response body is read with a 64 KiB bound — a misbehaving target can't eat memory by streaming forever. Redirects aren't followed; a 3xx is recorded as evidence, not chased (the DNS-level hardening is M5's, and the docs say so).

**A coordinator that refuses to queue.** Every monitor gets a slot on the interval grid. Concurrency bounds — 20 global, 2 per origin, 1 per monitor — are `try_acquire`, so when a probe is still running at the next tick, that slot is recorded as `missed`, never parked for later. A monitor under pressure degrades honestly instead of stampeding the target when it recovers.

**One writer, one transaction.** Check row + incident transition + outbox event commit together; the in-memory `Health` machine only advances after the commit lands. Status the API serves comes from the committed map — an unwritten result can never show up green.

**The surprise (D-007):** I first modeled a missed slot as the *absence* of a row. But restart rebuilds state by replaying stored checks — and an absent row replays as consecutive failures, fabricating an incident that never happened. Missed slots are stored rows now. Recording the negative space is part of the record.

## Proof

Live: fixture monitor went `up` → I killed the target → three `transport` checks → incident open + outbox event in one commit → **killed the server mid-incident → still `down` after restart** → target back → two fresh passes → resolved. Thirty-one tests, gate green.
