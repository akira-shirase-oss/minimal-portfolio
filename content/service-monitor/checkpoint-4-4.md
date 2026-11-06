+++
title = "Checkpoint 4.4: deploy off the target host"
description = "Versioned releases behind a current symlink, data outside releases so a rollback can't roll back evidence — and the upgrade/rollback drill ran mid-incident for real."
date = 2026-11-05T22:30:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.4"
short_title = "Deployment"
tests = 80

[extra.summary]
goal = "Run on its own host: a versioned install, a rollback that only repoints a symlink, and a schema check that fails honestly."
built = "scripts/deploy.sh → releases/<rel>/bin + current symlink with data/ outside releases; systemd unit + launchd plist + deploy/RUNBOOK.md covering install/upgrade/rollback/backup/heartbeat."
proof = ["live drill: v1 → incident open → v2 → still down → rollback to v1 → still down", "schema-too-new fails the migration check honestly on rollback"]
code = "akira-shirase-oss/monitoring-service · main @ 08aa456"
+++

**What changed:** `scripts/deploy.sh` installs versioned releases —
`releases/<rel>/bin` behind a `current` symlink, with `data/` deliberately
outside releases so a rollback can never roll back evidence. A systemd unit,
a launchd plist, and `deploy/RUNBOOK.md` covering install, upgrade, rollback,
backup, and heartbeat-watching. Rollback is a repoint + restart; a database
whose schema is too new for the binary fails the migration check honestly
instead of opening it anyway.

**Proof — the drill that matters:** exercised end to end mid-incident — v1
running, incident open, upgrade to v2, still `down`, rollback to v1, still
`down`. The incident never flinched; boot rebuild resumed from committed rows
under both binaries.
