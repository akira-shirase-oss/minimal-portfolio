+++
title = "Proving a noisy neighbor stays quiet: measuring isolation instead of asserting it"
description = "A token misbehaving at 600 requests a second shouldn't slow down the editors beside it. Colophon stopped asserting that and started measuring it — 99.7% refused, editorial p95 held within 2x."
date = 2026-11-05T09:00:00Z
+++

Every multi-tenant system makes the same quiet promise: one tenant's bad behaviour won't become everyone's problem.

Most codebases add a throttle and call it done. Colophon's spec asks for something harder — a *measurement*. Throttle the noisy agent, then prove the editors beside it keep their latency.

## The mechanism

API tokens get an optional `requests_per_minute` ceiling. Here's the detail worth stealing: the check rides the **same locked row that already proves the token is alive**.

When a token's transaction opens, authentication already locks the token's row. A `LEFT JOIN` to the limits table reads the ceiling in the same breath — so the quota check costs zero extra round trips.

Counting lives in a GCRA cell in the shared rate limiter, keyed `colophon:quota:{project}:{token}`. GCRA is the smooth variant: burn your whole minute's allowance at once and you earn one request every `window/requests` — a 60/minute token gets roughly one request a second, not a fresh bucket at the top of each minute.

Over the ceiling: `429` + `Retry-After`, with the audit log recording the episode's first refusal once.

The project sits in the key on purpose: one project's runaway agent can never eat another project's allowance. That's a claim the test has to prove — not assume.

## The measurement

`perf/k6/noisy-agent.js` runs one session in two phases:

1. **Baseline** — editors in project A read, list, search and save drafts at a steady rate. An editor in project B works normally.
2. **Under noise** — the exact same editorial traffic, plus an agent capped at 60/minute attempting ~600 requests a second.

Every request is tagged by arm, so the run compares each group against *its own* baseline. The gates: editorial p95 under noise must stay within 2× baseline, the agent's refused share must top 90%, and every 429 must carry `rate_limited` + `Retry-After`.

The stored run:

| | Result |
|---|---|
| Agent attempts | 35,998 at ~600/s — **99.7% refused** |
| Project A editorial p95 | 10.2 ms → 18.7 ms (**×1.83**) |
| Project B editorial p95 | 10.4 ms → 19.3 ms (**×1.86**) |
| Verdict | **HELD** — inside 2×, no cross-project starvation |

The scenario computes its own verdict: `handleSummary()` writes an `l08` object into the result file, and `scripts/load.sh` fails the run when `held` is false. Nobody gets to eyeball it.

## The honest part

Editors *did* get slower — p95 roughly doubled inside the bound.

That's real, and it should be. Each refusal still pays for the locked token-row read, the limiter check and an audit write. Running ~600 of those a second is supposed to be felt somewhere.

The requirement was never "zero effect." It's that the effect stays small, bounded, and stops at the project boundary — and that last part is why project B is in the run at all.

## The takeaway

A throttle that exists is a config flag. Isolation you can defend is a stored file with a measured verdict in it. Same feature, different standard of proof.
