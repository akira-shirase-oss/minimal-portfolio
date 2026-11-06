+++
title = "Checkpoint 6.1: the host was never inside the handler"
description = "rt.serve — a capability-gated HTTP listener. Pull-model dispatch: hyper owns the wire, the script's own event loop drives dispatch, and a crashing handler is just a JS exception in a loop the host owns."
date = 2026-11-10T03:00:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.1"
short_title = "rt.serve"
tests = 83

[extra.summary]
goal = "An HTTP listener that obeys the capability law — the webhook app's foundation, where a crashing handler cannot take the host down."
built = "manifest \"serve\": {host, port, max_body} (loopback IP literals only) or --serve; hyper owns the wire; the script drives dispatch via await op_serve_next -> handler -> op_serve_respond."
proof = ["handler throws on /boom -> 500 on that request, the very next request answers 201", "4KB body vs 64B cap -> 413 on the wire and the handler's seen-count stays at zero", "no serve line -> CapabilityError exit 7; wrong port -> 'not the declared listener'", "0.0.0.0 grant -> manifest parse error, loopback-only enforced before anything binds"]
code = "akira-shirase-oss (local, not yet pushed) · 1b8271f"
+++

Every earlier `rt.*` op shares one shape: the script calls out, the host
answers, done. A server inverts that — traffic arrives from outside and
has to get *in*. The design question M6.1 had to answer: who drives the
dispatch?

The push model (Rust calls the JS handler per request) would put the
host inside script exceptions on every request — a panicking or
infinitely-looping handler becomes the host's problem on the wire's
clock. The pull model inverts it: the script's own event loop asks for
work. `await op_serve_next` returns a dispatched request, the handler
runs inside normal JS semantics — `try/catch`, `await`, the works —
and `op_serve_respond` writes the answer back. A crashing handler is a
JavaScript exception inside a loop the host already owns: the
`try/catch` in bootstrap turns it into a 500, and the loop lives. The
test doesn't take my word for it — `/boom` answers 500 and the *next
request* answers 201.

hyper owns the wire: keep-alive, request-line parsing, partial reads,
pipelined requests on one connection — all its problem, all tested at
scale by everyone else. Between hyper and the script sit three bounds:
16 KiB head buffer, the grant's `max_body` (over-limit → 413 on the
wire, before the script ever sees the request — the test counts handler
invocations and the rejected one never arrives), and a 64-deep dispatch
channel. Past 64 in-flight, `send()` awaits — the backlog lives in TCP
where a backlog belongs, not in an unbounded Rust Vec.

## The capability shape

`"serve": {"host": "127.0.0.1", "port": 8080, "max_body": N}` — and the
host must be a loopback IP literal. v1 refuses `0.0.0.0` at manifest
parse, before anything binds: a script that wants to be a public
service earns that when the threat model for it is written, not by
default today. Binding a different address than declared is a
`CapabilityError` naming both; binding on an occupied port is a
`HostError`.

## What the smoke test caught

Two real bugs before the suite ever ran. First: `tokio::task::spawn_local`
panics inside ops — deno_core's executor is not a `LocalSet`. The
listener tasks now spawn via `deno_core::unsync::spawn`, the !Send
spawner deno_core ships for exactly this. Second: a startup race in my
own test harness (`status:000` curl before bind finished) — the port
was fine, the test was impatient; the suite now polls until connect
succeeds.

**Engineering lesson:** error isolation is a placement decision, not a
recovery strategy. The host survives handler crashes not because
anything catches them cleverly, but because the host was never inside
the handler — the crash happens in the script's loop, on script terms,
classified by script semantics. If a bug can't reach you, you don't
have to handle it.
