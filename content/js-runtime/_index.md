+++
title = "jsrt: the build log"
description = "A purpose-built JavaScript host in Rust — V8 through deno_core, where the engine is borrowed and everything that matters is ours: the capabilities, the lifecycle, the honest errors, the ops. Built in the open, one proven milestone at a time."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "early build — M5 stdlib done; M6 (a real app) next"
short_title = "jsrt"
milestones = [
  { id = "M0", name = "scaffold", about = "Workspace, pinned deno_core + V8, the rt.* namespace, an error taxonomy where every way a run ends has its own exit code, and an isolate watchdog that can actually kill a CPU-bound script." },
  { id = "M1", name = "execute", about = "The run lifecycle proven end to end (every exit class reproducible, including uncaught CapabilityError → 7 and watchdog kill → 6); real module semantics — imports between files, honest load errors; the op boundary measured (cold-start p50/p95, 10k op calls) with numbers recorded, never oversold." },
  { id = "M2", name = "async host", about = "setTimeout/clearTimeout/setInterval over op_sleep with real cancellation; bounded fetch — stream-capped body, per-op deadline, classified stalls; and teardown that proves nothing outlives its runtime (promises, timers, handles)." },
  { id = "M3", name = "capabilities", about = "The manifest is the law — and now the loader is inside the fence too: JsrtModuleLoader gates every import at resolve()+load() through declared read paths plus the entry's own dir; then the escape suite found a real hole (the authority parser and reqwest disagreed on \\@), fixed so the checked host is the connected host." },
  { id = "M4", name = "supervise", about = "jsrt supervise: the runtime runs in a child and the parent enforces what it can't enforce on itself — CPU seconds by pre_exec rlimit, resident memory by footprint polling (RLIMIT_AS rejected, V8's pointer cage makes it unbootable), a wall backstop, and JSONL diagnostics that rotate and name their dropped count." },
  { id = "M5", name = "stdlib wave 1", about = "First-party APIs as ops: rt.kv — an embedded, namespaced, quota'd key-value store; rt.media — streamed content-addressed uploads to Bunny.net or local disk, where a mid-upload failure reports 'uncertain', never 'uploaded'." },
  { id = "M6", name = "operate a real app", about = "rt.serve — a capability-gated HTTP listener; then the guide's ship gate verbatim: a small webhook processor deployed on jsrt, updated, broken, inspected, rolled back — every step committed evidence." },
  { id = "M7", name = "load and ship", about = "Cold start on 1,000 scripts (p50/p95 + steady RSS), op overhead on 10,000 calls, a one-hour timers/network soak for retained handles — committed results with machine and commit; laptop numbers stay lab numbers." },
]
up_next = { milestone = "M6", step = "6.1", title = "rt.serve — a capability-gated HTTP listener; a crashing handler can't take the host down" }

# M6 — operate a real app
[[extra.planned]]
milestone = "M6"
step = "6.1"
title = "rt.serve — a capability-gated HTTP listener; a crashing handler can't take the host down"

[[extra.planned]]
milestone = "M6"
step = "6.2"
title = "The webhook app — deployed on jsrt, updated, broken, inspected, rolled back; the guide's ship gate verbatim"

# M7 — load and ship
[[extra.planned]]
milestone = "M7"
step = "7.1"
title = "Cold start — 1,000 short scripts, p50/p95 startup and steady RSS, recorded with machine and commit"

[[extra.planned]]
milestone = "M7"
step = "7.2"
title = "The op boundary at scale — 10,000 host calls, overhead measured on the same build"

[[extra.planned]]
milestone = "M7"
step = "7.3"
title = "The soak — one hour of timers/network workload; retained handles and RSS drift written up, failures included"
+++
