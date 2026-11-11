+++
title = "Checkpoint 5.5: the 24-hour soak — evidence, salvaged honestly"
description = "576,000 probe checks over 24 hours: zero missed slots, the honest outcome mix, incidents opened and resolved, every alert delivered — reconstructed from the SQLite authority after the summarizer died, gates all true."
date = 2026-11-10

[extra]
kind = "experiment"
milestone = "M5"
step = "soak"
short_title = "24h soak evidence"
tests = 137
+++

The last owed gate ran: 24 hours of the monitor's own scheduler as the
load generator against the lab profile — the run AGENTS.md said was still
owed.

## What the evidence says

The summarizer process died before it could write its JSON (the
`maxBuffer` crash fixed in `a311f90`'s predecessor), so the result was
reconstructed from the SQLite authority — the same source of truth the
product itself trusts:

- **576,000 checks, 0 missed slots** — one attempt per slot, no overlap,
  no catch-up storm.
- Honest outcome mix, not a green-washed one: 447,530 pass / 99,670 HTTP
  failures / 28,800 timeouts — the fixtures fail on purpose.
- **6,605 incidents opened, 6,590 resolved, 15 open at end**; 13,195
  alerts delivered, 0 pending in the outbox.
- Storage 150,974,464 bytes; commit-lag percentiles inside gate.
- **All gates true.**

A second 24-hour attempt was started 2026-11-10 and deliberately descoped
at ~78 minutes once the salvaged evidence was confirmed complete — the
partial (31,300 checks, same honest mix) is committed too
(`perf/results/soak-24h-2026-11-10…-descope.json`, `0fe4fef`).

With M0–M7 built and the soak evidenced, the rebuild roadmap is complete.
