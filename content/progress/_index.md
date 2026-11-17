+++
title = "Progress"
description = "Every project on one page: what it is, where it stands on its main branch, what the latest independent review said, what's still owed and what's next. Dated, and updated with the build logs."
template = "progress.html"

[extra]
# Update this whenever a row changes. It's the time the rows were checked against each repo's main.
as_of = "2026-11-16 21:20 EST"

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
stage = "P0–P7 built, pre-0.1. On 2026-11-16 main's CI and testbed were made honest again; the security fixes (11 code fixes, npm bumps, the MIT licence) are on a pushed branch, not merged."
review = "Gap review: 56 gaps, 14 of them High, first among them a magic-link account takeover. The security branch hasn't had its own independent review yet."
owed = "A full gate run and an independent review of the security branch; the testbed flake after the outage spec; the load smokes and L-case runs on a quiet machine; a passing 24-hour soak; usability sessions and an independent install."
next = "Review and merge the security branch, then the 24-hour soak and version 0.1."

[[extra.projects]]
id = "colophon-landing"
group = "built"
name = "Colophon landing page"
what = "Colophon's landing page and blog: a static Astro site, kept separate from the CMS."
repo = "colophon-landing"
live = "https://colophon-landing.pages.dev"
stage = "Live as a preview at colophon-landing.pages.dev. Its own domain, colophon.404human.dev, isn't set up yet."
review = "Two fact-check passes over its 14 posts: the first said deploy after fixes, the second said deploy as is, with 5 Low items left."
owed = "The custom domain; later, moving its content into Colophon itself."
next = "Point colophon.404human.dev at it."

[[extra.projects]]
id = "service-monitor"
group = "built"
name = "Service Monitor"
what = "A Rust and SQLite uptime monitor with a SvelteKit dashboard that tells the truth about availability, including when it can't see."
repo = "monitoring-service"
log = "service-monitor/_index.md"
stage = "M0–M7 feature-complete. Security pass merged in four rounds; tests went from 137 to 215. CI and guarded load-harness ports are on a pushed branch, not merged."
review = "Fourth pass: ship. Four Low findings left: catch-up after a long freeze, a failed mount not retried, a reused-process-id signal, and the --help exit code."
owed = "At least 1,000,000 checks and API requests on a release build; a 24-hour soak on this build; RUSTSEC-2026-0459, waiting on an sqlx release under a dated exception to 2026-12-16; a first run of the systemd unit on a real Linux host."
next = "Merge CI, run the monitor's own million checks, then the soak and the droplet."

[[extra.projects]]
id = "durable-runner"
group = "built"
name = "Durable Workflow Runner"
what = "A background-task runner where accepting a job is a durable commit: a framed file journal, one writer, at-least-once attempts."
repo = "durable-runner"
log = "durable-runner/_index.md"
stage = "D0–D3 done, D4 surface built. Group commit and three review rounds merged; 96 tests. The sustained-load gate is still red."
review = "Third pass: every earlier finding closed and no acknowledged job lost in 48 kill -9 rounds, but it found an older High: a corrupted frame length truncates the records after it. The fix is being written and isn't on main."
owed = "The frame-header fix and its review; the 1,000,000-submit sustained battery on a quiet machine; a second developer restoring a real journal; a Linux memory measurement; CI."
next = "Land the frame-header fix, then the sustained battery."

[[extra.projects]]
id = "jsrt"
group = "built"
name = "jsrt"
what = "A purpose-built JavaScript host in Rust: V8 through deno_core, with the capabilities, the lifecycle and the errors owned by the host."
repo = "js-runtime"
log = "js-runtime/_index.md"
stage = "M0–M7 complete. Security pass done in four rounds (tests 84 → 130), then a verification round merged late on 2026-11-16: a regression test for every unproven defence, CI on Linux and macOS, 140 tests."
review = "Fourth pass: ship, with three Low items. The verification round takes on two of them and hasn't been reviewed yet."
owed = "Serve 1M, saturation, webhook 1M, the soak and cold start, re-run on the hardened build on a quiet machine. Three gap-review Highs: the default timeout for serve apps, a SIGTERM drain, and redacted worker logs."
next = "Review the verification round, then re-measure."

[[extra.projects]]
id = "minibtc"
group = "built"
name = "MiniBTC"
what = "A Bitcoin-style blockchain from scratch in Rust: consensus, P2P, mining, an HD wallet, RPC, an explorer, an MCP server and a web wallet, on a private devnet."
repo = "miniBTC-chain"
log = "minibtc/_index.md"
stage = "P0–P13b complete. Security pass: four rounds merged; the full gate passes with 249 tests, and the devnet demo passes 22 of 22."
review = "Fourth pass: the catch-up and deep-fork fixes hold live. One Medium left (a ban doesn't close the banned peer's open connection) and one Low (a peer that withholds blocks can stall sync for 60 seconds)."
owed = "The 1M-operation load run and the UI load run at HEAD; CI; the MCP server can't yet explain a rejected transaction; a README status refresh."
next = "Close a banned peer's connection, then CI and the load runs."

[[extra.projects]]
id = "payment-sandbox"
group = "new"
name = "Payment Sandbox"
what = "Simulated money, real accounting: a double-entry journal PostgreSQL won't let anyone edit, two-phase payments against a separate simulated network, and signed webhooks."
repo = "payment-sandbox"
log = "payment-sandbox/_index.md"
stage = "M0–M5 built and drilled, functional gates passing; the project's own rule keeps them in progress until the full load runs. The review's five accounting Highs and three card-number findings are fixed on main."
review = "M0–M5: the lifecycle is solid, five accounting Highs to fix before M6. All five are now fixed on main. The reviewer's own chaos run found no double charge."
owed = "Open Mediums (unauthenticated simulator control endpoints in the release binary, unbounded-cost reports); all seven full million-request load runs; a scripted restore rehearsal."
next = "M6: a hosted checkout and a dashboard, on SvelteKit, Tailwind and shadcn-svelte."

[[extra.projects]]
id = "ai-operations-layer"
group = "new"
name = "AI Operations Layer"
what = "Telemetry that tells the truth about AI operations: one timeline per request, with lost events shown as gaps."
repo = "ai-operations-layer"
log = "ai-operations-layer/_index.md"
stage = "A0 built, A1 partly: a reference host, the failure cases end to end, browser journeys. 100 tests in the gate."
review = "A0–A1: the spine is real, six Highs to fix before A2. All six are now fixed on main, plus two Mediums."
owed = "The remaining Mediums (a header-read timeout, the name budget, redaction coverage, refusal reasons, SIGTERM); README and roadmap updates; the 1,000,000-event run on a quiet machine; moving the console to Tailwind and shadcn-svelte."
next = "A2: Durable Runner as the first real host."

[[extra.projects]]
id = "personal-voice-agent"
group = "new"
name = "Personal Voice Agent"
what = "A push-to-talk voice assistant for the Mac, all on-device, that keeps heard, inferred and executed apart and can't act in your name."
repo = "personal-voice-agent"
log = "personal-voice-agent/_index.md"
stage = "First release (V0–V2) built, not shippable. The review's fix round (seventeen fixes, each with a test that failed first) merged on 2026-11-16."
review = "V0–V2: the core holds (350 kill -9s, nothing acknowledged lost), but five High app, process and disk bugs, including a silent assistant after a crash and a microphone left recording. The fixes haven't been re-reviewed yet."
owed = "A second review of the fixes; live microphone drills that need a person; the model's first-sentence latency (p95 2,036 ms on the fixed build, against a 2,000 ms budget); one shared audio engine for echo cancellation; the million-unit load runs."
next = "Re-review the fixes, then the live drills."

[[extra.projects]]
id = "intent-studio"
group = "new"
name = "Intent Studio"
what = "A service business's brief in, a tested and published website out, with a contact form whose leads survive a dead notification provider."
repo = "intent-studio"
log = "intent-studio/_index.md"
stage = "I0, the lead-intake spine, built: durable intake, the outbox notifier, the operator inbox and the drills. Nothing generates a website yet."
review = "None yet."
owed = "A valid burst rerun, the realism check on a quiet machine (it missed p99 on a busy one), the 1,000,000-submission run, and an independent review. Then people: three pilot clients, a model provider and spending cap, a privacy notice and data agreements, and deploy access."
next = "Finish I0's load evidence, then a review, then I1."

[[extra.projects]]
id = "accounting-reconciliation"
group = "new"
name = "Accounting Reconciliation"
what = "Every bank line matched, excluded or an exception, each decision explained and chained into an audit trail. It never moves money."
repo = "accounting-reconciliation"
log = "accounting-reconciliation/_index.md"
stage = "R0 started: the pure domain, a strict CSV reader, the database schema with a staged import, and a command line with a seeded statement generator."
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
stage = "Exploration. N0 slices 1–3: the Swift package, a pure core, a GET-only transport, the Service Monitor adapter, a first window, a replay tool and CI."
review = "None yet."
owed = "The 1,000,000-event replay on a quiet machine; profiler traces of the fixed event-list freeze; the native shell (N1); a read-only viewer token from Service Monitor; the pre-registered comparison against the terminal that decides whether it continues."
next = "Finish N0's evidence, then N1."

[[extra.projects]]
id = "backend-platform"
group = "new"
name = "Backend Platform"
what = "A self-hosted control plane for small apps, assembled from proven components."
repo = "backend-platform"
log = "backend-platform/_index.md"
stage = "Parked, as a future horizon. B0 built: the spine, the partial-provisioning drill, the control API, the first load scenario and the evidence memo."
review = "B0 review: the memo is accepted with corrections; the spine is fix first, with two Highs (the server's database role could get around the append-only log; the memo left out the accounts work) and two duplicate paths the drill didn't cover."
owed = "The review's fixes and a corrected memo; a decision on it; a quiet-machine 100,000-request baseline and the 1,000,000-request run (both smokes so far missed on a busy laptop)."
next = "Nothing past B0 unless the project is unparked."
+++

Every project here, in one place. **Stage** is what's on the project's `main` branch; anything on a
branch is called in progress until it's merged. **Latest independent review** is a second agent's
verdict, in plain words, not mine. The numbers behind each line are in the build logs, with machine
and commit.

This page is updated by hand, so the time at the top is when every row was last checked.
