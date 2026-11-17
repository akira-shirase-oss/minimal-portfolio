+++
title = "Progress"
description = "Every project on one page: what it is, where it stands on its main branch, what the latest independent review said, what's still owed and what's next. Dated, and updated with the build logs."
template = "progress.html"

[extra]
# Update this whenever a row changes. It's the time the rows were checked against each repo's main.
as_of = "2026-11-17 06:41 EST"

groups = [
  { id = "built", title = "The built projects", about = "Roadmaps done or nearly done. 2026-11-16 was their security and reliability pass: an outside gap review, then fix rounds, each checked by a second reviewer." },
  { id = "new", title = "Started on 2026-11-16", about = "Seven planned projects began code the same day, each in its own public repository. All are early, and none is usable yet." },
]

# One block per project. `stage` is what's on main; work on a branch is called out as such.
# `log` (optional) links the build log and its latest entry automatically.
[[extra.projects]]
id = "colophon"
group = "built"
name = "Colophon CMS"
what = "A Rust and Svelte content management system that can prove what it published: every publish is a numbered release with a receipt."
repo = "colophon-cms"
log = "colophon/_index.md"
stage = "P0–P7 built, pre-0.1. The security pass is merged at c1479c5. CI found four real bugs on the way, all fixed. main's first CI attempt missed one load smoke (session steady, p99 427.85 ms vs 200 ms) on a GitHub runner; a rerun passed, and the miss is unexplained."
review = "Branch review: fix first, with two new Highs in the fixes; both fixed. Final check of the merge: ship. Three accepted Lows are known limits."
owed = "An explanation for the session-steady miss; million-request runs for the changed audience, assets and media scenarios; a real managed-Postgres connection with full certificate checking; a 24-hour soak, usability sessions and an independent install before v0.1."
next = "Explain the CI miss, then the owed load runs and the soak."

[[extra.projects]]
id = "colophon-landing"
group = "built"
name = "Colophon landing page"
what = "Colophon's landing page and blog: a static Astro site, kept separate from the CMS."
repo = "colophon-landing"
live = "https://colophon-landing.pages.dev"
stage = "Live as a preview at colophon-landing.pages.dev, with green CI at f7be184. Its own domain, colophon.404human.dev, isn't attached yet."
review = "Two fact-check passes over its 14 posts: deploy after fixes, then deploy as is. The five Low items left were fixed."
owed = "Attaching the custom domain; later, moving its content into Colophon itself."
next = "Point colophon.404human.dev at it."

[[extra.projects]]
id = "service-monitor"
group = "built"
name = "Service Monitor"
what = "A Rust and SQLite uptime monitor with a SvelteKit dashboard that tells the truth about availability, including when it can't see."
repo = "monitoring-service"
log = "service-monitor/_index.md"
stage = "M0–M7 feature-complete. Security pass done, including the hardening the reviews wanted before public exposure; main at f953306, 279 tests, CI green. 1,000,000 of 1,000,000 API reads answered 200 (p99 32.623 ms)."
review = "Final check at 310f5f6: ship."
owed = "A way to run a million checks (at 20 checks a second that's about 14 hours); the commit-lag miss (p95 5,143 ms vs 5 s); the RUSTSEC-2026-0459 re-check by 2026-12-16; the freeze drill and systemd's slow-volume behaviour."
next = "The commit-lag miss, then the droplet."

[[extra.projects]]
id = "durable-runner"
group = "built"
name = "Durable Workflow Runner"
what = "A background-task runner where accepting a job is a durable commit: a framed file journal, one writer, at-least-once attempts."
repo = "durable-runner"
log = "durable-runner/_index.md"
stage = "D0–D3 done, D4 surface built. The sustained-load gate is green: 1,000,000 of 1,000,000 submits accepted and done, p99 41.2505 ms, server at cdbdfb8. main at e69f12f."
review = "Final review: ship."
owed = "The rest of the load battery; a second developer restoring a real journal unaided; a reverse proxy in front for any public exposure, as the operating guide says."
next = "The restore by a second developer."

[[extra.projects]]
id = "jsrt"
group = "built"
name = "jsrt"
what = "A purpose-built JavaScript host in Rust: V8 through deno_core, with the capabilities, the lifecycle and the errors owned by the host."
repo = "js-runtime"
log = "js-runtime/_index.md"
stage = "M0–M7 complete; security pass done, 156 tests. The M7 load battery re-run on the current build: all six pass (serve 1M at 86,620 rps, p99 467 µs). main at ad04128."
review = "Final check at 8baba4d: ship. No review of the load re-run."
owed = "The webhook drill on the current build; four load scenarios still to define (key-value, media, a refusal flood, supervisor churn)."
next = "The webhook drill, then the missing scenarios."

[[extra.projects]]
id = "minibtc"
group = "built"
name = "MiniBTC"
what = "A Bitcoin-style blockchain from scratch in Rust: consensus, P2P, mining, an HD wallet, RPC, an explorer, an MCP server and a web wallet, on a private devnet."
repo = "miniBTC-chain"
log = "minibtc/_index.md"
stage = "P0–P14 done; 290 tests at the reviewed build 3844afd, where 6 of 6 million-operation load runs pass. CI failed on the head commit eefa6c9 at the dependency-audit step; the cause isn't known yet."
review = "Final check at 3844afd: ship. One Low and one accepted trade-off open."
owed = "The head CI failure; the devnet demo on the final build; the MCP server can't yet explain a rejected transaction."
next = "Fix the head CI, then the demo."

[[extra.projects]]
id = "payment-sandbox"
group = "new"
name = "Payment Sandbox"
what = "Simulated money, real accounting: a double-entry journal PostgreSQL won't let anyone edit, two-phase payments against a separate simulated network, and signed webhooks."
repo = "payment-sandbox"
log = "payment-sandbox/_index.md"
stage = "M0–M6 built: three fix rounds, then a hosted checkout and an inspection dashboard. CI green at cba229f; the first checkout smokes passed after two harness failures (main at d0c6729). The project's rule keeps every milestone in progress until its full load run."
review = "M6 review: fix first (a restore could charge twice), then ship after the fix."
owed = "Every full ≥1,000,000-request run for M0–M6; saturation runs for unmeasured defaults; a few small open items."
next = "The full load runs, starting with the checkout, then M7."

[[extra.projects]]
id = "ai-operations-layer"
group = "new"
name = "AI Operations Layer"
what = "Telemetry that tells the truth about AI operations: one timeline per request, with lost events shown as gaps."
repo = "ai-operations-layer"
log = "ai-operations-layer/_index.md"
stage = "A0 done; A1 partly. 141 Rust tests and 12 browser journeys, CI green at 6e9a14b. The first 1,000,000-event run (630f533, busy machine) missed: 36,580 events shed, ingest p95 152 ms vs 100. main at 3071b24."
review = "Second review: fix first; final check: A0 done."
owed = "A 1,000,000-event run on a quiet machine with an independent baseline; two security residuals, to be described once fixed."
next = "The million-event run, then A2: Durable Runner as the first real host."

[[extra.projects]]
id = "personal-voice-agent"
group = "new"
name = "Personal Voice Agent"
what = "A push-to-talk voice assistant for the Mac, all on-device, that keeps heard, inferred and executed apart and can't act in your name."
repo = "personal-voice-agent"
log = "personal-voice-agent/_index.md"
stage = "First release (V0–V2) built, not shippable. Four review rounds' fixes merged at d6018ad, CI green. On held-out sentences, 5 of 70 completion claims (7%) get no disclosure, all answers to plain questions."
review = "Fourth pass, a short final check: not yet, close. The last merge hasn't been reviewed."
owed = "A review of the last merge; the 11 live microphone drills, which need a person; the latency budget (p95 2,036 ms vs 2,000); the million-unit runs and a long soak."
next = "The review, then the live drills."

[[extra.projects]]
id = "intent-studio"
group = "new"
name = "Intent Studio"
what = "A service business's brief in, a tested and published website out, starting with a contact form built so leads don't get lost."
repo = "intent-studio"
log = "intent-studio/_index.md"
stage = "I0 done pending the latency-budget decision. 1,000,000 submissions with the provider down: 950,000 leads stored once, 0 duplicates, p99 12.093 ms. main at c8ec3c3, CI green. Nothing generates a website yet."
review = "Final check: I0 done, pending the load evidence and the budget decision; the load runs have since passed."
owed = "The decision that sets the intake latency budget; then I1. The ship gate needs three pilot clients."
next = "The budget decision, then I1."

[[extra.projects]]
id = "accounting-reconciliation"
group = "new"
name = "Accounting Reconciliation"
what = "Every bank line matched, excluded or an exception, each decision explained and chained into an audit trail. It never moves money."
repo = "accounting-reconciliation"
log = "accounting-reconciliation/_index.md"
stage = "R0 done: 1,000,000 lines in 8.28 s on the laptop and 17.709 s on a GitHub runner, with the crash drills passing. main at af4c42c, 110 tests, CI green."
review = "Second review: done."
owed = "A 50 MiB wide-row file and a very large account measured; one or two practising accountants for the ship gate."
next = "R1: imports and the normalized schema."

[[extra.projects]]
id = "native-workspace"
group = "new"
name = "Native Workspace"
what = "An optional, read-only macOS workbench for the services, starting with Service Monitor."
repo = "native-workspace"
log = "native-workspace/_index.md"
stage = "Exploration. N0's review fixes are done; main at f4906c8, 116 XCTest cases, CI green. N0 stays in progress until the million-event replay runs."
review = "Second pass: fixes verified, four gaps, all since fixed."
owed = "The 1,000,000-event replay on a quiet machine; the native shell (N1); a read-only viewer token from Service Monitor; the comparison against the terminal that decides whether it continues."
next = "The replay, then N1."

[[extra.projects]]
id = "backend-platform"
group = "new"
name = "Backend Platform"
what = "A self-hosted control plane for small apps, assembled from proven components."
repo = "backend-platform"
log = "backend-platform/_index.md"
stage = "Parked, as a future horizon. B0 done and its fix round merged; main at e5fa6e4, 68 tests, CI green. The memo is accepted with corrections (D-036)."
review = "B0 review: memo accepted with corrections, spine fix first; the fixes haven't been re-reviewed."
owed = "A quiet-machine 100,000-request baseline and the 1,000,000-request run."
next = "B1-T: the copy-and-own starter template."
+++

Every project here, in one place. **Stage** is what's on the project's `main` branch; anything on a
branch is called in progress until it's merged. **Latest independent review** is a second agent's
verdict, in plain words, not mine. The numbers behind each line are in the build logs, with machine
and commit.

This page is updated by hand, so the time at the top is when every row was last checked.
