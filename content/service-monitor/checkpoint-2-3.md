+++
title = "Checkpoint 2.3: evidence you can query"
description = "GET checks (missed rows included — gaps are part of the record) and GET incidents with filters, the dashboard detail page, and full CLI management verbs."
date = 2026-11-05T16:20:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.3"
short_title = "Evidence APIs"
tests = 61

[extra.summary]
goal = "The incident timeline and recent checks are visible through the API, the dashboard, and the CLI — success and coverage kept separate."
built = "GET /api/monitors/{id}/checks (missed rows included), GET /api/incidents with filters, the dashboard detail route, CLI show/edit/pause/unpause/delete."
proof = ["checks_and_incidents_endpoints_answer + detail page verified live", "reordered views show evidence times, never re-sorted fiction"]
code = "akira-shirase-oss/monitoring-service · main @ eec162a"
+++

**What changed:** the evidence became queryable. `GET /api/monitors/{id}/checks`
returns recent checks — missed rows included, because gaps are part of the
record, not noise to filter. `GET /api/incidents` answers the incident
timeline with filters. The dashboard grew a detail route showing the
incident history alongside recent checks, and the CLI got the full management
surface: `show`, `edit`, `pause`, `unpause`, `delete`.

**Proof:** `checks_and_incidents_endpoints_answer` plus the detail page
exercised live — reordered views display evidence times, never re-sorted
fiction.
