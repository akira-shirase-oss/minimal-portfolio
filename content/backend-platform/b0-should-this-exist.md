+++
title = "B0: I built the spine, then the memo said don't build the platform"
description = "Day one of the Backend Platform: a reconciler that looks before it creates, a drill that kills it at every step, a control API that answers 503 rather than invent a success, and two load smokes that missed. Then the evidence memo, which recommends staying parked. An independent review accepted the memo with corrections and sent the spine back: two duplicate paths and a database role that could get around the append-only log. The spine's fixes are landing; none has been re-reviewed."
date = 2026-11-16T20:47:00-05:00

[extra]
kind = "experiment"
milestone = "B0"
step = "memo"
short_title = "The spine, and a memo that says wait"

[extra.summary]
goal = "Answer \"starter template or platform?\" with evidence before building a platform, and prove the provisioning spine leaves no duplicates or orphans when it's killed mid-step."
built = "A pure domain and an operation log in PostgreSQL, a reconciler that observes before every create, a fault-injecting fake provider, an Axum control API, a k6 scenario that checks convergence on the provider's side, a pin check, and the B0 evidence memo."
proof = ["10,000 randomized fault schedules plus SIGKILL at every step: zero duplicates, zero orphans", "load smokes at 2,000 requests a second offered: 99.3% then 74.4% of scenario requests failed, thresholds missed", "convergence held in both: 10,000 provider resources for 10,000 planned, 0 duplicates", "review: memo accepted with corrections (one High); spine: fix first (one High)"]
code = "akira-shirase-oss/backend-platform · main @ 3bd0017 (reviewed at f8963c8)"
+++

Before you build a shed, it's worth asking whether you need a shed or just a bigger cupboard. This
milestone's job was to build the foundations *and* write down an honest answer to that question.

The answer came back: probably the cupboard.

## What I built

- **A pure domain**: deterministic names for everything a project gets, the plan, and the state machine
  for each operation and step. No I/O, enforced by an architecture check that's proven able to fail.
- **An operation log** in PostgreSQL. Operations are admitted with an in-flight cap and idempotency
  keys, workers claim them under a lease with a fencing token, each step is saved in one fenced
  statement, and every event is appended, never edited.
- **A reconciler** that looks before it creates, every time, and commits what it's about to do before
  it calls the provider.
- **A fake provider** that injects faults and deliberately *doesn't* enforce unique names, so a careless
  retry shows up as a duplicate instead of being quietly absorbed.
- **A control API** in Axum: put the desired state, get back the operation that will make it so. When
  its database is down it answers 503 fast and never invents a success.
- **A load scenario**: 80% reads and 20% writes at a fixed arrival rate, with the reconciler working
  against the fake provider under a seeded fault schedule, then a check on the provider's side that
  every resource exists exactly once.
- **The B0 memo**, and a check that every container image is pinned by digest and every CI action by
  commit.

## How it works (the short version)

Provisioning fails halfway all the time: the database got created, the bucket didn't, the worker died.
The usual fix is "retry", and a blind retry creates a second database. Here the reconciler always
**observes first**: before creating anything, it asks the provider whether it already exists, under the
deterministic name it would have. Then "retry" just means "carry on from where the evidence says we
are."

## Does it actually work?

- **The drill passes.** 10,000 randomized fault schedules in process, plus the real worker binary
  killed with `SIGKILL` at every step, with every provider fault against every kind of resource: zero
  duplicates, zero orphans. A deliberately blind-retry reconciler is caught by the same check.
- **The load smokes missed, and they're kept.** Both offered 2,000 requests a second on my development
  Mac (Apple M2 Pro, 12 cores, 32 GB) while other builds ran:

| | first smoke | second smoke |
|---|---:|---:|
| commit | `dbad75e` | `f6da1a7` |
| load average before | 65.14 | 25.66 |
| scenario requests (after 2,000 setup writes) | 96,120 | 99,490 |
| scenario requests failed | 99.3% (pool timeouts) | 74.4% (mostly shed with 503) |
| p95 / p99, all requests | 1,025.69 / 1,612.68 ms | 367.20 / 766.40 ms |
| provider resources, expected 10,000 | 10,000 | 10,000 |
| duplicates | 0 | 0 |

Under the overload, convergence held: every operation drained and every resource existed exactly
once. That's the property the design is for. The latency is a busy laptop running the load generator,
the server and Postgres together, so it says nothing about capacity in either direction.

## Where I messed up

An independent review read the memo and the spine the same evening, and each got one High.

**The memo: accept with corrections.** "Stay parked" is well supported. Its High: the memo said the
platform's rules forbid it from supplying accounts, and then left accounts out of the starter-template
option. But the rule forbids a *shared accounts service*, not copied code. The corrected template
option includes a copy-and-own accounts kit. The memo also stated the products' planned servers as if
they were already deployed, and misreported the smokes: my "requests" counted 2,000 setup writes, and
the first smoke's failures were pool timeouts, not shedding.

**The spine: fix first.** Its findings:

- **"Append-only in the database" wasn't true.** The triggers refuse a plain `UPDATE` or `DELETE`
  on the event log. But the server connected as a superuser that owns the tables, and that role can
  switch the triggers off or drop them, or tell PostgreSQL to skip them. On a scratch copy the
  reviewer rewrote an event in replica mode, deleted one with the trigger disabled, and truncated the
  log with the trigger dropped. (High.)
- **Two real duplicate paths the drill didn't cover.** A worker that pauses between "is it there?" and
  "create it", while another worker takes over the lease, creates anyway. And a provider that reports
  success after the caller has already timed out leaves a third resource for two planned, while the
  operation says `succeeded`. My drill ran one worker at a time against an instant fake, so it never
  produced either.
- **The architecture check could be bypassed** with an optional dependency behind a feature flag,
  and the log-capture test the rules require doesn't exist yet.

The drills themselves reproduced exactly. But of three deliberately broken versions of the code, the
drill caught only one; the other two were caught only by unit tests, with both drills still passing.

The fix round started straight away on `main`: a runtime role that can't rewrite the operation log, an
architecture check that reads the resolved dependency graph for every feature and target, a pinned
search path on the trigger, client-side deadlines on the worker's database calls, a lease check before
every provider call plus an idempotency key on every create, and lookups that report every match so a
duplicated name blocks instead of being adopted. None of it has been re-reviewed yet.

And from before the review: the first smoke failed 97% of its requests, and I couldn't see why from the logs: when the control
database was unavailable, the server dropped the underlying cause. I had to infer it. Now the full error
chain is logged. The cause was the 32-connection pool timing out while up to 512 requests queued for it.
The in-flight limit is now 128, four times the pool, so a request that could only wait in line is
turned away at once. Two lookups that took two database round trips now take one.

And a correction to the plan: MinIO, which the design named for file storage, was archived upstream
in April, so it's out.

## What it doesn't do yet

Almost everything a platform does. B0 is the spine and the memo. There are no projects, principals,
secrets, deployments, jobs or diagnostics yet, and there won't be unless the project is unparked.

The memo's reasoning, with the review's correction: the work the three products repeat most is
accounts, workspaces, tokens and onboarding. A shared login service would make every product depend on
one service, so the platform can't be that, but a copy-and-own accounts kit inside a starter template
can carry it. Self-hosted platforms in this direction also want about 4 GB of memory at minimum, while
each product is planned to run on a 2 GB server. So the memo recommends a copyable starter template for
now, and lists what would change the answer. The decision on it is still recorded as pending.

Owed: the rest of the fix round (drills that produce the two duplicate paths, the log-capture test,
the corrected memo) and a second review of it; a quiet-machine run of the 100,000-request baseline; and
the 1,000,000-request run.

## Up next

Finish the fix round, correct the memo, and get both re-reviewed. Then the decision on the memo. Until
then the project stays parked, and the starter template is the recommended next step.
