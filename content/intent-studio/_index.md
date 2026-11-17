+++
title = "Intent Studio: the build log"
description = "A service business's brief in, a designed, tested and published website out. The model proposes and the platform enforces: tested components, only approved facts, approval bound to the exact build that was checked, and a lead inbox that survives a dead notification provider. Rust and SvelteKit, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "I0 (the lead-intake spine) in progress; no website generation yet — the ship gate needs three pilot clients"
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
up_next = { milestone = "I0", step = "I0", title = "Finish the spine: the 100,000-submission provider-down run, the burst baseline, then a review" }
+++

**Intent Studio** turns a small service business's brief into a working website: designed, tested and
published, with a contact form whose leads can't get lost.

The model does the proposing. The platform does the enforcing. Pages are built only from tested
components. Every factual claim on a page has to be an approved fact with a source and an expiry date.
When the client approves a version, the approval is tied to the exact files that were checked, so what
goes live is what they saw. And when someone fills in the form, the lead is safe even if the email or
notification service is down.

## Where it stands

Started on 2026-11-16 with milestone I0, the lead-intake spine, because it needs no client. The form
endpoint, the durable inbox, the notifier and a read-only operator inbox are built. The first realism
load check is committed as a miss. Nothing generates a website yet, and there has been no independent
review of the code. The ship gate needs three real pilot clients, who haven't been found.

The README on `main` still says "no code yet"; the code moved faster than the docs.

The code is public at
[akira-shirase-oss/intent-studio](https://github.com/akira-shirase-oss/intent-studio).
