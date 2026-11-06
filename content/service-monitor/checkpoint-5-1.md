+++
title = "Checkpoint 5.1: denied means denied"
description = "Bearer auth on every /api route, compared on SHA-256 digests — and a tokenless public bind refuses to boot before a single task spawns."
date = 2026-11-06T02:00:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.1"
short_title = "Management auth"
tests = 83

[extra.summary]
goal = "Unauthenticated means denied — once enabled, no bypass; and a tokenless public bind refuses to start rather than run open."
built = "SMON_ADMIN_TOKEN Bearer gate on every /api/** route (SHA-256-digest compare, fixed-length, no timing tell); /livez /readyz statics stay open; dashboard TokenGate on 401; CLI --token/SMON_ADMIN_TOKEN; loopback dev mode with a loud warning."
proof = ["auth_denies_without_a_valid_bearer_token: 5 deny shapes + accept + open health", "live: 401/401/200; CLI denied/allowed; tokenless public bind refused before any task spawned"]
code = "akira-shirase-oss/monitoring-service · main @ 20ed829"
+++

M5 is ship — making it operable by someone who isn't me. Four steps, starting
with the front door.

**What changed:** `SMON_ADMIN_TOKEN` turns on `Authorization: Bearer` for
every `/api/**` route — compared on SHA-256 digests so the check is
fixed-length, no early-exit timing tell. Health endpoints and static files
stay open (a token gate has to load to hold a token). With no token, loopback
boots with a loud warning — dev mode — but a public bind refuses *before a
single task spawns*.

**A real bug caught by the live check:** I initially ran the tokenless-bind
refusal *after* the coordinator started, and the refuse log showed
"coordinator stopped" first. Moved it earlier — a refused boot now starts
nothing.

**Proof:** `auth_denies_without_a_valid_bearer_token` (5 deny shapes + the
accept path + open health) and live — 401/401/200, CLI denied and allowed,
boot refused cleanly.
