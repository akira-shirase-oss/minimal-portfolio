+++
title = "Checkpoint 3.2: a status page that outlives the monitor"
description = "status.json rewritten every beat — atomic, allowlisted fields only, self-expiring — rendered by a static page with zero runtime dependency on the monitor."
date = 2026-11-05T21:10:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.2"
short_title = "Public status snapshot"
tests = 71

[extra.summary]
goal = "A public status artifact that keeps answering after the monitor dies — sanitized, self-expiring, hostable anywhere."
built = "status.json rewritten every SMON_STATUS_INTERVAL_S (atomic tmp+rename): sha256 service alias, status, incident_open_since only; TTL declared in-file; apps/status/index.html static renderer."
proof = ["allowlist/TTL unit tests + writer-beats-file test", "the alias bug found live: UUIDv7 prefixes collide — aliases now sha256(id)[:12]"]
code = "akira-shirase-oss/monitoring-service · main @ 570259a"
+++

**What changed:** the server rewrites `status.json` every beat into
`SMON_STATUS_DIR` — atomic tmp+rename, so a reader never sees a torn file.
Allowlisted fields only: a hashed service alias, the status, the incident-open
time — nothing a management viewer would see and a public viewer shouldn't.
`apps/status/index.html` renders it with zero runtime dependency: copy the two
files to any host and the status page outlives the monitor itself.

**The alias bug, found live:** my first alias was an id prefix — and two
monitors created milliseconds apart produced the *same* alias, because UUIDv7
leads with its timestamp. Aliases are `sha256(id)[:12]` now: stable, opaque,
uniformly spread.

**Proof:** allowlist and TTL unit tests plus the writer-beats-file test — the
snapshot's schema is the contract, pinned by test.
