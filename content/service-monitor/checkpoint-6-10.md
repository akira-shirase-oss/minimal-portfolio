+++
title = "Checkpoint 6.10: mutation-tested domain"
description = "cargo-mutants attacked every public function in monitor-domain — the first run missed 5 boundary mutants, three tests closed them, re-run clean at zero missed."
date = 2026-11-06T12:57:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.10"
short_title = "Mutation testing"
tests = 116

[extra.summary]
goal = "Prove the tests test something — mutants must die, not just pass."
built = "cargo mutants -p monitor-domain: 48 mutants. Three boundary tests added for the 5 first-run survivors — interval==MIN accepted, timeout==interval accepted, rebuild_tail returns the larger threshold."
proof = ["re-run: 42 caught, 0 missed, 6 unviable (Default::default() on types that can't implement it — unbuildable, not alive)", "outcome committed to perf/results/"]
code = "akira-shirase-oss/monitoring-service · main @ 78951c2"
+++

Tenth slice.

**Gap:** 100+ hand-written tests had never been attacked. Passing tests prove
code works; they don't prove the tests test.

**What changed:** `cargo mutants -p monitor-domain` — 48 mutants. First run:
**5 missed**, all the same shape — comparisons asserted on the rejection side
but never at the boundary (`interval < MIN` vs `<=`, `timeout > interval` vs
`>=`), and `rebuild_tail`'s return value never asserted at all. Three tests
added: the minimum interval itself is accepted, a timeout equal to the
interval is accepted, and `rebuild_tail` returns the larger threshold.

**Proof:** re-run — 42 caught, **0 missed**, 6 unviable (`Default::default()`
replacements on types that can't implement it — they can't compile, so they're
not alive). The outcome JSON is committed to `perf/results/` — survivors, fix,
and clean re-run are all auditable.

**Lesson:** mutation testing is the only honest answer to "do the tests test
anything?" Every miss was the same shape — assert the boundary itself, not
just the side of it.
