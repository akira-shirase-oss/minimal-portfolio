+++
title = "Colophon CMS: the build log"
description = "A content management system that can prove what it published and survives being killed at any moment. Rust and Svelte, built in the open, one proven milestone at a time."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "in progress"
# How lists elsewhere on the site name this build log.
short_title = "Colophon"
# Twelve milestones: draw the track as three rows of four.
track_columns = 4
# The roadmap, in build order. D is the design work before any code; the rest are the
# milestones from the project's ROADMAP.md, each named after what it proves. The roadmap
# calls developer parity "D"; here it's DX, because D is already the design work.
milestones = [
  { id = "D", name = "design", about = "Reading a 41-section spec, cutting it down to four promises, naming it, and writing the whole plan down before any code." },
  { id = "P0", name = "foundation", about = "Pinned tools, an empty workspace that passes its checks, the local stack, and an editor whose output Rust can verify." },
  { id = "P1", name = "never lose an edit", about = "Saves that either succeed or clearly fail, safe conflicts between two editors, and projects that can't see each other." },
  { id = "P2", name = "publish exactly once", about = "Reviewed changes become one numbered release, and background work survives being killed halfway." },
  { id = "P3", name = "prove it reached the site", about = "Caching that can't serve the wrong thing, and a receipt for every publish. The first public demo." },
  { id = "R", name = "roles you define", about = "Owners decide exactly who may do what, down to a field, and every path checks it the same way." },
  { id = "M", name = "content you can shape", about = "References, reusable groups, lists and page builders, kept valid as they change." },
  { id = "W", name = "sites from content", about = "Ordinary content composed into websites: pages, a menu and a theme from a fixed section library and design tokens — no arbitrary CSS — built from one pinned release." },
  { id = "P4", name = "time travel", about = "Browse the site as it was at any release, roll back safely, and upload images without risk." },
  { id = "E", name = "editorial parity", about = "Everything an editorial team expects of a serious CMS: languages, schedules, review stages, comments, live updates." },
  { id = "DX", name = "developer parity", about = "Queries, GraphQL, a typed SDK, webhooks and imports from other CMSs, through the same permissions." },
  { id = "P5", name = "safe automation", about = "Scripts and AI agents can help at a limited scale, and can never skip review." },
  { id = "P6", name = "running on its own", about = "Backups, a real restore, upgrades, a 24-hour stress test, and version 0.1." },
  { id = "P7", name = "audience and speed", about = "Site visitors with real sign-in and per-project roles, content gated by row-level security, and the five demo sites driving the performance hunt." },
]
# The checkpoint being built right now (shown as "next" in its milestone).
up_next = { milestone = "P7", step = "v01", title = "The 24-hour soak, then version 0.1" }

# What's still ahead, shown faded under each milestone. A step leaves this list on
# its own once its entry is published (or while it's `up_next`).
# (Arrays of tables last: a bare key after them would belong to the last one.)
[[extra.planned]]
milestone = "P0"
step = "0.1"
title = "Pinned tools and an empty workspace that passes its checks"

[[extra.planned]]
milestone = "P0"
step = "0.2"
title = "The local stack: Postgres, cache, file storage, sign-in"

[[extra.planned]]
milestone = "P0"
step = "0.3"
title = "One error format and honest health checks"

[[extra.planned]]
milestone = "P0"
step = "0.4"
title = "The editor spike: what goes in comes back out"

[[extra.planned]]
milestone = "P0"
step = "0.5"
title = "Rust refuses what the editor must never store"

[[extra.planned]]
milestone = "P0"
step = "0.6"
title = "The renderer: one document, drawn the same everywhere"

[[extra.planned]]
milestone = "P0"
step = "0.7"
title = "Material 3 colours and the first screen"

[[extra.planned]]
milestone = "P1"
step = "1.1"
title = "Signing in, and projects that can't see each other"

[[extra.planned]]
milestone = "P1"
step = "1.2"
title = "A draft that can't be lost"

[[extra.planned]]
milestone = "P1"
step = "1.3"
title = "Two editors, one article"

[[extra.planned]]
milestone = "P1"
step = "1.4"
title = "The first simulator run"

[[extra.planned]]
milestone = "P1"
step = "1.5"
title = "Content types you define"

[[extra.planned]]
milestone = "P1"
step = "1.6"
title = "The command line saves the same draft"

[[extra.planned]]
milestone = "P1"
step = "1.7"
title = "Inviting people"

[[extra.planned]]
milestone = "P1"
step = "1.8"
title = "The first owner"

[[extra.planned]]
milestone = "P2"
step = "2.1"
title = "Approving the exact change, not just the article"

[[extra.planned]]
milestone = "P2"
step = "2.2"
title = "One release, one number"

[[extra.planned]]
milestone = "P2"
step = "2.3"
title = "Work that survives a crash"

[[extra.planned]]
milestone = "P2"
step = "2.4"
title = "Killing it on purpose: the first crash loop"

[[extra.planned]]
milestone = "P3"
step = "3.1"
title = "A cache that can't serve the wrong thing"

[[extra.planned]]
milestone = "P3"
step = "3.2"
title = "Taking it back: unpublishing that sticks"

[[extra.planned]]
milestone = "P3"
step = "3.3"
title = "A receipt for every publish"

[[extra.planned]]
milestone = "P3"
step = "3.4"
title = "My own site, running on Colophon"

[[extra.planned]]
milestone = "P3"
step = "3.5"
title = "The Studio, designed"

[[extra.planned]]
milestone = "P3"
step = "3.6"
title = "Content types you can change"

[[extra.planned]]
milestone = "P3"
step = "3.7"
title = "Plain words, and publishing in one click"

[[extra.planned]]
milestone = "P3"
step = "3.8"
title = "My site goes live, and the first public demo"

[[extra.planned]]
milestone = "R"
step = "R.1"
title = "Roles stored as data, and nothing else changes"

[[extra.planned]]
milestone = "R"
step = "R.2"
title = "Roles you define, in the Studio"

[[extra.planned]]
milestone = "R"
step = "R.3"
title = "Permissions down to a field, and “only their own”"

[[extra.planned]]
milestone = "R"
step = "R.4"
title = "API tokens and an audit log"

[[extra.planned]]
milestone = "P6"
title = "The usability gate and an independent install"

[[extra.planned]]
milestone = "P6"
title = "A 24-hour stress test"

[[extra.planned]]
milestone = "P6"
title = "Version 0.1"
+++

**Colophon** is a content management system: the place where you write, review and publish a website's articles. In a
book, the colophon is the note at the back that says how, when and by whom it was printed. Colophon does that for a
website: every publish becomes a numbered release, with a record of exactly what went live and where it was seen.

I'm building it in Rust and Svelte with Claude Code, in the open, and writing up every step here, including the
mistakes. My own site will be its first real user.

## The promises it has to keep

- **Kill it at any moment, lose nothing.** No saved edit disappears, no publish happens twice, no reader sees half of one.
- **Every bug is a number you can replay.** Thousands of simulated runs with crashes and network trouble on every change; a failure comes with a seed that reproduces it exactly.
- **Time travel.** See the whole site as it was at any release. Rolling back is just a new release.
- **Receipts, not spinners.** "Published" only means published. The site update shows as pending until it's actually seen.

## The rules it lives by

- **Proof over features.** A feature counts when its failures are tested, not when its screen exists.
- **No AI hype.** Scripts and AI agents get safe, limited access. The headline is reliability.
- **Everything has a limit:** time, retries, queue sizes, memory and disk.
- **No bragging without numbers.** No speed claims until a benchmark with raw data backs them up.

## Where it stands

The foundation (P0), the editing core (P1), publishing (P2) and proving a publish reached the site (P3) are done.
On top of them the work has split into arcs.

**Content itself is richer.** Locales and localization groups, email-and-password accounts, mirrored references,
import and export, and the type builder all ported forward and proved on the newer codebase.

**Sites are real.** Pages, a menu and a theme are ordinary content. A fixed section library and design tokens turn
them into websites — no arbitrary CSS — and the same pinned-release machinery builds and publishes them.

**Media is finished end to end.** Uploads are quarantined and proved by decode before they can be used, a release
refuses to publish an unusable asset, and a public media origin serves verified objects and fixed-width renditions —
all immutable, all through one existence-as-proof store. Deletes happen in stages, and a retention sweep collects
what nothing references.

**Time travel works.** Every public read can pin a release, the Studio steps through them with a slider, and rolling
back builds an ordinary reviewed changeset — never a path around review.

**Schema migrations run.** A refused type change becomes a dry-run plan of every entry in the way, approval names
the plan's hash, and a crash-tested worker rewrites each entry in its own transaction.

**Collaboration has begun.** Comments pin to the exact revision they were written on, tasks unassign honestly, and
named review stages gate publishing — ordered, per environment.

**The developer program is finished.** A bounded query language with hash-bound cursors, an OpenAPI document emitted
from the route table itself so it can't drift, a drift-checked TypeScript SDK, imports that dry-run against Strapi
and Sanity shapes, a per-collection GraphQL that compiles to the same bounded document REST runs — and lists that
update live as PostgreSQL commits land, no polling. The CLI and MCP server reached parity with the API: every
capability, same authorization, dangerous actions refused by design.

**Safe automation is closed (P5).** A token can never approve token-submitted work. Budgets reserve in Postgres
before a write may commit — including per-day provider token and cost ceilings. Bulk jobs survive a worker crash
without duplicating an item. An adversarial eval gates at zero unauthorized actions, with a stored run. Per-token
request quotas throttle a noisy agent inside its own auth lookup — and the measured proof shows editors holding
their latency beside 600 refused requests a second. The CLI speaks one versioned JSON contract, with `colophon mcp`
in-process and the same MCP surface now answering over the network — API tokens only, sessions minted and bounded,
every call dispatched under its own credential. And the CLI round-trips content: `content export` streams JSONL out,
`content import` checks and lands it back.

**Recovery is proven (P6):** encrypted backups and WAL archiving run continuously, an append-only deletion ledger
exports off-host and replays idempotently, and a six-stage restore on clean infrastructure verified a real drill —
400 seconds from capture to serving, a new epoch registered before anything read. The load evidence shows each
dependency failure fails honestly: cache down falls back, database down refuses writes loudly, a refusing purge
endpoint backs off.

**The matrix is nearly closed (P6):** every load case now has stored evidence — 540,063 requests over 30 minutes at
300/s with zero failures on the warm baseline, stampedes coalesced, spikes shaped, a true 10,000-record import —
with only the 24-hour soak outstanding. Backups run on a verified schedule with retention that only prunes
what it can prove, upgrades rehearse an explicit gate, and every log line carries the build's version and commit.
The committed benchmark report names every run and what its numbers don't prove. Tables stay bounded: an hourly
retention sweep clears dead state in batches and a 1 GiB ceiling refuses oversized queued payloads. And media
now keeps its history — every verified upload lands content-addressed, immutable versions pin by digest, and a
replace that fails verification leaves the current version serving.

**Audience auth is a product (P7).** Site visitors sign up and in through the CMS itself — Argon2id passwords,
opaque sessions with expiry, idle death and revocation — and hold per-project audience roles staff manage.
Published content carries a visibility gate: public, signed-in members, or a named role, decided by PostgreSQL
row-level security inside the delivery read rather than application filtering. Member reads always bypass the
shared cache, so a gated row can never be served to or stored for a stranger. The Draft demo site runs the
members flow live; the other four demo sites can only ever see public rows.

**Now building (P7):** the 24-hour stress run, the usability gate and an independent install — then version 0.1.

The goal got bigger in October: every feature a serious CMS offers, a proper role and permission system, and a
Studio simple enough for people who aren't developers, all held to the same standard of proof. That's about 9 to 12
months of work. It isn't a CMS you can use yet: nothing runs anywhere but my laptop and CI. The plan and the code are public on GitHub at
[akira-shirase-oss/colophon-cms](https://github.com/akira-shirase-oss/colophon-cms).
