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
# Eight milestones: draw the track as two rows of four.
track_columns = 4
# The roadmap, in build order. D is the design work before any code; P0–P6 are the
# milestones from the project's ROADMAP.md, each named after what it proves.
milestones = [
  { id = "D", name = "design", about = "Reading a 41-section spec, cutting it down to four promises, naming it, and writing the whole plan down before any code." },
  { id = "P0", name = "foundation", about = "Pinned tools, an empty workspace that passes its checks, the local stack, and an editor whose output Rust can verify." },
  { id = "P1", name = "never lose an edit", about = "Saves that either succeed or clearly fail, safe conflicts between two editors, and projects that can't see each other." },
  { id = "P2", name = "publish exactly once", about = "Reviewed changes become one numbered release, and background work survives being killed halfway." },
  { id = "P3", name = "prove it reached the site", about = "Caching that can't serve the wrong thing, and a receipt for every publish. The first public demo." },
  { id = "P4", name = "time travel", about = "Browse the site as it was at any release, roll back safely, and upload images without risk." },
  { id = "P5", name = "safe automation", about = "Scripts and AI agents can help at a limited scale, and can never skip review." },
  { id = "P6", name = "running on its own", about = "Backups, a real restore, upgrades, a 24-hour stress test, and version 0.1." },
]
# The checkpoint being built right now (shown as "next" in its milestone).
up_next = { milestone = "P0", step = "0.6", title = "The renderer: one document, drawn the same everywhere" }

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
title = "Signing in, and projects that can't see each other"

[[extra.planned]]
milestone = "P1"
title = "A draft that can't be lost"

[[extra.planned]]
milestone = "P1"
title = "Two editors, one article"

[[extra.planned]]
milestone = "P1"
title = "The first simulator run"

[[extra.planned]]
milestone = "P2"
title = "Approving the exact change, not just the article"

[[extra.planned]]
milestone = "P2"
title = "One release, one number"

[[extra.planned]]
milestone = "P2"
title = "Work that survives a crash"

[[extra.planned]]
milestone = "P2"
title = "Killing it on purpose: the first crash loop"

[[extra.planned]]
milestone = "P3"
title = "A cache that can't serve the wrong thing"

[[extra.planned]]
milestone = "P3"
title = "A receipt for every publish"

[[extra.planned]]
milestone = "P3"
title = "My own site, running on Colophon"

[[extra.planned]]
milestone = "P4"
title = "The release slider"

[[extra.planned]]
milestone = "P4"
title = "Rollback is just a new release"

[[extra.planned]]
milestone = "P4"
title = "Image uploads that can't hurt anyone"

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

Early days: the plan is done and the foundation is going in, but nothing here is a working CMS yet. The plan and the
code are public on GitHub at [akira-shirase-oss/colophon-cms](https://github.com/akira-shirase-oss/colophon-cms).
