+++
title = "Checkpoint 4.3: a restore that was actually restored"
description = "VACUUM INTO behind POST /api/backup, plus a drill that opens an incident, backs up, destroys, restores — and finds the incident and pending outbox still there."
date = 2026-11-05T22:20:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.3"
short_title = "Backup + restore"
tests = 80

[extra.summary]
goal = "A backup is only real when a restore has been run — restored open incidents stay open, pending outbox stays pending."
built = "Db::backup (VACUUM INTO — the WAL-aware online snapshot: reads the store, never writes it) behind POST /api/backup {path}, reporting byte size; scripts/backup-drill.sh rehearses the full drill."
proof = ["backup_restore_preserves_open_incidents_and_outbox + backup_writes_a_snapshot_to_an_absolute_path", "live drill PASSED: incident open → backup → destroy → restore → down + incident + outbox intact"]
code = "akira-shirase-oss/monitoring-service · main @ 00c43ec"
+++

**What changed:** `Db::backup` runs `VACUUM INTO` — the WAL-aware online
snapshot that reads the store without writing it — behind `POST /api/backup`,
which requires an absolute path and reports the snapshot's byte size. Then
`scripts/backup-drill.sh` rehearses the whole thing, because a backup that was
never restored is a hope, not a backup.

**Proof — the drill, run for real:** drive an incident open, back up, kill the
server, swap in the snapshot, restart. Result: `down`, one open incident, one
pending outbox row — nothing replayed, nothing lost.
