+++
title = "Checkpoint 1.1: the probe engine"
description = "One GET with a whole-attempt deadline and a 64 KiB body bound — a probe returns a classified CheckOutcome, and a hung target reads 'timeout', never a stalled worker."
date = 2026-11-05T12:00:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.1"
short_title = "Probe engine"
tests = 31

[extra.summary]
goal = "A probe that returns a classified CheckOutcome — with the deadline and the body bound as hard limits, and target policy enforced before connecting."
built = "reqwest-based probe: one GET, a whole-attempt deadline, response body read with a 64 KiB bound, outcomes classified (pass/http_fail/transport), URL-layer target policy; redirects not followed — a 3xx is evidence."
proof = ["7 fixture tests in tests/probe.rs", "hung target → timeout, not a stalled worker"]
code = "akira-shirase-oss/monitoring-service · main @ bf13126"
+++

M1 turns the scaffold into a monitor that can actually *see*. This is the first
of its five steps — the observing loop, built contract-first so no step gets to
fake the previous one.

**What changed:** the probe engine. One GET, a whole-attempt deadline — not a
per-phase timeout that a slow DNS plus a slow read could stretch into minutes —
and the response body is read with a 64 KiB bound, so a misbehaving target
can't eat memory by streaming forever. Redirects aren't followed; a 3xx is
recorded as evidence, not chased (the DNS-level hardening for following them
safely is M5's, and the docs said so from the start). Outcomes classify into
`pass` / `http_fail` / `transport` — the committed vocabulary the whole system
speaks.

**Proof:** 7 fixture tests in `tests/probe.rs` — including the case that
matters most: a hung target must read `timeout`, not silently hold a worker.
