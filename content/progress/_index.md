+++
title = "Progress"
description = "Every project on one page: what it is, where it stands on its main branch, what the latest independent review said, what's still owed and what's next. Dated, and updated with the build logs."
template = "progress.html"

[extra]
# Update this whenever a row changes. It's the time the rows were checked against each repo's main.
as_of = "2026-11-16 21:15 EST"

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
stage = "P0–P7 built, pre-0.1. main at 94e63c0: the Rust job is green again, but main's CI still fails on one flaky testbed spec (52 of 53). The security fixes (11 code fixes, npm bumps, the MIT licence) are on a pushed branch, not merged; its CI has failed on every push, from two code failures being fixed."
review = "Gap review: 56 gaps, 14 of them High, first among them a magic-link account takeover. The branch's own review: fix first. Ten of the eleven fixes close their hole, but two opened new Highs: a parser crash reachable by anyone who can sign in, and a sign-in-link ceiling one anonymous client can use up."
owed = "The branch review's two Highs and green branch CI, then a second review; the testbed flake; the load smokes and L-case runs on a quiet machine; a passing 24-hour soak; usability sessions and an independent install."
next = "Fix the branch's two Highs and its CI, then merge, the 24-hour soak and version 0.1."

[[extra.projects]]
id = "colophon-landing"
group = "built"
name = "Colophon landing page"
what = "Colophon's landing page and blog: a static Astro site, kept separate from the CMS."
repo = "colophon-landing"
live = "https://colophon-landing.pages.dev"
stage = "Live as a preview at colophon-landing.pages.dev, with a real 404 page, a hash-based content security policy and green CI at f7be184. Its own domain, colophon.404human.dev, isn't attached yet."
review = "Two fact-check passes over its 14 posts: the first said deploy after fixes, the second said deploy as is. The five Low items it left were fixed the same evening."
owed = "Attaching the custom domain; later, moving its content into Colophon itself."
next = "Point colophon.404human.dev at it."

[[extra.projects]]
id = "service-monitor"
group = "built"
name = "Service Monitor"
what = "A Rust and SQLite uptime monitor with a SvelteKit dashboard that tells the truth about availability, including when it can't see."
repo = "monitoring-service"
log = "service-monitor/_index.md"
stage = "M0–M7 feature-complete. Security pass merged in four reviewed rounds (tests 137 → 215). A late verification round merged at ceb7339 with fixes for the last review's findings and hosted CI; it records 253 tests passing locally and in CI."
review = "Fourth pass: ship, with one Medium (the load harness defaulted to the live monitor's port) and four Lows. The late round fixes all five, each with a test shown failing first, and hasn't been reviewed yet."
owed = "A review of the late round; at least 1,000,000 checks and API requests on a release build; a 24-hour soak on this build; RUSTSEC-2026-0459, waiting on an sqlx release under a dated exception to 2026-12-16; a first run of the systemd unit on a real Linux host."
next = "Review the late round, then the million checks, the soak and the droplet."

[[extra.projects]]
id = "durable-runner"
group = "built"
name = "Durable Workflow Runner"
what = "A background-task runner where accepting a job is a durable commit: a framed file journal, one writer, at-least-once attempts."
repo = "durable-runner"
log = "durable-runner/_index.md"
stage = "D0–D3 done, D4 surface built. Group commit and three reviewed rounds (tests 26 → 96). A late round merged at 5e99465: the truncation fix (frame version 2), about a dozen more fixes and hosted CI; its kill -9 drill lost 0 of 25,201 acknowledged submits. The sustained-load gate is still red."
review = "Third pass: every earlier finding closed and no acknowledged job lost in 48 kill -9 rounds, but it found an older High, a corrupted frame length truncating later records. The late round's fix for it hasn't been reviewed."
owed = "A review of the late round; the 1,000,000-submit sustained battery on a quiet machine; a second developer restoring a real journal; a Linux memory measurement; rate limits on reads."
next = "Review the late round, then the sustained battery."

[[extra.projects]]
id = "jsrt"
group = "built"
name = "jsrt"
what = "A purpose-built JavaScript host in Rust: V8 through deno_core, with the capabilities, the lifecycle and the errors owned by the host."
repo = "js-runtime"
log = "js-runtime/_index.md"
stage = "M0–M7 complete. Security pass done in four reviewed rounds (tests 84 → 130), then a verification round merged at f035c90: a regression test for every unproven defence and CI on Linux and macOS, 140 tests. Its first Linux CI run failed and was fixed; CI is green on both."
review = "Fourth pass: ship, with three Low items. The verification round takes on two of them and is under independent review now."
owed = "The verification round's review; serve 1M, saturation, webhook 1M, the soak and cold start re-run on the hardened build on a quiet machine; three gap-review Highs (the default timeout for serve apps, a SIGTERM drain, redacted worker logs)."
next = "Finish the review, then re-measure."

[[extra.projects]]
id = "minibtc"
group = "built"
name = "MiniBTC"
what = "A Bitcoin-style blockchain from scratch in Rust: consensus, P2P, mining, an HD wallet, RPC, an explorer, an MCP server and a web wallet, on a private devnet."
repo = "miniBTC-chain"
log = "minibtc/_index.md"
stage = "P0–P13b built. Four security rounds merged; its own gate, found red at the start of the day, passes with 249 tests, and the devnet demo passes 22 of 22. Fixes for the last review's two findings are in progress on a branch that isn't pushed yet."
review = "Fourth pass: the catch-up and deep-fork fixes hold live. One Medium (a ban doesn't close the banned peer's open connection) and one Low (a peer that withholds blocks can stall sync for 60 seconds) are open on main."
owed = "Pushing and reviewing the ban and withholding fixes; CI; the 1M-operation load run and the UI load run at HEAD; the MCP server can't yet explain a rejected transaction; a README status refresh."
next = "Push and review the branch, then CI and the load runs."

[[extra.projects]]
id = "payment-sandbox"
group = "new"
name = "Payment Sandbox"
what = "Simulated money, real accounting: a double-entry journal PostgreSQL won't let anyone edit, two-phase payments against a separate simulated network, and signed webhooks."
repo = "payment-sandbox"
log = "payment-sandbox/_index.md"
stage = "M0–M5 built and drilled, functional gates passing; the project's own rule keeps them in progress until the full load runs. First fix round in (5 Highs, 5 Mediums); a second round on four Mediums is under way, one fixed so far. main at 8ac070f."
review = "M0–M5: the lifecycle is solid, fix five accounting Highs before M6. Those and five Mediums are fixed on main; none of the fixes has been re-reviewed."
owed = "Three open Mediums (unbounded-cost reports, reconciler head-of-line blocking, one project's dead webhook slowing others) and four Lows; a second review; all seven full million-request load runs (9 of 16 smokes so far failed their thresholds); a scripted restore rehearsal."
next = "Finish the second fix round and get it reviewed, then M6: a hosted checkout and a dashboard."

[[extra.projects]]
id = "ai-operations-layer"
group = "new"
name = "AI Operations Layer"
what = "Telemetry that tells the truth about AI operations: one timeline per request, with lost events shown as gaps."
repo = "ai-operations-layer"
log = "ai-operations-layer/_index.md"
stage = "A0 built, A1 partly: a reference host, the failure cases end to end, browser journeys, a PostgreSQL restart drill. 115 tests in the gate at 8d74d3f."
review = "A0–A1: the spine is real, fix six Highs before A2. All six and six Mediums are fixed on main, not yet re-reviewed, and the test proving one High has failed on CI three times, so it's flaky."
owed = "One open Medium (a refused event doesn't say why); a steady flood test; a second review; README and roadmap updates; the 1,000,000-event run on a quiet machine; moving the console to Tailwind and shadcn-svelte."
next = "A second review, then A2: Durable Runner as the first real host."

[[extra.projects]]
id = "personal-voice-agent"
group = "new"
name = "Personal Voice Agent"
what = "A push-to-talk voice assistant for the Mac, all on-device, that keeps heard, inferred and executed apart and can't act in your name."
repo = "personal-voice-agent"
log = "personal-voice-agent/_index.md"
stage = "First release (V0–V2) built, not shippable. Seventeen fixes merged at 5da3b38; a second fix round is running."
review = "Second pass: fix first. Four of the five Highs and the second-instance fix are confirmed closed. Still open: the \"done\" guard speaks 32 of 40 ordinary completion claims outside its test set, a service hung between turns isn't noticed, \"Delete history\" leaves the last two transcripts in the model's recap, and the docs left out two failed ledger smokes."
owed = "The second fix round and another review; live microphone drills that need a person; the model's first sentence (p95 1,954 ms; release to first audio p95 2,036 ms against a 2,000 ms budget); one shared audio engine for echo cancellation; the million-unit load runs and a long soak."
next = "The second fix round, then the live drills."

[[extra.projects]]
id = "intent-studio"
group = "new"
name = "Intent Studio"
what = "A service business's brief in, a tested and published website out, starting with a contact form built so leads don't get lost."
repo = "intent-studio"
log = "intent-studio/_index.md"
stage = "I0, the lead-intake spine, built at e1cc6f4: durable intake, the outbox notifier, the operator inbox, drills passing in CI. Gate not passed: the quiet-machine baseline and full load runs are owed. Nothing generates a website yet."
review = "I0: fix first. No lead was lost, duplicated or falsely acknowledged in any test, but connections can be held open forever, honeypot bots spend a site's quota, and the outbox lease is fenced per process instead of per claim."
owed = "The review's fixes; a quiet-machine baseline, the 100,000-submission run against it and the 1,000,000-submission run (the burst rerun held; the 100,000 run kept every lead but missed p99). Then people: three pilot clients, a model provider and spending cap, a privacy notice and data agreements, deploy access."
next = "Fix the review's findings and run the baseline, then I1."

[[extra.projects]]
id = "accounting-reconciliation"
group = "new"
name = "Accounting Reconciliation"
what = "Every bank line matched, excluded or an exception, each decision explained and chained into an audit trail. It never moves money."
repo = "accounting-reconciliation"
log = "accounting-reconciliation/_index.md"
stage = "R0 in progress at 49a90cc: the pure domain, a strict CSV reader, the database schema with a staged import, and a command line with a seeded statement generator."
review = "None yet."
owed = "The server skeleton, the kill-mid-import and database-down drills, the 1,000,000-line import, and a review; one or two practising accountants for the ship gate; a model provider for real runs."
next = "Finish R0, then a review."

[[extra.projects]]
id = "native-workspace"
group = "new"
name = "Native Workspace"
what = "An optional, read-only macOS workbench for the services, starting with Service Monitor."
repo = "native-workspace"
log = "native-workspace/_index.md"
stage = "Exploration. N0 built at b0e3554: the Swift package, a pure core, a GET-only transport, the Service Monitor adapter, a first window, a replay tool, 75 XCTest cases, CI, and drills against real services. Gate not passed until the million-event replay runs."
review = "Its first independent review is running."
owed = "The review; the 1,000,000-event replay on a quiet machine; the native shell (N1); a read-only viewer token from Service Monitor; the pre-registered comparison against the terminal that decides whether it continues."
next = "The review and the replay, then N1."

[[extra.projects]]
id = "backend-platform"
group = "new"
name = "Backend Platform"
what = "A self-hosted control plane for small apps, assembled from proven components."
repo = "backend-platform"
log = "backend-platform/_index.md"
stage = "Parked, as a future horizon. B0 built: the spine, the partial-provisioning drill, the control API, the first load scenario and the evidence memo. The review's fix round is landing on main (now at 3bd0017)."
review = "B0: the memo is accepted with corrections (its High: it left the accounts work out of the template option); the spine is fix first (its High: the server's database role could get around the append-only log), with two duplicate paths the drill didn't cover. The fixes haven't been re-reviewed."
owed = "The rest of the fix round (the log-capture test, the corrected memo) and a second review; the decision on the memo, still recorded as pending; a quiet-machine 100,000-request baseline and the 1,000,000-request run (both smokes so far missed on a busy laptop)."
next = "Finish the fix round and correct the memo, then the decision. Nothing past B0 unless the project is unparked."
+++

Every project here, in one place. **Stage** is what's on the project's `main` branch; anything on a
branch is called in progress until it's merged. **Latest independent review** is a second agent's
verdict, in plain words, not mine. The numbers behind each line are in the build logs, with machine
and commit.

This page is updated by hand, so the time at the top is when every row was last checked.
