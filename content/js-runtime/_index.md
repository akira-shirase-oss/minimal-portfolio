+++
title = "jsrt: the build log"
description = "A purpose-built JavaScript host in Rust — V8 through deno_core, where the engine is borrowed and everything that matters is ours: the capabilities, the lifecycle, the honest errors, the ops. Built in the open, one proven milestone at a time."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "early build — step 1 (execute) underway"
short_title = "jsrt"
milestones = [
  { id = "M0", name = "scaffold", about = "Workspace, pinned deno_core + V8, the rt.* namespace, an error taxonomy where every way a run ends has its own exit code." },
  { id = "M1", name = "execute", about = "Run real files; classify load vs syntax vs exception vs terminated; one host function; the op boundary measured." },
  { id = "M2", name = "async host", about = "Timers and bounded fetch, cancellation, cleanup tests — what the event loop keeps and what it drops." },
  { id = "M3", name = "capabilities", about = "The manifest is the law: readable paths, net destinations, budgets — enforced inside every op, tested with escapes." },
  { id = "M4", name = "supervise", about = "Worker processes, memory budgets, the hard-kill boundary a timeout future can never be." },
  { id = "M5", name = "stdlib wave 1", about = "First-party APIs as ops: embedded KV, media storage (Bunny.net + local), streaming uploads with evidence." },
  { id = "M6", name = "operate a real app", about = "A small webhook processor deployed on jsrt — updated, broken, inspected, rolled back. The guide's ship gate." },
  { id = "M7", name = "load and ship", about = "Cold-start p50/p95 on 1,000 scripts, op-boundary cost on 10,000 calls, one-hour timer/network soak — committed results." },
]
up_next = { milestone = "M1", step = "1.1", title = "The run lifecycle — classify every ending, exit-code contract, integration tests" }

[[extra.planned]]
milestone = "M1"
step = "1.1"
title = "The run lifecycle — classify every ending, exit-code contract, integration tests"
+++
