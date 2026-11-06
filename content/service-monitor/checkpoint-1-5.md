+++
title = "Checkpoint 1.5: status from committed evidence only"
description = "The API and dashboard answer from a map written after the commit — an unwritten result can never show up green, and M1's live drill proved the whole loop end to end."
date = 2026-11-05T12:40:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.5"
short_title = "Committed-only status"
tests = 31

[extra.summary]
goal = "Displayed status reflects committed evidence — an unwritten result never shows."
built = "Status map written post-commit only: the API and dashboard answer from the committed map, so an in-flight probe can never paint a badge green."
proof = ["M1 live exit drill: fixture up → target killed → 3 transport checks → incident open + outbox in one commit → server killed mid-incident → still down → 2 fresh passes → resolved", "31 tests, gate green"]
code = "akira-shirase-oss/monitoring-service · main @ bf13126"
+++

**What changed:** the status map is written *after* the commit, not when the
probe returns. The API and the dashboard answer from that committed map, so an
in-flight result can never appear as healthy — and a dead writer shows up as
staleness, not a frozen green board. This is the property everything else
builds on: what you see is what was durably observed.

**Proof — the M1 exit drill, live:** registered a monitor against the fixture;
`up` after the first probe; killed the target → three `transport` checks →
incident `open` + `incident_opened` outbox event in one commit; killed the
server mid-incident → still `down` after restart; target back → two fresh
passes → `resolved` + `incident_recovered`. Thirty-one tests, gate green.
First useful release.
