+++
title = "Checkpoint 0.4: the external test pass — and the bug restart hid"
description = "A full outside-guide test pass: workspace tests, pilot kill-9 → restore, dedup and refusal drills — plus the restart-orphan bug the drills caught and the fix that reconciles it."
date = 2026-11-10

[extra]
kind = "experiment"
milestone = "D4"
step = "0.4"
short_title = "Test pass + orphan fix"
series = "durable-runner"
+++

An external testing guide walked the whole project end to end: build,
workspace tests, fmt/clippy, the pilot drill (submit → inspect → kill -9 →
restart on the same journal → compact → backup → restore on a second port),
dedup via `--op-key`, unregistered-handler 409s, and the second-writer lock
refusal. Everything passed except one thing the guide didn't name.

## The bug: a killed run stayed `running` forever

Kill a run mid-dispatch and restart: the journal replays fine, compaction
and restore work — but the orphaned run's state never reconciles. The
deadline sweep only looked at attempts *this* process owned, so a run
orphaned by a previous process sat `running` indefinitely. Found by the
restart drill, not by a unit test.

The fix (`464e908`) reconciles orphaned runs on startup — two regression
tests that fail without it — plus a clippy cleanup (`82ef4f8`). Verified:
pilot, restore, dedup, refusal and lock drills all green afterward, and the
end-to-end report is committed at `test/TEST-REPORT.md` (`e193b20`).

## Where this leaves D4

CLI, server, inspector, pilot workflow and crash recovery are proven. What
remains on the ship milestone is the load gate — which the next checkpoint
measures, honestly.
