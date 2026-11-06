+++
title = "Service Monitor: the build log"
description = "A monitor that keeps an eye on your websites and tells you, honestly, when something breaks — and just as honestly, when it can't see. Rust, built in the open, one tested step at a time. This is the rebuild: the first monitor's build log is retired, its lessons kept."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "feature-complete — 24-hour soak running"
short_title = "Service Monitor"
milestones = [
  { id = "M0", name = "scaffold", about = "Workspace, contract-first domain types, the honest-states dashboard shell." },
  { id = "M1", name = "check and remember", about = "Real probes on a bounded schedule, one writer committing evidence, state that survives a restart." },
  { id = "M2", name = "notify", about = "Signed webhooks delivered at least once, editing that can't lose a probe, evidence you can query." },
  { id = "M3", name = "display and status", about = "Coverage kept apart from success, a public status page, and a heartbeat that says when the monitor itself dies." },
  { id = "M4", name = "operate", about = "Retention, disk guardrails, backup and restore, and running on its own host." },
  { id = "M5", name = "ship", about = "Auth, the rest of the SSRF hardening, load runs, and a release someone else can install." },
  { id = "M6", name = "parity", about = "Every gap the retired monitor knew — real certificate classification, per-monitor sensitivity, the four incident times, a mutating dashboard, honest charts, a drift-checked guide, exit codes, mutation testing, and maintenance windows." },
  { id = "M7", name = "deferred items, closed", about = "Email alerts as a second outbox channel, a real dashboard login, and a rising-load drill that checks the monitor's story against a real app's own ground truth." },
]
up_next = { milestone = "M5", step = "soak", title = "The 24-hour soak — the one run still owed" }

[[extra.planned]]
milestone = "M5"
step = "soak"
title = "The 24-hour soak — the one run still owed"
+++
