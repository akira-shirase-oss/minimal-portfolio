+++
title = "Checkpoint P6: five sites, one fault bound, and the last gap"
description = "The demo surface got real: five Astro sites — a blog, a docs set, a recipe box, a newspaper and a photo portfolio — all reading one project's published generations through the anonymous delivery API. Plus F09, the fault matrix's last unproven cell: a project that fills its 10,000-job work bound is refused before acceptance, and it recovers."
date = 2026-11-04T23:45:00Z

[extra]
kind = "release"
milestone = "P6"
step = "sites + bounds"
short_title = "Five Astro sites; the work bound (F09)"
tests = 711

[extra.summary]
goal = "Make 'the site' concrete for the usability gate — five different kinds of site, all fed by the same CMS — and close the fault matrix's last cell: when a project's durable work is full, new work must be refused before acceptance, never half-committed."
built = "five real Astro apps under apps/sites/ — blog, docs, recipes, news, portfolio — each its own workspace package and port, sharing a hundred-line site-kit; one demo-sites project with five collections read through the anonymous delivery API; a seed script that does the whole flow through the real API (sign-in, content types, generated PNG uploads through quarantine and verify, fifty-odd entries, a changeset submitted, approved and published); serve/stop tooling on ports 58110-58114. F09: colophon_db::work::admit — a per-project advisory lock as the admitting transaction's first lock, counting open work across all four job families, refusing DbError::WorkFull past spec SS33's 10,000 as 503 work_full + Retry-After; admit sites at publish, release outbox, asset insert/delete, bulk create, migration plan, expired-asset sweep."
proof = ["all five sites 200 with seeded-only proof strings; media URL serves a real uploaded PNG; 51 entries, 10 assets, release 1 at generation 1", "F09 bound test: 10,000 filler jobs -> publish refused 503 work_full, (releases, jobs, generation) = (0,0,0) nothing half-committed; free one row -> same request lands 201 fresh + delivers succeeded", "F09 rollback test: REVOKE INSERT as the disk stand-in -> 500 never mistaken for success, grant restored, retry 201", "F11 row now cites the eval suite's real coverage: prompt-injection, tool-arguments, unsafe-import, mcp-surface", "README-only install verified end to end on an isolated stack: clone -> stack up -> migrate -> build -> /readyz + /studio/ 200, 4 real friction points found and fixed"]
code = "akira-shirase-oss/colophon-cms · main @ 6dc3a3c"
+++

Two more pieces landed, in different places: the front edge (sites a person can
actually open) and the back edge (the last unproven fault cell).

## Five sites that all read the same CMS

`apps/sites/` now holds five real Astro apps, each its own port:

- **The Draft** (58110) — a blog with rich text and tags
- **Fieldnotes Docs** (58111) — sectioned documentation pages
- **Butter & Thyme** (58112) — recipes: ingredients, steps, timings
- **The Meridian Post** (58113) — dated, categorised news
- **Wren Hollis** (58114) — a photography portfolio on real media uploads

Five apps rather than one app with five sections, because separate builds prove
the published projection feeds *independent* front ends. They share about a
hundred lines of site-kit (config, generation-pinned paging, the rich-text
render call) and one `demo-sites` project with five collections. Every page
carries `<meta name="colophon-generation">` — the same marker the probes read,
so a demo page can't drift from what the server accepted.

The seed is honest: `scripts/seed-demo-sites.sh` does the whole flow through the
real API — Keycloak sign-in, content types, generated PNG uploads through
quarantine and verify, fifty-odd entries, a changeset submitted, approved and
published. The sites serve *published* generations, not drafts.

## F09: when the work queue is full, refuse before you commit

The spec's bound is structural: 10,000 pending jobs per project. Until now
nothing enforced it — `colophon_db::work::admit` does. It takes a per-project
advisory lock as the admitting transaction's first lock (so two admissions can
never hold what the other wants), counts open work across jobs, asset jobs,
bulk jobs and migration plans, and refuses past the bound: `503 work_full` with
`Retry-After`.

The honest part is what a refusal *is*: the whole accepting transaction aborts.
No release row, no job, no idempotency claim — the client's same-key retry lands
as a fresh write, not a replay of something that never committed. Fill the bound
with 10,000 filler jobs and a publish is refused; free one row and the same
request succeeds and delivers.

The matrix now has every F-cell either proven on the real stack or honestly
documented as partial — F09's payload-size clause (1 GiB pending metadata) is
the recorded remainder, alongside the retention sweeps still being built.

## What's left in P6

The 24-hour soak is running now (43 million requests, RSS sampled every ten
seconds). Then the human gates: the five-editor usability run these sites were
built for, one independent installer, and the release day — licence, npm org,
the tag.
