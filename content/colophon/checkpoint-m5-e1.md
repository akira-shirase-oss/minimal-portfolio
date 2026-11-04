+++
title = "Checkpoint M.5 + E1: migrations you can dry-run, and a team that can talk"
description = "Two modules land together. Schema migrations run like releases: a dry-run plan of every entry in the way, hash-bound approval, a worker that applies it one revision at a time and survives being killed. And editorial collaboration arrives: comments pinned to the exact revision they were written on, and tasks with an honest unassign."
date = 2026-11-04T03:30:00Z

[extra]
kind = "release"
milestone = "M"
step = "migrations"
short_title = "Dry-run migrations, comments and tasks"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 552

[extra.summary]
goal = "Let a content type change that stored entries can't take as they are: plan the move as a dry run first, approve exactly that plan, and have a worker rewrite each entry once — while editors get revision-pinned comments and real tasks."
built = "migration_plans and per-entry items with a locked dry run and plan-hash approvals; a worker executor that claims a running plan, rewrites each item in its own transaction as a full new revision, and resumes after a crash; Studio and testbed surfaces plus a k6 scenario; comments bound to immutable revisions and tasks with a tri-state assignee; and the first two steps of the query API — a bounded, canonicalized query language and cursors bound to the query's hash."
proof = ["a plan's dry run lists every entry in the way; approving names the plan hash and only one plan runs per collection", "the executor was killed mid-run and a new worker finished the plan with nothing applied twice (crash test F-05b)", "the Studio drove a refused type change to a done plan end to end in a browser spec", "the simulator's new invariant held across 2,000 seeded runs: no revision is ever written against a superseded type version", "a comment anchored to revision N still names N after newer revisions and deletion; a task's explicit null unassigns", "k6: 10,015 requests through the migration endpoints, p99 209 ms, zero failed; 10,070 through collaboration, p99 58 ms, zero failed"]
code = "akira-shirase-oss/colophon-cms · main @ e4af30b"
+++

Two modules closed in one arc, because they share a theme: **things that change over time have to stay
exact about what they refer to**.

## M.5 — schema migrations, run like releases

Until now, changing a content type in a way stored entries couldn't take — making a field required,
renaming one — was refused outright with a list of the entries in the way. M.5 turns that refusal
into a plan:

- **A plan is a dry run first.** `POST {P}/collections/{c}/migrations` snapshots the target
  definition and walks every draft, recording per entry whether the change applies cleanly, needs a
  decision (`fill` a new required field, `move` a value), or is blocked. Approving a plan names its
  hash; one running plan per collection, and `migration_in_progress` blocks competing type edits —
  the same "reviews pin what they approved" discipline as changesets.
- **The worker does the rewriting, once each.** A plan in `running` is claimed under an advisory
  lock; every item is rewritten in its own transaction as a full new revision — references, asset
  references, unique claims, draft pointer, schema version — via `SECURITY DEFINER` functions that
  keep the worker role inside its row-level-security lane (migration 0041). `fill` only creates the
  final path; `move` refuses to overwrite, rejects same-path and descendant moves, and treats a
  missing source as a no-op. The crash test kills the worker mid-run and a new one finishes the plan
  with nothing applied twice. Plans end `done` or `blocked`; a `republish_required` flag stays live
  while open publications still pin an older shape.
- **People drive it.** The Studio's new migrations section lists plans with counters, a filterable
  item table, a per-item resolution dialog, and approve/apply/cancel bound to the plan's hash. A
  refused save in the type builder now offers to plan the migration — the attempted definition goes
  straight into the plan. The simulator got a new invariant too: racing schema changes against saves,
  no revision may ever be written against a superseded version — 2,000 seeded runs with crashes and
  lost answers held it.

## E1 — comments that can't drift, and tasks

- **Comments pin the revision they were written on.** A composite foreign key binds each comment to
  `(entry, revision)` — the anchor can never silently move to newer content. Bodies are immutable
  text; resolve and reopen are ETag'd writes that refuse on `If-Match` mismatch. Deleting the entry
  keeps the comments readable under a snapshot of who wrote them, while new writes are refused.
- **Tasks are real tasks.** Title, assignee, status, optional revision and changeset links; updates
  are ETag-bound patches where an explicit `null` unassigns and omission preserves — the tri-state
  distinction that took a small enum in the API to express honestly. Permissions honor `content.read`,
  `content.update` and the `own` condition throughout.
- **Surfaces:** a Comments tab on the entry editor bound to the revision on screen, a project Tasks
  page with filters and an assignee picker, a testbed page driving the whole lifecycle, and a k6
  scenario registered with the rest.

## Meanwhile, under the hood: the query API has begun

DX.1 and DX.2 landed in the same window — the bounded, hashable query language (one JSON document,
canonicalized, SHA-256'd so a hash names the exact query for caches and cursors; only `"index": true`
fields may filter or sort) and cursors that seal a position inside the query's hash, so a cursor only
ever works where it came from. SQL translation and routes are in flight now.

Next: the query API's delivery side, named review stages (E2), and lists that update as others edit (E3).
