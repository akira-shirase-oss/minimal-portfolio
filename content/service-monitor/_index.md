+++
title = "Service Monitor: the build log"
description = "A self-hosted HTTP monitor in Rust that never shows green without evidence. Built in the open, one tested checkpoint at a time."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "in progress"
# How lists elsewhere on the site name this build log.
short_title = "Service Monitor"
# The roadmap, in build order. Each entry in this folder says which milestone it belongs
# to (`milestone`), its step label (`step`) and a short title for lists (`short_title`).
milestones = [
  { id = "M0", name = "one check", about = "A single bounded HTTP check, tested against four kinds of failure." },
  { id = "M1", name = "bounded loop", about = "Repeated checks, cancellation, no overlap." },
  { id = "M2", name = "durable state", about = "SQLite, and incidents that survive a restart." },
  { id = "M3", name = "alerts", about = "A signed webhook, then email." },
  { id = "M4", name = "usable product", about = "Dashboard, maintenance windows, public status page." },
  { id = "M5", name = "independent operation", about = "A separate status host, backups, a 24-hour soak test." },
]
# The checkpoint being built right now (shown as "next" in its milestone).
up_next = { milestone = "M0", step = "0.4", title = "A Rust test server that fails on purpose" }
+++

**Service Monitor** watches the health URLs of your services. When repeated checks fail, you get one alert with the evidence. When they recover, you get one recovery alert. It's the first infrastructure piece of a bigger plan: tools for running AI applications reliably.

I'm building it in Rust with Claude Code, and writing up every checkpoint here, including what went wrong.

## The rules it lives by

- **Never green without evidence.** A missed check is a *gap*, shown as unknown. It's never counted as a pass.
- **One check = one attempt.** No hidden retries, no catch-up bursts after downtime.
- **Everything is bounded:** time, queues, retries, memory and disk.
- **All of the logic is Rust,** with ownership as the architecture: each piece of state has one owner, shared config is immutable, and resources are released by `Drop`.
- **Measure, then claim.** No performance numbers until a 24-hour soak test backs them.

Early days: nothing here is production-ready yet.
