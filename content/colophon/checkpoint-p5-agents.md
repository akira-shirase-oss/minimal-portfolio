+++
title = "Checkpoint P5: agents propose; the platform enforces"
description = "The automation milestone's machinery landed end to end: a token can never approve a token-submitted changeset, budgets are reserved in Postgres before work starts, bulk jobs resume across worker crashes without duplicating, an adversarial eval suite gates at UNAUTHORIZED: 0 with a stored run, per-token request quotas throttle a noisy agent inside its own auth lookup, and the CLI speaks one versioned JSON contract — with `colophon mcp` serving the MCP server in-process."
date = 2026-11-04T16:30:00Z

[extra]
kind = "release"
milestone = "P5"
step = "enforcement, budgets, bulk, eval, quotas"
short_title = "Budgets, bulk jobs, eval gate, quotas, CLI contract"
# Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
tests = 699

[extra.summary]
goal = "Make the agent surface safe enough to expose: least-privilege tokens that can never self-approve, budgets counted where Postgres can prove them, mass work that survives crashes, and a gate that fails if any unauthorized action ever executes."
built = "agent_self_review refusal on any token→token approval path; api_token_limits + budget_reservations ledger with held/settled/uncertain states and a reconciling sweep; bulk_jobs/bulk_items manifests with per-item idempotent outcomes, worker advisory-lock drive and crash-safe resume; evals.rs — 10 adversarial cases against the real API and a real MCP stdio session; requests_per_minute enforced by a GCRA cell keyed per token, read inside the token's own locked row; CLI output contract v2 with --jsonl streaming and colophon mcp; L08 load evidence — one run measuring editorial latency beside a throttled agent and in a second project."
proof = ["UNAUTHORIZED: 0 across 10 cases × 3 trials — stored artifact perf/results/2026-11-04T141109.623685Z-evals.json", "F06 crash test caught a real resume bug (job stuck running when all items resolved before the crash) — fixed and re-proven", "k6 bulk: 10,011 req, 1,186/s, p99 112 ms vs 250 ms budget, zero failed", "k6 quotas: 20,010 req, 1,552/s — throttled arm 100% 429+Retry-After, under-quota arm 100% 200s, p99 79 ms", "L08 stored run: 72,432 req — agent 99.7% refused at ~600/s, editorial p95 x1.83 of baseline, project-B x1.86, HELD", "FOR SHARE→UPDATE upgrade deadlock on the publish path found and fixed (FOR NO KEY UPDATE)", "colophon mcp live stdio: initialize 2025-11-25, tools/list returns exactly the 18 safe tools"]
code = "akira-shirase-oss/colophon-cms · main @ a6ed4ce"
+++

P5 is the milestone the whole "agents propose; the platform enforces" line was bought for. Six
slices landed; the interesting ones are the ones that caught real bugs.

## The enforcement path, end to end

- **Self-approval closed (P5.1).** A project API token holding `content.review` +
  `content.publish` could previously submit → approve → publish its own changeset with no
  person in the loop. The refusal is **token-ness on both sides** — minting a second token is
  free, so "any token approves any token's proposal" is refused `agent_self_review`, not just
  same-token. Inside the transaction holding the changeset lock, so the submitter's kind can't
  move under it.
- **Budgets in the only place they can be proven (P5.2).** `api_token_limits` + a
  `budget_reservations` ledger: reserves happen inside the transaction that accepts the work
  (a rolled-back write owes no compensation), settle in the commit that records the outcome,
  and a 10-second worker sweep flags held rows that outlived anything that could run as
  `uncertain` — kept, counted, announced. The review pass found a latent publish-path deadlock
  (`FOR SHARE` → `UPDATE` upgrade race on `environments`) — fixed with `FOR NO KEY UPDATE`.
- **Bulk jobs that survive crashes (P5.3).** A job is a sealed manifest of exact entry ids +
  base revisions (≤10k items, chunked ≤100/1MiB); the worker claims it under an advisory lock
  and runs every item **as the submitter** in its own transaction — so a revoked token or
  demoted member stops the run honestly mid-job. The F06 crash test caught a real resume bug:
  kill the worker right after the last item commits and the restarted drive saw "no pending
  items" and exited *without checkpointing* — the job stayed `running` forever. Fixed, and the
  test proves a killed-after-final-item job now resumes to `done` without duplicating.
- **The adversarial gate (P5.4).** `evals.rs`: ten cases — all six spec abuse cases plus the
  token-privilege and MCP refusal surfaces — where the adversary is a scoped token against the
  real API (or a real `colophon-mcp` stdio session), never a mock. Every call is classified
  refused/permitted/unauthorized against typed oracles, then the owner verifies end state.
  Stored green run: `UNAUTHORIZED: 0` across 3 trials.
- **Request quotas (P5.5).** `requests_per_minute` is a rolling GCRA window keyed
  `colophon:quota:{project}:{token}` — read inside the token's *existing* locked auth row (a
  `LEFT JOIN api_token_limits`), so enforcement adds zero round trips. Over the ceiling: 429
  `rate_limited` + `Retry-After`, with `token.rate_limited` audited once per throttle episode.
  Members pay nothing — that's the L08 shape: the noisy agent is throttled while its editors
  keep their latency.
- **One machine contract (P5.6).** Every CLI command's `--json` is now the same versioned
  envelope `{"version":2,"command":…,"data"|"error"}`; API refusals pass through whole
  (`details.reason`, `request_id` intact). `--jsonl` streams list pages one envelope per item
  within a 1,000-page bound. `colophon mcp` links the MCP library in-process — same protocol,
  same 18 safe tools, same refusals — so the eval-proven boundary can't drift from a second
  binary.
- **L08, measured (P5.7).** The proof gate's last piece: `perf/k6/noisy-agent.js` runs two
  sequential phases in one run — editorial traffic alone, then the same traffic beside a
  60-rpm token attempting ~600/s, plus an editor in a *second* project the whole time. The
  stored run: the agent was **99.7% refused** (429 `rate_limited` + `Retry-After`), and the
  editors' p95 moved from 10.2 ms to 18.7 ms — ×1.83 of the run's own baseline, inside the
  spec's 2× bound — while the second project's editor held ×1.86 of its own. Throttling is
  real work (a locked-row read, a Valkey eval, an audit write), so the number that matters is
  that doing it 600 times a second doesn't move the people beside it. It doesn't.

## What the gate actually proves

The honest summary of this milestone is not "features shipped" but "a refusal that holds under
load, under crashes, and under an adversary who is *trying*": the eval run is a stored
artifact, the bulk scenario held p99 112 ms at 1,186/s, and the quota's k6 arm proves the
throttled token gets 429s while an under-quota token on the same server keeps a 79 ms p99.

P5's proof gate is now met on stored artifacts: X12's bulk resume in `tests/bulk.rs`, the
eval's `UNAUTHORIZED: 0` run, and L08's noisy-agent run. Still owed inside the milestone:
remote MCP with authorization (in flight), provider `tokens`/`cost` budgets, and
`content import`/`export` on the CLI. Then P6: backups, the 24-hour stress run, and v0.1.
