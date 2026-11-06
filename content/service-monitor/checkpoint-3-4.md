+++
title = "Checkpoint 3.4: proof in a real browser"
description = "Playwright boots the real server and fixture — the abort banner fabricates nothing, a badge turns up on committed evidence, a real incident renders, keyboard nav works."
date = 2026-11-05T21:30:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.4"
short_title = "Browser suite"
tests = 71

[extra.summary]
goal = "The honest-states claims get exercised end to end — by a browser, against the real server and a real database."
built = "apps/dashboard/tests/dashboard.spec.ts driven by scripts/e2e.sh: Playwright runs the real monitor-server serving the built dashboard plus the fault fixture on e2e-only ports."
proof = ["4 specs: aborted API renders 'cannot see' with no fabricated rows; badge turns up on committed evidence; a real 3-failure sequence opens an incident the detail page shows; keyboard navigation reaches the detail route"]
code = "akira-shirase-oss/monitoring-service · main @ 98b605a"
+++

**What changed:** `scripts/e2e.sh` drives Playwright against the real
`monitor-server` — serving the built dashboard on its own origin — plus the
fault fixture on e2e-only ports. No mocks: the specs exercise the same build
that ships.

**Proof — 4 specs:** an aborted API renders "cannot see" with **no fabricated
rows**; a registered monitor's badge turns `up` on committed evidence (not on
a timer); a real 3-failure sequence opens an incident the detail page shows —
checks strip, "still open", the coverage-vs-success line; and keyboard
navigation reaches the detail route.
