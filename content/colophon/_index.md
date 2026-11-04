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
]
# The checkpoint being built right now (shown as "next" in its milestone).
up_next = { milestone = "DX", step = "query", title = "The query API: SQL, routes and perspectives" }

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
milestone = "M"
title = "References, reusable groups, lists and page builders"

[[extra.planned]]
milestone = "E"
title = "Every language its own version"

[[extra.planned]]
milestone = "E"
title = "Review stages, comments and tasks"

[[extra.planned]]
milestone = "E"
title = "Lists that update as others edit"

[[extra.planned]]
milestone = "DX"
title = "A query API, GraphQL and a typed SDK"

[[extra.planned]]
milestone = "DX"
title = "Import from other CMSs"

[[extra.planned]]
milestone = "P5"
title = "Tokens with limits"

[[extra.planned]]
milestone = "P5"
title = "An agent that can't approve its own work"

[[extra.planned]]
milestone = "P5"
title = "Bulk edits that survive being interrupted"

[[extra.planned]]
milestone = "P6"
title = "Backups, and a restore that actually works"

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

Where it stands: the foundation (P0), the editing core (P1), publishing (P2) and proving a publish reached the site
(P3) are done. On top of them the work has split into three arcs. Content itself got richer: locales and localization
groups, email-and-password accounts, mirrored references, import and export, and the field-order type builder all
ported forward and proved on the newer codebase. Sites are now real: pages, a menu and a theme are ordinary content,
the fixed section library and design tokens turn them into websites — no arbitrary CSS — and the same pinned-release,
atomic-promotion machinery builds and publishes them. And the media pipeline is finished end to end: uploads are
quarantined and proved by decode before they can be used, asset fields name them in content, a release refuses to
publish one that isn't usable, the Studio's picker uploads and chooses with real thumbnails, and a public media
origin serves verified objects and fixed-width renditions to anyone — all immutable, all through one existence-as-proof
store. Time travel is done: every public read can pin a release, the Studio steps through them with a slider,
rolling back builds an ordinary reviewed changeset that becomes a new generation — never a path around review —
and publishing re-checks any pin a later type change left behind. Media is done too: uploads delete in stages
(request, lock, recheck, then bytes — never while content still names them), and a retention sweep collects what
nothing references. Schema migrations are done too: a refused type change becomes a dry-run plan of
every entry in the way, approval names the plan's hash, and a worker rewrites each entry in its own
transaction — crash-tested — while the Studio drives the whole flow. Editorial collaboration has
begun: comments pinned to the exact revision they were written on, and tasks with an honest
unassign. Now building: the developer query API — the bounded, hashable query language and its
cursors are already in.

The goal got bigger in October: every feature a serious CMS offers, a proper role and permission system, and a
Studio simple enough for people who aren't developers, all held to the same standard of proof. That's about 9 to 12
months of work. It isn't a CMS you can use yet: nothing runs anywhere but my laptop and CI. The plan and the code are public on GitHub at
[akira-shirase-oss/colophon-cms](https://github.com/akira-shirase-oss/colophon-cms).
