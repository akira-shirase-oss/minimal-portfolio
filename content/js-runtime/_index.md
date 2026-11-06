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
  { id = "M0", name = "scaffold", about = "Workspace, pinned deno_core + V8, the rt.* namespace, an error taxonomy where every way a run ends has its own exit code, and an isolate watchdog that can actually kill a CPU-bound script." },
  { id = "M1", name = "execute", about = "The run lifecycle proven end to end (every exit class reproducible, including uncaught CapabilityError → 7 and watchdog kill → 6); real module semantics — imports between files, honest load errors; the op boundary measured (cold-start p50/p95, 10k op calls) with numbers recorded, never oversold." },
  { id = "M2", name = "async host", about = "setTimeout/clearTimeout/setInterval over op_sleep with real cancellation; bounded fetch — stream-capped body, per-op deadline, classified stalls; and teardown that proves nothing outlives its runtime (promises, timers, handles)." },
  { id = "M3", name = "capabilities", about = "The manifest is the law, read fresh in every op — declared read paths canonicalized, net destinations checked by authority, budgets per entry point; then the escape suite: .., symlinks, userinfo, port and scheme tricks, all refused." },
  { id = "M4", name = "supervise", about = "Isolates in worker processes with OS-enforced memory and CPU budgets — the hard boundary a timeout future can never be; a memory bomb dies classified 'terminated', not as a process abort." },
  { id = "M5", name = "stdlib wave 1", about = "First-party APIs as ops: rt.kv — an embedded, namespaced, quota'd key-value store; rt.media — streamed content-addressed uploads to Bunny.net or local disk, where a mid-upload failure reports 'uncertain', never 'uploaded'." },
  { id = "M6", name = "operate a real app", about = "rt.serve — a capability-gated HTTP listener; then the guide's ship gate verbatim: a small webhook processor deployed on jsrt, updated, broken, inspected, rolled back — every step committed evidence." },
  { id = "M7", name = "load and ship", about = "Cold start on 1,000 scripts (p50/p95 + steady RSS), op overhead on 10,000 calls, a one-hour timers/network soak for retained handles — committed results with machine and commit; laptop numbers stay lab numbers." },
]
up_next = { milestone = "M1", step = "1.1", title = "The run lifecycle — every exit class reproducible end to end" }

# M1 — execute
[[extra.planned]]
milestone = "M1"
step = "1.1"
title = "The run lifecycle — CARGO_BIN_EXE tests pin every exit class (load 3, syntax 4, exception 5, terminated 6, capability 7, host 8)"

[[extra.planned]]
milestone = "M1"
step = "1.2"
title = "Real module semantics — imports between files, and a load error that names the failing specifier"

[[extra.planned]]
milestone = "M1"
step = "1.3"
title = "The op boundary, measured — cold-start p50/p95 over N runs, 10k op calls; committed perf/results JSON"

# M2 — async host
[[extra.planned]]
milestone = "M2"
step = "2.1"
title = "Timers — setTimeout/clearTimeout/setInterval over op_sleep; cancellation actually cancels; a pending timer can't hang the loop"

[[extra.planned]]
milestone = "M2"
step = "2.2"
title = "Bounded fetch — stream-capped body, per-op deadline, slow and 5xx and oversized responses all classified"

[[extra.planned]]
milestone = "M2"
step = "2.3"
title = "Retained resources — what a script leaves open is tracked; runtime teardown leaves no zombie work"

# M3 — capabilities
[[extra.planned]]
milestone = "M3"
step = "3.1"
title = "The manifest completes — paths, destinations, budgets per entry point; ops read it fresh, never cached"

[[extra.planned]]
milestone = "M3"
step = "3.2"
title = "The escape suite — .., symlinks, userinfo, port and scheme tricks; every documented bypass refused"

# M4 — supervise
[[extra.planned]]
milestone = "M4"
step = "4.1"
title = "Worker processes — an isolate per process, supervised, with OS-enforced CPU and memory budgets"

[[extra.planned]]
milestone = "M4"
step = "4.2"
title = "The memory boundary — a heap bomb dies bounded and classified 'terminated'; the supervisor lives to report it"

# M5 — stdlib wave 1
[[extra.planned]]
milestone = "M5"
step = "5.1"
title = "rt.kv — embedded KV, per-script namespace, quota'd; every KV op is a capability line like any other"

[[extra.planned]]
milestone = "M5"
step = "5.2"
title = "rt.media — streamed content-addressed uploads (Bunny.net edge + local backend); a mid-upload failure says 'uncertain', never 'uploaded'"

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
