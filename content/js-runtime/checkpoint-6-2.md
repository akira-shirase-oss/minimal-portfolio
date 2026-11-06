+++
title = "Checkpoint 6.2: the drill found the bug it was built to find"
description = "The webhook app ran the ship gate verbatim — deploy, update, break, inspect, rollback — and step one exposed a real lifecycle bug: killing the supervisor orphaned the worker, which kept holding the port."
date = 2026-11-10T06:00:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.2"
short_title = "the webhook drill"
tests = 84

[extra.summary]
goal = "A real app on jsrt — rt.serve + rt.kv — through the guide's ship gate verbatim, every step committed evidence."
built = "examples/webhook/ run under jsrt supervise: dedup POSTs by delivery id, list keys by hook name, health check. drill.sh runs deploy -> update -> break -> inspect -> rollback; drill.log and the supervisor's own runs.jsonl are committed."
proof = ["v1: store d1 -> 'stored', repeat d1 -> 'duplicate', list -> both keys", "v2 update: same port rebinds cleanly, health reports v:2, prior KV data intact", "broken build: health and POST both answer 500, host stays up", "inspect: every respawn recorded terminated / signal 15 / exit 6 / killed_by operator-sigterm", "rollback: v1 restored, health v:1, data intact; pgrep finds zero jsrt processes and :9400 is free"]
code = "akira-shirase-oss (local, not yet pushed) · ecbc7dd"
+++

The whole point of a ship gate is that the last step proves the first
step's claims. So `examples/webhook/` is a real program — `rt.serve`
for the wire, `rt.kv` for durable state — and `drill.sh` runs the
guide's drill verbatim under `jsrt supervise`: deploy v1, update to
v2, ship a broken build, inspect the wreckage, roll back. The log it
writes is committed. The supervisor's own JSONL report is committed.
If the log ever lies, the report will say so.

## What the drill actually found

The first run failed at step one in a way the happy path never would
have shown: `kill $SUP` stopped the supervisor — and the worker kept
running. The orphaned worker still held `127.0.0.1:9400`, every
respawn died `Address already in use`, and the *old* process kept
answering health checks while the log faithfully reported the new
ones failing. The drill log was honest about the wreckage; the
architecture was wrong underneath it.

A supervisor that can't be stopped isn't supervision. The fix uses the
same two-stage kill the budgets already had: the supervisor arms
SIGTERM/SIGINT handlers that raise an atomic flag, the poll loop
forwards the signal to the worker, and the existing TERM→SIGKILL grace
covers a worker that won't take the hint. The report classifies it
`killed_by: "operator-sigterm"` — an operator shutdown is a distinct
event, not a mystery exit.

One placement decision mattered: the handlers arm *before* the worker
spawns, not after. A signal that lands while the child is still
exec'ing sets the flag and forwards the moment the loop starts —
otherwise there's a race window where "stop" does nothing and the
worker is born already orphaned. The only window left is the
supervisor's own startup, which no design removes.

## The test that proved it

`an_operator_sigterm_reaches_the_worker` kills on the supervisor's
readiness line — `"worker N running, signals forwarded"` — not on a
sleep. The first version of the test used a 600ms timer and kept
TERM-ing the supervisor inside its own startup window: the debug
binary is ~300MB, and under test load exec+dyld can eat the whole
delay. Signal-on-timer is a flake by construction; signal-on-readiness
is a fact. The test also asserts the worker pid is *actually dead*
(`kill -0`), not just reported dead — a live worker is what held the
port.

## The drill, clean

DEPLOY: `{"ok":true,"v":1}`, `stored hook/github/d1`, `duplicate`,
`stored hook/github/d2`, list returns both keys.
UPDATE: v2 binds the same port immediately (the old worker is really
gone), `v:2`, `["hook/github/d1","hook/github/d2"]` — data survived.
BREAK: every route 500s; the wire still answers.
INSPECT: `terminated`, `signal:15`, `exit_code:6`,
`killed_by:"operator-sigterm"` — one record per respawn.
ROLLBACK: v1 back, `v:1`, data intact. Final: no jsrt processes,
`:9400` free.

**Engineering lesson:** kill-on-a-timer is how lifecycle bugs hide.
The orphan bug survived every "it works" smoke test because nothing
ever tried to *stop* the thing politely — only the drill's verbatim
`kill $SUP` asked the question the code couldn't answer. Write the
test that sends the signal, then write the feature that survives it.
