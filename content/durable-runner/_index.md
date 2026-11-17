+++
title = "Durable Workflow Runner: the build log"
description = "A background-task runner where accepting a job is a durable commit — acknowledged work survives process death, and history is bounded by design. Rust, a file journal, one writer. Built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "building — D4: three review rounds merged, no acknowledged job lost; a truncation bug and the sustained-load gate still open"
short_title = "Durable Runner"
milestones = [
  { id = "D0", name = "model", about = "The state machine: transitions, invalid states, identities, limits — deterministic tests under a fake clock.", done = true },
  { id = "D1", name = "journal", about = "Framed append-only records, checksums, exclusive writer, generations — the four crash cases proven.", done = true },
  { id = "D2", name = "execute", about = "Allowlisted HTTP handlers, checkpoints, delayed work, bounded retries, cancellation, effect reconciliation.", done = true },
  { id = "D3", name = "maintain", about = "Compaction into generations, seven-day terminal expiry, backup and restore, bounded diagnostics.", done = true },
  { id = "D4", name = "ship", about = "CLI and inspection UI, a pilot workflow, the load plan — and a second developer restores a real directory." },
]
up_next = { milestone = "D4", step = "load", title = "The sustained-load gate: group commit is in; the 1M battery re-runs on a quiet machine after the frame-header fix" }

[[extra.planned]]
milestone = "D4"
step = "load"
title = "Sustained load inside the latency gate — group commit landed, re-run owed"

[[extra.planned]]
milestone = "D4"
step = "restore"
title = "A second developer restores a real journal directory, unaided"
+++
