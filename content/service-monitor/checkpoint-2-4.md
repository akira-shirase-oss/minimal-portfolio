+++
title = "Checkpoint 2.4: a fault server that fails on command"
description = "ok/fail/slow/hang/status/flaky targets plus a /sink webhook receiver with a hang mode — none of the honest-states claims are provable without worst-case fixtures."
date = 2026-11-05T16:30:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.4"
short_title = "Fault fixtures"
tests = 61

[extra.summary]
goal = "Targets that fail on command — every 'what happens when' claim in this log needs a fixture that makes it happen."
built = "fixtures/fault-server.mjs: deterministic ok/fail/slow/hang/status/flaky endpoints, plus a /sink webhook receiver with a /sink/hang mode for the worst case."
proof = ["live: flaky cycling opened and resolved incidents; /sink/hang isolated delivery slots from probe slots", "noted: transparent HTTP retries mean wire-requests ≠ checks-per-slot — harmless for GET-only evidence"]
code = "akira-shirase-oss/monitoring-service · main @ eec162a"
+++

**What changed:** `fixtures/fault-server.mjs` — deterministic endpoints for
ok, fail, slow, hang, status, and flaky, plus a `/sink` webhook receiver with
a `/sink/hang` mode for the worst case. None of this milestone's claims are
provable without targets that fail on command — the fixture is what turns
"should handle it" into "watched it happen".

**A finding worth keeping:** HTTP clients may transparently retry idempotent
requests on stale keep-alive connections — so the fixture consumes a phase
per *request on the wire*, which need not equal checks-per-slot. Harmless
here (GET-only, the observation is the last response) but worth remembering if
a fixture ever counts hits.
