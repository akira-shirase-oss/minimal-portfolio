+++
title = "Checkpoint E3 + DX done: live lists, and the whole query surface"
description = "Entry lists now update as PostgreSQL commits land — triggers emit ephemeral hints, one LISTEN connection fans out to bounded per-project broadcasts, and the Studio, testbed and k6 all consume the same SSE stream. The developer-experience arc closed: field-permission refusals, OpenAPI served from the route table itself, a drift-checked TypeScript SDK, Strapi/Sanity import with real dry-run plans, and a bounded GraphQL surface that compiles to the same query document REST runs."
date = 2026-11-04T15:00:00Z

[extra]
kind = "release"
milestone = "E + DX"
step = "live lists + full query surface"
short_title = "Live lists, OpenAPI, SDK, import, GraphQL"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 699

[extra.summary]
goal = "Make entry lists update themselves when data changes — never by polling — and finish the developer-experience program: leak-safe queries, a served contract, a generated client, foreign imports, GraphQL."
built = "colophon_notify() AFTER-ROW triggers on 30 tables emitting ephemeral hints; one PgListener per server feeding bounded per-project broadcasts; GET {P}/events SSE with per-credential/project/global caps refused before subscribe; Studio live.ts EventSource wiring replacing polls; field-not-readable refusals on filters/sorts; OpenAPI 3.1 emitted from the route table (no drift by construction); @colophon-cms/sdk with generated types + hand-written client; import dry-run with Strapi v4/v5 and Sanity mapping; per-collection GraphQL compiling selections to the canonical bounded query document."
proof = ["two-server fan-out proven: a write on server A reaches a subscriber on server B via Postgres alone", "lagging subscribers get resync, never replay; stream caps refuse before subscribe", "k6 GraphQL: 10,518 req, 637/s, p99 163 ms vs 250 ms budget, zero failed; byte-equal applied.queryHash with the REST twin", "OpenAPI drift probe: every declared verb answers, every undeclared verb is 405 with Allow", "SDK types byte-compared against the committed document — drift fails npm run check", "dry-run import writes nothing (not even an idempotency record): per-item outcomes under savepoints"]
code = "akira-shirase-oss/colophon-cms · main @ 0cd9747"
+++

## E3 — lists that update when Postgres commits

Polling is a lie a UI tells politely: every "live" list that refetches on a timer is either stale
or wasteful. E3 replaced it with the database itself.

- **`colophon_notify()` triggers** on 30 tables emit a small hint (`{kind, ids…}`) inside the
  committing transaction via `pg_notify` — environment-aware, so a hint can never leak which
  project changed. Hints are *ephemeral on purpose*: they say "something moved", never what,
  so clients refetch through the real permissioned API and the hint carries no authority.
- **One `PgListener` per server** feeds a bounded per-project broadcast; `GET {P}/events` is the
  SSE endpoint. Caps are refused *before* subscribe (per credential, per project, global), a
  lagging subscriber is told `resync` rather than replayed, and the listener task is
  cancel-wrapped — a shutdown bug where the listener outlived the server was caught by the
  stack tests and fixed before merge.
- **The Studio consumes it:** `live.ts` wires an `EventSource` per project view, the poll loops
  are gone, and the wiring exercise caught a real UX bug — a `RoleEditor` remount on live
  refetch was silently wiping unsaved edits. A load of "live" infrastructure that loses a
  user's typing is worse than polling; the fix keys the component on identity, not data
  freshness.
- **Proof, not vibes:** a two-server stack test writes on one and watches the hint arrive on
  the other through Postgres alone; a worker-driven write produces hints for human
  subscribers; the k6 live scenario holds streams to clean ends while writes maintain their
  p99 gate.

## DX.6–10 — the developer surface, finished

- **DX.6 — no leaks through the query language.** Filters and sorts that name a field the
  role can't read refuse `422 field_not_readable` with a JSON Pointer — refusing, not
  silently dropping, since silence is how query languages exfiltrate. `own`-conditioned
  fields are handled honestly.
- **DX.7 — the contract can't drift.** `GET /openapi.json` is rendered from
  `openapi::TABLE` — the same table `routes()` loops over — so served methods and documented
  methods are the same value by construction. A probe test proves every declared verb answers
  and every undeclared one is 405 with `Allow`; the committed `docs/api/openapi.json` is
  byte-compared.
- **DX.8 — `@colophon-cms/sdk`.** Types are generated from the committed document
  (`openapi-typescript`, drift-checked); the client is hand-written — the invariants that
  make it *correct* (required `Idempotency-Key` on writes, `If-Match`, ETag/replayed/requestId
  surfaces, generation pinning, `retryable` honesty) live outside what codegen expresses.
  33/33 tests.
- **DX.9 — import parity with a real dry run.** `?dry_run=true` processes every item under a
  savepoint inside a transaction that never commits — so the plan reports *real* refusals
  (uniqueness, types, permissions) while writing nothing, not even an idempotency row.
  Strapi v4 `{id, attributes}` and v5 `documentId` shapes and Sanity NDJSON map onto the same
  validated pipeline as every other write.
- **DX.10 — GraphQL, without a second engine.** `POST {P}/collections/{c}/graphql` compiles
  each `entries`/`entry` selection into the canonical bounded `Document` — so
  `Document::validate`, `whose` narrowing, `depth` population and field-leak refusals are
  *literally the same code* REST runs. `applied.queryHash` is byte-equal to the REST twin's,
  proven request-for-request in the stack tests. k6: 10,518 requests, 637/s, p99 163 ms
  against a 250 ms budget.

Milestone E and the DX program are fully closed. Next: the P5 checkpoint — budgets held in
Postgres, resumable bulk jobs, a zero-unauthorized eval gate, request quotas, and the CLI's
machine contract.
