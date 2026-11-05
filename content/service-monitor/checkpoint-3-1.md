+++
title = "Checkpoint 3.1: display, status, and a heartbeat"
description = "Coverage kept apart from success, a public status page that works when the monitor is dead, and browser tests that drive the whole thing."
date = 2026-11-05T21:00:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.1"
short_title = "Display and status"
tests = 71

[extra.summary]
goal = "Two honest numbers (did we look / what did we see), a status page that survives the monitor's death, and proof in a real browser."
built = "GET …/stats (expected/observed/missed/passed, basis-point ratios, null when undefined), a self-expiring status.json snapshot + static page, an independent heartbeat checker, and a 4-spec Playwright suite."
proof = ["24h of misses → 0% coverage, never 'down by silence'; undefined denominators → null", "kill monitor → expired beat → 'monitoring unavailable'; restart → alive", "4/4 browser specs, 71 tests"]
code = "98b605a"
+++

## What I built

**Coverage ≠ success** (`GET /api/monitors/{id}/stats`). Expected slots come from wall-clock × interval — not from stored rows, which is the whole point: a monitor that stored nothing can't claim 100% coverage of nothing. Missed slots never enter the success denominator, and an undefined denominator returns `null`, which the dashboard renders as "no data" — not a guessed percent.

**A public status page that outlives the monitor.** The server rewrites `status.json` every beat (atomic tmp+rename, `SMON_STATUS_DIR`): allowlisted fields only — a hashed service alias, status, incident-open-since. `apps/status/index.html` renders it with zero runtime dependency; `fixtures/status-check.mjs` is the independent checker. The `expires_at` *is* the heartbeat — an expired snapshot means "monitoring unavailable", which is a different sentence than "all targets down". Verified: beat → alive, kill → expired → unavailable, restart → alive.

**The alias bug, found live.** My first alias was an id prefix — and two monitors created milliseconds apart produced the *same* alias, because UUIDv7 leads with its timestamp. The alias is `sha256(id)[:12]` now.

**A browser suite** (`scripts/e2e.sh`): Playwright boots the real server serving the built dashboard, plus the fault fixture. Specs prove the API-abort banner fabricates nothing, a badge turns `up` on committed evidence, a real 3-failure incident renders on the detail page, and the keyboard path works.
