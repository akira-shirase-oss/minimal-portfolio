+++
title = "Durable Workflow Runner: the build log"
description = "A background-task runner where accepting a job is a durable commit — acknowledged work survives process death, and history is bounded by design. Rust, a file journal, one writer. Built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "building — D4 (CLI + server + inspector live)"
short_title = "Durable Runner"
milestones = [
  { id = "D0", name = "model", about = "The state machine: transitions, invalid states, identities, limits — deterministic tests under a fake clock." },
  { id = "D1", name = "journal", about = "Framed append-only records, checksums, exclusive writer, generations — the four crash cases proven." },
  { id = "D2", name = "execute", about = "Allowlisted HTTP handlers, checkpoints, delayed work, bounded retries, cancellation, effect reconciliation." },
  { id = "D3", name = "maintain", about = "Compaction into generations, seven-day terminal expiry, backup and restore, bounded diagnostics." },
  { id = "D4", name = "ship", about = "CLI and inspection UI, a pilot workflow, the load plan — and a second developer restores a real directory." },
]
up_next = { milestone = "D0", step = "model", title = "The state machine — transitions and their refusals" }

[[extra.planned]]
milestone = "D0"
step = "model"
title = "The state machine — transitions and their refusals"
+++
