+++
title = "Checkpoint 6.6: auto-refresh"
description = "Both pages poll invalidateAll on the 15-second tick — atomic data swaps with no stale-green flash, and a mid-poll outage honestly resolves to 'cannot see'."
date = 2026-11-06T12:45:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.6"
short_title = "Auto-refresh"
tests = 101

[extra.summary]
goal = "Fresh evidence without a reload — and without ever painting stale data over new uncertainty."
built = "invalidateAll() on the 15 s minimum tick, guarded by tab visibility; SvelteKit keeps the last data until the new load resolves, so the swap is atomic."
proof = ["a monitor created mid-session appears without navigation", "a route-aborted API mid-poll shows 'cannot see' on the next tick"]
code = "akira-shirase-oss/monitoring-service · main @ 7fc8200"
+++

Sixth slice.

**Gap:** data loaded per navigation; you reloaded to see a new check.

**What changed:** both pages call `invalidateAll()` on the 15-second minimum
tick — the same floor the scheduler uses — guarded by tab visibility so a
hidden tab polls nothing. The honesty property is in SvelteKit's semantics: the
old `data` stays until the new load resolves, so the swap is atomic — no
stale-green flash — and if the API dies mid-poll the load honestly resolves to
"cannot see", not a frozen board.

**Proof:** a monitor created through the API mid-session appears on the list
without navigation; a route-aborted API mid-poll shows the unreachable banner
on the next tick rather than clinging to the last good data.
