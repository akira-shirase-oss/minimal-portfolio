+++
title = "Day 0: borrow the engine, write the host"
description = "A JavaScript runtime is two projects pretending to be one — an engine and a host. We borrow the engine (V8, through Deno's own embedding crate) and write everything else ourselves."
date = 2026-11-07T10:00:00Z

[extra]
kind = "experiment"
milestone = "M0"
step = "0.1"
short_title = "Borrow the engine"
tests = 4

[extra.summary]
goal = "A purpose-built JavaScript host in Rust — capabilities, lifecycle and honest errors owned by us; the engine borrowed from Deno's own deno_core."
built = "Cargo workspace (jsrt CLI + jsrt-host lib); rt.* namespace over six ops; error taxonomy with per-class exit codes; capability manifest skeleton; an isolate watchdog that can actually kill a CPU-bound script."
proof = ["live: hello.js runs (hostInfo + print + async sleep) → exit 0; missing file → 3; syntax error → 4; uncaught throw → 5 — every ending classified on the wire", "4 unit tests (capability allowlists, error naming); integration suite is step 1.1's job"]
code = "akira-shirase-oss (local, not yet pushed)"
+++

The third project in the pack, and the first one that is a learning exercise
on purpose. The plan guide is blunt about its role: *a bounded systems
exercise — it must not block either product, and nothing else may depend on
it until it is proven.* That framing is a gift: it means the goal is depth,
not breadth.

**A runtime is two projects.** There is an engine — the thing that parses and
executes JavaScript — and there is a host — everything around it: which files
it may read, where it may send packets, how long it may run, how it dies.
V8 is 600,000 lines of C++ we will never beat and should never try to.
So the engine is borrowed: `deno_core`, the same crate the Deno CLI is built
on, pins a tested V8 and gives a `JsRuntime` that maps Promises onto Tokio
futures. The host — the part that is actually the project — is ours.

**What "ours" means so far.** A `jsrt` CLI and a `jsrt-host` library. Scripts
see exactly one namespace, `rt.*` — `print`, `hostInfo`, `now`, `sleep`,
`readText`, `fetch` — each a Rust op, no ambient `Deno`. Errors are
classified, not stringified: load (3), syntax (4), exception (5), terminated
(6), capability (7), host (8). And the timeout is real: a watchdog thread
calls V8's `terminate_execution` on a deadline — the mechanism that stops a
`while(1){}` where a `tokio::timeout` never could, because a CPU-bound script
never yields the thread back to the executor.

**The decision we did not take:** writing our own backend language. That is
a compiler project measured in years — Deno, Node and Bun all skipped it.
The honest version of "our own backend" is a stdlib: first-party ops like
`rt.kv` and `rt.media.upload()` (Bunny.net, capability-gated, streamed) that
make the host feel like its own platform. That lands in M5, after the core
earns it.

**Proof so far:** the scaffold is real — `hello.js` executes (host info,
print, an async `rt.sleep`) and every planned error class already exits with
its own code on the wire. Four unit tests cover the capability allowlists;
the integration suite that will pin the taxonomy is the next checkpoint's job,
not a claim made here.

**Lesson:** "build a runtime" is a trap until you split it. The engine is a
dependency decision (pin it, verify it, never rewrite it); the host is the
engineering — capabilities, lifecycle, failure taxonomy. Most projects that
die building a runtime die confusing the two.
