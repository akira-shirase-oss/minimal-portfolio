+++
title = "Intent Studio: the build log"
description = "A service business's brief in, a designed, tested and published website out. The model proposes and the platform enforces: tested components, only approved facts, approval bound to the exact build that was checked, and a lead inbox that survives a dead notification provider. Rust and SvelteKit, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "I0 (the lead-intake spine) built, under its first independent review; gate not passed until the full load runs; no website generation yet"
short_title = "Intent Studio"
# The milestones from the project's docs/ROADMAP.md.
milestones = [
  { id = "I0", name = "the spine", about = "CI, the lead-intake path from form to database to notification, its load scenario and its failure drills. It needs no client, so it comes first." },
  { id = "I1", name = "brief, facts and components", about = "Briefs, fact records with a source, an approver and an expiry date, and a typed page tree built from tested components." },
  { id = "I2", name = "reference to preview", about = "One model behind a provider-neutral port, bounded generation, and previews." },
  { id = "I3", name = "reliable launch", about = "Candidates keyed by the hash of the built bundle, approval links, reviewable diffs, and promotion with rollback." },
  { id = "I4", name = "improvement review", about = "Cookieless counts and a pre-registered weekly rule: one measured change at a time, reviewed by a person." },
  { id = "I5", name = "evidence battery", about = "A 50-brief battery, page-weight budgets, and checks on real phones." },
  { id = "I6", name = "pilot and ship gate", about = "Three real client sites, each signed off, each receiving a real inquiry." },
]
up_next = { milestone = "I0", step = "review", title = "The independent review, then the quiet-machine baseline and the 1M-submission run" }
+++

**Intent Studio** turns a small service business's brief into a working website: designed, tested and
published, with a contact form built so leads don't get lost.

The model does the proposing. The platform does the enforcing. Pages are built only from tested
components. Every factual claim on a page has to be an approved fact with a source and an expiry date.
When the client approves a version, the approval is tied to the exact files that were checked, so what
goes live is what they saw. And when someone fills in the form, the lead is safe even if the email or
notification service is down.

## Where it stands

Started on 2026-11-16 with milestone I0, the lead-intake spine, because it needs no client. The form
endpoint, the durable inbox, the notifier and a read-only operator inbox are built, and every drill
passes in CI. In every valid load run with the provider down, every acknowledged lead was kept and
delivered, but two runs missed their latency targets on a busy laptop, so the gate isn't passed until
a quiet-machine baseline and the full runs exist. Its first independent review is running. Nothing
generates a website yet, and the ship gate needs three real pilot clients, who haven't been found.

The code is public at
[akira-shirase-oss/intent-studio](https://github.com/akira-shirase-oss/intent-studio).
