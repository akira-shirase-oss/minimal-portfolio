+++
title = "Checkpoint 6.7: public status, inside the app"
description = "GET /status.json serves the sanitized artifact unmodified — outside /api, no token — and /status renders it; stale or missing reads 'monitoring unavailable', never fabricated rows."
date = 2026-11-06T12:48:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.7"
short_title = "Status in-app"
tests = 101

[extra.summary]
goal = "Public viewers see the sanitized snapshot without ever touching management APIs."
built = "GET /status.json mounted outside /api (no token) serving the same file the snapshot writer produces — hashed aliases, self-expiring — plus a /status page that renders it."
proof = ["three Playwright specs: live snapshot, stale doctor, missing file — the last two read 'monitoring unavailable', never 'all down'"]
code = "akira-shirase-oss/monitoring-service · main @ dcd2ac2"
+++

Seventh slice.

**Gap:** the sanitized status existed only as the separate static app; inside
the dashboard there was nothing for a viewer without the token.

**What changed:** `GET /status.json` serves the same sanitized artifact
unmodified — mounted outside `/api`, no token, hashed service aliases — and
`/status` renders it in the app's own components. The expiry contract is
preserved end-to-end: stale or missing reads "monitoring unavailable" with the
last-seen evidence, never fabricated rows and never "all down". The artifact
IS the contract — the page doesn't re-derive status from management data.

**Proof:** three Playwright specs — a live snapshot renders its rows, the
stale-doctor fixture flips the verdict to "monitoring unavailable" while rows
stay as stale evidence, and a missing file yields the same verdict with no
rows at all.
