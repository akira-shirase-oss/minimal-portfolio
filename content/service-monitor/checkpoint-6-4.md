+++
title = "Checkpoint 6.4: a dashboard that mutates"
description = "Create, edit, pause and delete in the browser — through the same API contract as the CLI, with the generation guard and envelope errors surfaced instead of swallowed."
date = 2026-11-06T12:39:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.4"
short_title = "Dashboard mutations"
tests = 101

[extra.summary]
goal = "Manage monitors in the browser without a private path — the UI holds the same API contract as the CLI."
built = "MonitorForm + create/edit/pause/delete on both pages; edits send the current generation so a concurrent write returns 409 with the server's own words; delete-with-history refusal explains pausing; 401 surfaces as a token failure."
proof = ["Playwright vs the real server+db: create → pause → edit lands generation 3 (one bump per write)", "409 staleness, delete-with-history refusal, and 401 paths all asserted"]
code = "akira-shirase-oss/monitoring-service · main @ 1f27633"
+++

Fourth gap — and the first dashboard-depth slice.

**Gap:** the rebuild's dashboard was read-only — add/edit/pause/delete lived
CLI-only while the old monitor managed monitors from its UI.

**What changed:** all four actions in the browser, through the same API
contract as the CLI — no private path into the store. The sharp edges are the
honest ones: edits send the current `generation` so a concurrent write returns
409 with the server's own words instead of silently last-writer-wins; a
delete-with-history refusal explains that pausing is the right action; a 401
surfaces as a token failure, never a silent spinner.

**Proof:** Playwright against the real server and database — create → pause →
edit lands `generation 3` (one bump per write, and the test initially expected
2 — pause itself is a write, which is exactly the contract). The 409, 401, and
delete-refusal paths are asserted too.
