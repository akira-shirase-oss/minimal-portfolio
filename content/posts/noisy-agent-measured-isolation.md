+++
title = "Proving a noisy neighbor stays quiet: measuring isolation instead of asserting it"
description = "A token misbehaving at 600 requests a second shouldn't slow down the editors beside it. Colophon stopped asserting that and started measuring it — 99.7% refused, editorial p95 held within 2x."
date = 2026-11-05T09:00:00Z
+++

Every multi-tenant system makes the same quiet promise: one tenant's bad behaviour won't become everyone's problem. Most codebases enforce a throttle and call the promise kept. Colophon's spec asks for something harder — a *measurement*: throttle the noisy agent, and prove the editors beside it keep their latency.

## The mechanism first

API tokens get an optional `requests_per_minute` ceiling. The enforcement detail worth knowing: the check rides the **same locked database row that already proves the token is alive**. When a token-scoped transaction opens, authentication already takes a `FOR SHARE` lock on the token's row — a `LEFT JOIN` to the limits table hands the ceiling to the same read, so the quota check costs zero extra round trips.

The counting itself is a GCRA cell in the shared rate limiter, keyed `colophon:quota:{project}:{token}`. GCRA is the smooth variant: burn the whole minute's allowance at once and you earn one request every `window/requests` after — a token at 60/minute gets roughly one request a second, not a fresh bucket at the top of each minute. Over the ceiling: `429` + `Retry-After`, and the audit log hears the episode's first refusal once.

The project is in the key for a reason: one project's runaway agent can never eat another project's allowance. That's the claim the test has to *prove*, not assume.

## The measurement

`perf/k6/noisy-agent.js` runs one session in two sequential phases:

1. **Baseline** — editors in project A read, list, search and save drafts at a steady rate, while an editor in project B works normally.
2. **Under noise** — identical editorial traffic, plus an agent whose token is capped at 60/minute attempting ~600 requests a second.

Every request is tagged by arm, so the run compares each group against its own baseline. The gates: editorial p95 under noise must stay within 2× of its own baseline (plus a small scheduler-jitter epsilon), the agent's refused share must exceed 90%, and every 429 is checked for `rate_limited` + `Retry-After`.

The stored run (`perf/results/2026-11-04T154012Z-noisy-agent-steady-apple-m2-pro-12c.json`):

- Agent attempts: 35,998 at ~600/s — **99.7% refused**
- Project A editorial p95: 10.2 ms baseline → 18.7 ms under noise (**×1.83**)
- Project B editorial p95: 10.4 ms → 19.3 ms (**×1.86**)
- Verdict: **HELD** — both ratios inside the 2× bound, no cross-project starvation

The comparison is computed by the scenario itself: `handleSummary()` writes an `l08` object into the result file, and `scripts/load.sh` fails the run if `held` is false. An eyeballed "looks fine" can't produce the artifact.

## What the number actually means

Notice the honest part: editors did get slower — p95 roughly doubled inside the bound. A refusal isn't free; each one still pays for the locked token-row read, the limiter check and an audit write. Running ~600 of those a second *should* be felt. The requirement isn't "zero effect" — it's that the effect stays small and bounded, and that it stops at the project boundary.

That's the difference between a throttle that exists and an isolation property you can put in a portfolio: one is a config flag, the other is a stored file with a measured verdict.
