+++
title = "Checkpoint 3.3: the heartbeat — 'unavailable' is not 'down'"
description = "expires_at is the heartbeat: an independent checker reads it, so a dead monitor reads 'monitoring unavailable' — a different sentence than 'all targets down'."
date = 2026-11-05T21:20:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.3"
short_title = "Independent heartbeat"
tests = 71

[extra.summary]
goal = "The status page can say 'monitoring unavailable' — and must never confuse it with 'targets down'."
built = "expires_at in every snapshot (SMON_STATUS_TTL_S, default 90 s); fixtures/status-check.mjs is the independent checker deciding alive/unavailable from the TTL alone."
proof = ["verified live: beat → alive, kill → expired beat → unavailable (exit 1), restart → alive", "a monitor host that stops heartbeating degrades to 'unavailable', never fabricates 'all down'"]
code = "akira-shirase-oss/monitoring-service · main @ 570259a"
+++

**What changed:** every snapshot carries `expires_at` — the TTL *is* the
heartbeat. `fixtures/status-check.mjs` is the independent checker: it decides
alive vs unavailable from the expiry alone, with no trust in the monitor's own
report. An expired or missing snapshot reads "**monitoring unavailable**" —
which is a different sentence than "all targets down", and confusing the two
is how status pages lie during their own outage.

**Proof — live:** beat → alive; killed the monitor → the beat expired →
unavailable (exit 1); restarted → alive. The whole lifecycle exercised, not
simulated.
