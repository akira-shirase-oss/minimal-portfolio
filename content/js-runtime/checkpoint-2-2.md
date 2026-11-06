+++
title = "Checkpoint 2.2: fetch, bounded on every axis"
description = "A per-op deadline, a streamed 4MiB body cap, and a destination allowlist — five tests against a real TCP stub pin every fetch outcome class, including the one people get wrong: a 500 is a result, not a crash."
date = 2026-11-07T20:15:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.2"
short_title = "Bounded fetch"
tests = 32

[extra.summary]
goal = "A network op a script cannot abuse — capability-gated destination, a deadline a slow endpoint can't outlive, a body cap a fat response can't cross — every outcome classified."
built = "--fetch-timeout flag → HostOptions::fetch_deadline → OpBudgets record in OpState (the shape future budgets hang off); op_fetch reads its deadline and cap from the budget, not constants."
proof = ["5 TCP-stub tests: declared → status+body; undeclared → 7; 3s-slow endpoint + 300ms deadline → HostError(8) 'deadline'; HTTP 500 → exit 0 with status=500 for the script; 5MiB body → HostError(8) 'exceeded' at the 4MiB cap"]
code = "akira-shirase-oss (local, not yet pushed) · 93b80b7"
+++

An unbounded `fetch` is three footguns in a trenchcoat: a destination the
script never declared, a peer that answers in geological time, and a body
that eats memory. This step bounds all three — and pins the one semantic
that trips everyone.

**The deadline is a knob, not a constant.** `FETCH_DEADLINE` was a hardcoded
10s — fine as a default, untestable in a suite that shouldn't wait ten
seconds per case. It's now carried in an `OpBudgets` record in `OpState`
(`--fetch-timeout` for drills) — deliberately shaped as *the record future
budgets hang off*, because M3's manifest needs quotas and M4's supervision
needs resource limits. One struct, one place ops look.

**What the stub proved.** A declared destination returns status and body —
the happy path exists. An undeclared one exits 7 — the manifest gates
destinations by parsed host:port, not string prefix. A 3-second endpoint
against a 300ms deadline dies classified `HostError` (8), not hung — the
deadline is on the *send*, so a slow response can't hold the op forever.
A 5MiB body is cut at the 4MiB cap — chunked streaming checked as it grows,
not buffered then measured.

**And the one people get wrong:** a 500 is a *result*. Fetch semantics —
the transport succeeded, the HTTP layer answered, the status is data for
the script. A monitor that treats 500 as an exception can't distinguish
"server is up and failing" from "can't connect" — that's the same honesty
split the service-monitor probe made, and it holds here: exit 0,
`status=500` for the script to decide on.

**Lesson:** bounded I/O isn't a feature flag, it's the difference between
"the op failed" and "the op is still out there doing who-knows-what." The
cap has to be enforced *while streaming*, or the limit arrives after the
memory's already gone.
