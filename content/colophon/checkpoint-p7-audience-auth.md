+++
title = "Checkpoint P7: built-in audience auth — visitors, roles, gated content"
description = "Colophon now ships a members feature, not just staff sign-in: site visitors register and sign in, staff assign per-project audience roles, and published content carries a visibility gate — public, members-only, or a named role — enforced by PostgreSQL row-level security inside the delivery read, never by application filtering."
date = 2026-11-05T03:05:00Z

[extra]
kind = "release"
milestone = "P7"
step = "audience-auth"
short_title = "Built-in audience auth"

[extra.summary]
goal = "Give projects a real members feature: visitor signup and sign-in, per-project audience roles, and published content gated to the public, to any signed-in member, or to a named role — with the authorization decision made where it cannot leak a row."
built = "Site users as a fourth credential kind (Argon2id passwords, opaque sessions hashed at rest with expiry, idle death, a session bound, lockout and revocation), staff-managed audience roles under a new audience.manage action, a visibility field carried from draft through revision to publication, and a members area on The Draft demo site proving the whole flow."
proof = ["PostgreSQL RLS allows anonymous reads to see only public rows, member reads to see public + authenticated + their role — proven at the database, not around it", "a member request always bypasses the shared cache (private, no-cache) so a gated row can never be served to, or stored for, a stranger", "signup → signin → gated members page works end to end on the live site, while the other four demo sites can only ever see public rows", "3,000-request k6 run through signup/signin/me/member-reads with zero failures", "a revoked or expired session degrades to anonymous rather than a hard 401 on public content"]
code = "akira-shirase-oss/colophon-cms · main @ aaf02f0"
+++

The CMS had staff authentication from the beginning — editors and operators sign in through Keycloak or
email-and-password, and memberships gate the management API. What it did not have was the feature the product
spec describes as "membership / gated content": a project's *audience*. Site visitors are a different kind of
credential entirely — they hold no membership, call no management route, and the only thing they are ever
authorized to do is read published content. This checkpoint adds that fourth credential kind, end to end.

## What I built

- **Site users.** Visitors sign up and sign in at `POST /audience/v1/{project}/{signup,signin}` with an email
  and Argon2id password hash — the same password discipline staff accounts use. Sessions are opaque tokens,
  hashed at rest, with a 30-day expiry, 7-day idle death, a 16-session bound per user, sign-in rate limiting
  (8 misses locks for 15 minutes), and individual revocation. Signup may take only a `self_assign` role — a
  project can mark its `member` role open so visitors join it themselves, while `vip` stays staff-assigned.
- **Audience roles.** Staff with the new `audience.manage` action (owner roles hold it; the migration backfills
  existing ones) create roles, manage users and their sessions, and everything lands in the audit log.
- **A visibility gate on content.** Drafts, revisions and publications carry `visibility`: `public`,
  `authenticated` (any live site session) or `role:<name>` (a session whose user holds that audience role).
  `?visibility=` sets it on entry writes — validated as a `Visibility` and, for `role:`, against the project's
  live roles — and a release publishes the gate its pinned revision carried. The gate is reproducible state,
  like everything else a revision pins.
- **Enforcement inside the read.** The `publications` RLS predicate does the deciding: an anonymous delivery
  transaction sees `public` only; a member's transaction sets `app.audience_role` to the role the session
  lookup just read and sees public + authenticated + matching `role:` rows. A role change or a disable takes
  effect on the very next read — nothing to invalidate, no cache or token carrying a stale answer.
- **Cache discipline.** A member request resolves *before* the generation-keyed delivery cache and always
  bypasses it: `Cache-Control: private, no-cache`, `Vary: Authorization, Cookie`, `Colophon-Cache: bypass`,
  its own ETag. The shared cache's keys name no role, so a gated row can never be served to or stored for a
  stranger — and anonymous reads keep their cached fast path untouched.
- **An honest demo.** The Draft (the blog demo site) runs the whole flow server-side: `/signin`,
  `/api/signin|signout|signup` and `/members/*` render per-request under Astro's node adapter, keep the session
  in a first-party cookie, and read delivery as `role:member` over seeded gated posts. The other four sites —
  docs, recipes, news, photography — stay fully static and can only ever see public rows, which is exactly the
  cross-site isolation the feature promises.

## What proved it

- **The RLS is proven at Postgres.** `crates/colophon-db/tests/audience.rs` runs five stack tests against the
  real role and policy: anonymous sees public only, a member sees their role's rows, a disabled user degrades
  to anonymous, a session past expiry is dead, cross-project users see nothing of each other. The database is
  the test, not a mock around it.
- **The live flow runs.** On the dev stack: the seed created the `member` (open) and `vip` (closed) roles plus
  `member@draft.test` through the staff API, published 54 entries (51 public, 1 authenticated, 2 role:member),
  and the rebuilt blog signs in, redirects to `/members/` and lists exactly the three gated posts — while an
  anonymous visit to the same URL redirects to sign-in. Anonymous collection reads return `colophon-cache:
  hit`; member reads return `Colophon-Cache: bypass` with `Cache-Control: private, no-cache`.
- **Load-tested.** `perf/k6/audience.js` drove 3,000 requests through signup, signin, `me` and member-vs-anon
  collection reads with zero failures, p99 37 ms, all thresholds held — anonymous reads still hit the cache,
  member reads still bypass it.
- **Revocation and expiry work.** Dead sessions degrade to anonymous rather than refusing public reads; a
  revoked session stops seeing gated rows on the next request, not the next deploy.

## The honest part

- **Roles are labels, not plans.** The spec's membership template names billing, subscriptions and entitlement
  expiry — those are real features and deliberately deferred. A gate says who may read; charging for access is
  a separate design that builds on this one without changing what `role:` means.
- **Bearer credentials are the documented form for cross-origin sites** (the demo sites use them): no CSRF
  echo needed. The cookie pair exists for same-origin embedders and gets the double-submit treatment on its
  one write.
- **A missed gate fails closed.** Because the predicate lives in the RLS policy rather than a WHERE clause the
  app might forget, a route that resolves the wrong audience gets *fewer* rows, never more — the failure mode
  is under-delivery, which shows up, rather than leakage, which doesn't.
- **Migrations renumbered in flight.** This branch started life as migration 0050/D-136 before two other
  slices landed first; it ships as migration 0052/D-137. Numbers are cheap; collisions in a shared ordering
  are not.

## Publishing now rebuilds the sites

The gap between "published" and "readers see it" used to be a manual step: publish in the Studio,
then remember to rebuild the demo sites by hand. That gap is closed with the product's own
machinery. A **website connection** — the project's webhook destination — points at a small build
hook that answers each release announcement `202` at once, builds the newest announced generation,
and leaves the running sites untouched when a build fails. Publishing in the Studio now updates
all five sites without anyone running anything: verified end to end, a real changeset published as
release 3 reached the hook eleven seconds later and all five sites rebuilt to generation 3 with
the new post served.

The same slice made The Draft a multi-collection site: it renders `posts` for the running argument
and `articles` for the longer pieces, both through the same delivery API from the same pinned
release. Release 4 (two articles) was published and the sites rebuilt themselves to generation 4
with the new section live.

## What is next

P7 continues on the strength this lands: the remaining performance work from the five-site load picture, the
24-hour soak still running, then the human gates — the five-editor usability sessions (the sites and the
members flow are the test surface), the independent install, licence confirmation and the v0.1 tag.
