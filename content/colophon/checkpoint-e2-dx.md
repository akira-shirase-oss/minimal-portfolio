+++
title = "Checkpoint E2 + DX: review stages, a real query API, and CLI/MCP parity"
description = "Named review stages gate publishing end to end — configurable per environment, stage-named approvals, a Studio editor, and one-click publish that names its blockers. The query language now executes: draft and release-pinned delivery queries with hash-bound cursors, and `depth` populates references level by level without an N+1. CLI and MCP reached parity with the API surface."
date = 2026-11-04T06:00:00Z

[extra]
kind = "release"
milestone = "E + DX"
step = "stages + queries"
short_title = "Review stages, query API, CLI/MCP parity"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 599

[extra.summary]
goal = "Let a changeset pass through named review stages before it can publish; let the query language actually run on both drafts and pinned releases; make the CLI and MCP server cover the API they claim to wrap."
built = "environment-scoped ordered review stages with per-stage reviews and stage-gated publishing (migration 0043); Studio settings editor + changeset stage UI + testbed + k6; draft and delivery query execution with keyset pagination and generation-pinned boundaries; depth-based reference population with permission narrowing on the draft side; CLI modules for query/releases/migrations/comments/tasks and matching MCP tools."
proof = ["publish refused not_approved until the last required stage approves — tested through the real API in the testbed", "stage-row replace serializes under an environment-row lock; stale_stages 409 on a raced ETag", "delivery query pages pinned to a release generation; cursors bound to the exact query hash refuse foreign/mismatched positions", "depth 0/1/2 on drafts and published entries; cycles terminate; a denied target stays the stored id", "43 CLI/MCP stack tests: tools/list filtering by token permissions, forbidden tool names refused, query round-trip with cursor paging", "k6: 10,266 requests through the stages endpoints, p99 71 ms, zero failed"]
code = "akira-shirase-oss/colophon-cms · main @ c1c6e7a"
+++

Two more arcs closed since the last checkpoint — one about *who* may publish, one about *how* you ask
for content.

## E2 — named review stages

A changeset's review used to be a single gate: someone approves the current hash, you publish.
Real editorial teams want ordered steps — copy review, then legal — and only then a publish.

- **Stages are environment configuration.** A project may define an ordered list of named stages,
  each optionally requiring *someone other than the sender* to approve. The definition is replaced
  whole (add/rename/reorder/remove) under its own ETag — `stale_stages` refuses a raced save; the
  rows are immutable per environment version, so reviews that name a stage can't be retargeted.
- **Reviews name their stage.** The changeset view carries each stage's state — waiting, approved,
  changes requested, approval expired — and who approved it when. Publishing requires every
  configured stage approved on the *current* changeset hash; the API answers `not_approved` naming
  what's missing rather than silently succeeding.
- **Serialization, honestly.** Stage replace/review/publish share a lock on the environment row
  (`FOR UPDATE`/`FOR SHARE` respectively) — the first design tried `FOR SHARE` on the stage rows
  themselves, which PostgreSQL rightly refuses without UPDATE privilege; locking the parent row
  achieves the same ordering without granting write on immutable rows (D-104).
- **Surfaces:** a Settings → Review stages editor (reorder, rename, someone-else flag, read-only
  for roles without `schema.change`), the changeset page showing the ordered stages and a
  *Deciding* selector on every review, one-click publish that approves its eligible stages and
  names the ones blocking it, a testbed page driving the full gate, and a k6 scenario — with the
  guarded list-replace deliberately documented as a config write rather than load-looped (it
  serializes on one global row by design).

## DX.3–5 — the query language executes

DX.1–2 gave the language a shape and hash-bound cursors; this arc made it run.

- **SQL translation (DX.3):** bounded canonical queries compile to verbatim-parameter `WHERE`/`ORDER BY`
  in `colophon-db`; `POST {P}/collections/{c}/entries/query` executes with keyset pagination and
  stable entry-id tie-breaks. The response echoes the `applied` query (canonical form + hash).
- **Delivery side (DX.4):** `POST /content/v1/{project}/{collection}/query` reads as
  `colophon_delivery` under the exact publication-validity predicate — latest generation by default,
  a `release`-pinned generation when the caller names it. Cache keys incorporate the query hash
  *and* the page boundary hash, so two pages of one query never collide and generation pinning
  behaves exactly like the plain collection read (D-105).
- **`depth` populates (DX.5):** reference fields can return expanded objects
  `{id, collection, revision_id, title, content, hidden_fields?}` — resolved level by level with
  one batched `ANY` read per level, never N+1. The draft side resolves in the caller's transaction
  narrowed by their `content.read` (a denied target keeps its stored id and `hidden_fields` names
  what was cut); the delivery side resolves publications pinned at the page's own generation.
  Cycles terminate at the bound because there is no level past it (D-107).

## CLI and MCP reached parity

The CLI gained `query`, `release`, `migration`, `comment`, and `task` modules; the MCP server
gained query and collaboration tools — all authorization-bound wrappers over the same HTTP API.
Dangerous actions stay refused by design: no approve, publish, stage administration, token/role
administration, or destructive collaboration writes through either surface. 43 stack tests cover
`tools/list` permission filtering, query round-trips with cursor paging, mismatched-cursor refusal,
and rejected forbidden names (D-106).

Next: E3 — lists that update as PostgreSQL commits (a scoped SSE fan-out design is already written),
and the rest of the DX program: field-permission narrowing on filters, OpenAPI, the TypeScript SDK.
