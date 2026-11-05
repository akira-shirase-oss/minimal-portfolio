+++
title = "Service Monitor: the build log"
description = "A monitor that keeps an eye on your websites and tells you, honestly, when something breaks — and just as honestly, when it can't see. Rust, built in the open, one tested step at a time. This is the rebuild: the first monitor's build log is retired, its lessons kept."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "in progress"
short_title = "Service Monitor"
milestones = [
  { id = "M0", name = "scaffold", about = "Workspace, contract-first domain types, the honest-states dashboard shell." },
  { id = "M1", name = "check and remember", about = "Real probes on a bounded schedule, one writer committing evidence, state that survives a restart." },
  { id = "M2", name = "notify", about = "Signed webhooks delivered at least once, editing that can't lose a probe, evidence you can query." },
  { id = "M3", name = "display and status", about = "Coverage kept apart from success, a public status page, and a heartbeat that says when the monitor itself dies." },
  { id = "M4", name = "operate", about = "Retention, disk guardrails, backup and restore, and running on its own host." },
  { id = "M5", name = "ship", about = "Auth, the rest of the SSRF hardening, load runs, and a release someone else can install." },
]
up_next = { milestone = "M4", step = "4.1", title = "Keeping a week of evidence, summing up the rest" }

[[extra.planned]]
milestone = "M4"
step = "4.1"
title = "Keeping a week of evidence, summing up the rest"

[[extra.planned]]
milestone = "M4"
step = "4.2"
title = "Disk limits and log rotation — pressure fails safe, never corrupts"

[[extra.planned]]
milestone = "M4"
step = "4.3"
title = "A backup-and-restore drill that actually gets run"

[[extra.planned]]
milestone = "M4"
step = "4.4"
title = "Deploying it off the laptop"

[[extra.planned]]
milestone = "M5"
step = "5.1"
title = "Management auth — denied means denied"

[[extra.planned]]
milestone = "M5"
step = "5.2"
title = "The rest of SSRF: redirects and DNS"

[[extra.planned]]
milestone = "M5"
step = "5.3"
title = "Load runs and a day-long soak"

[[extra.planned]]
milestone = "M5"
step = "5.4"
title = "A release another developer can install"
+++
