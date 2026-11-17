+++
title = "Progress"
description = "Every project on one page: what it is, where it stands on its main branch, what the latest independent review said, what's still owed and what's next. Dated, and updated with the build logs."
template = "progress.html"

[extra]
# Update this whenever a row changes. It's the time the rows were checked against each repo's main.
as_of = "2026-11-16 23:16 EST"

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
stage = "P0–P7 built, pre-0.1. main at 94e63c0: the Rust job is green, but main's CI still fails on one flaky testbed spec. The security fixes are on a pushed branch, still unmerged; its CI fixes and the fixes for its review are in progress."
review = "Gap review: 56 gaps, 14 of them High. The branch's independent review said fix first; the fixes are in progress. Security details will be described once they're merged."
owed = "The branch's fixes, green branch CI and a second review; the testbed flake; the load smokes and L-case runs on a quiet machine; a passing 24-hour soak; usability sessions and an independent install."
next = "Finish and merge the security branch, then the 24-hour soak and version 0.1."

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
stage = "M0–M7 feature-complete. The security round and its follow-up are merged; main at 697d168, 275 tests, CI green."
review = "Independent review: ship on loopback. One remaining hardening item before public exposure is being fixed."
owed = "That hardening item; at least 1,000,000 checks and API requests on a release build; a 24-hour soak on this build; RUSTSEC-2026-0459, waiting on an sqlx release under a dated exception to 2026-12-16; a first run of the systemd unit on a real Linux host."
next = "The hardening item, then the million checks, the soak and the droplet."

[[extra.projects]]
id = "durable-runner"
group = "built"
name = "Durable Workflow Runner"
what = "A background-task runner where accepting a job is a durable commit: a framed file journal, one writer, at-least-once attempts."
repo = "durable-runner"
log = "durable-runner/_index.md"
stage = "D0–D3 done, D4 surface built. Journal frame version 2, the security round and two follow-up rounds are merged; main at cdbdfb8, 146 tests, CI green. The sustained-load gate is still red until the battery re-runs."
review = "Final independent review: ship."
owed = "The 1,000,000-submit sustained battery on a quiet machine; a reverse proxy in front for any public exposure, as the operating guide says; a second developer restoring a real journal; a Linux memory measurement."
next = "The sustained battery on a quiet machine."

[[extra.projects]]
id = "jsrt"
group = "built"
name = "jsrt"
what = "A purpose-built JavaScript host in Rust: V8 through deno_core, with the capabilities, the lifecycle and the errors owned by the host."
repo = "js-runtime"
log = "js-runtime/_index.md"
stage = "M0–M7 complete. The security round and two follow-up rounds are merged; main at 8baba4d, 156 tests, CI green on Linux and macOS."
review = "Final independent review: ship."
owed = "The M7 load numbers predate these changes: serve 1M, saturation, webhook 1M, the soak and cold start have to be re-run on a quiet machine."
next = "Re-measure the million-scale load evidence on the hardened build."

[[extra.projects]]
id = "minibtc"
group = "built"
name = "MiniBTC"
what = "A Bitcoin-style blockchain from scratch in Rust: consensus, P2P, mining, an HD wallet, RPC, an explorer, an MCP server and a web wallet, on a private devnet."
repo = "miniBTC-chain"
log = "minibtc/_index.md"
stage = "P0–P13b built, plus a security verification round (P14) with CI, merged; main at 1254bd7, 281 tests, CI green, devnet demo 22 of 22."
review = "The latest independent review found one new High-severity issue, in the new peer scoring; it's being fixed and will be described once merged."
owed = "That fix; the 1M-operation load run and the UI load run at HEAD; the MCP server can't yet explain a rejected transaction."
next = "Fix and merge the peer-scoring issue, then the load runs."

[[extra.projects]]
id = "payment-sandbox"
group = "new"
name = "Payment Sandbox"
what = "Simulated money, real accounting: a double-entry journal PostgreSQL won't let anyone edit, two-phase payments against a separate simulated network, and signed webhooks."
repo = "payment-sandbox"
log = "payment-sandbox/_index.md"
stage = "M0–M5 built and drilled, functional gates passing; the project's own rule keeps them in progress until the full load runs. Two fix rounds merged and a restore rehearsal added; main at cbe863b, CI green."
review = "First review: fix first; its findings went through two fix rounds. A second independent review is running."
owed = "The second review; all seven full million-request load runs (9 of 16 smokes so far failed their thresholds)."
next = "The second review, then M6: a hosted checkout and a dashboard."

[[extra.projects]]
id = "ai-operations-layer"
group = "new"
name = "AI Operations Layer"
what = "Telemetry that tells the truth about AI operations: one timeline per request, with lost events shown as gaps."
repo = "ai-operations-layer"
log = "ai-operations-layer/_index.md"
stage = "A0 built and re-closed after its fix round; A1 partly. main at 1870bca, CI green."
review = "First review: fix first, six Highs; the fix round is merged. A second independent review is running."
owed = "The second review; the 1,000,000-event run on a quiet machine; moving the console to Tailwind and shadcn-svelte."
next = "The second review, then A2: Durable Runner as the first real host."

[[extra.projects]]
id = "personal-voice-agent"
group = "new"
name = "Personal Voice Agent"
what = "A push-to-talk voice assistant for the Mac, all on-device, that keeps heard, inferred and executed apart and can't act in your name."
repo = "personal-voice-agent"
log = "personal-voice-agent/_index.md"
stage = "First release (V0–V2) built, not shippable. The second fix round is merged; main at d880a5e, CI green."
review = "Third independent review: two items being fixed; they'll be described once merged."
owed = "Those two fixes; live microphone drills that need a person; the model's first-sentence latency against the 2,000 ms budget; one shared audio engine for echo cancellation; the million-unit load runs and a long soak."
next = "The two fixes, then the live drills."

[[extra.projects]]
id = "intent-studio"
group = "new"
name = "Intent Studio"
what = "A service business's brief in, a tested and published website out, starting with a contact form built so leads don't get lost."
repo = "intent-studio"
log = "intent-studio/_index.md"
stage = "I0, the lead-intake spine, built; a fix round for its review is running on main (now 894af30). Gate not passed: the quiet-machine baseline and full load runs are owed. Nothing generates a website yet."
review = "I0: fix first. No lead was lost, duplicated or falsely acknowledged in any test; the fixes are in progress and will be described once merged."
owed = "The fix round; a quiet-machine baseline, the 100,000-submission run against it and the 1,000,000-submission run. Then people: three pilot clients, a model provider and spending cap, a privacy notice and data agreements, deploy access."
next = "Finish the fix round and run the baseline, then I1."

[[extra.projects]]
id = "accounting-reconciliation"
group = "new"
name = "Accounting Reconciliation"
what = "Every bank line matched, excluded or an exception, each decision explained and chained into an audit trail. It never moves money."
repo = "accounting-reconciliation"
log = "accounting-reconciliation/_index.md"
stage = "R0 built at df8cf2f, including a full run of 1,000,000 lines in 17.7 s with no errors on a 4-core GitHub-hosted runner (a CI-runner observation, not capacity). Back in progress for its review's fix round (main now a5c66a2)."
review = "R0: fix first; the fix round is running."
owed = "The fix round and a second review; one or two practising accountants for the ship gate; a model provider for real runs."
next = "Finish the fix round, then R1: imports and the normalized schema."

[[extra.projects]]
id = "native-workspace"
group = "new"
name = "Native Workspace"
what = "An optional, read-only macOS workbench for the services, starting with Service Monitor."
repo = "native-workspace"
log = "native-workspace/_index.md"
stage = "Exploration. N0 built; a fix round for its review is running on main (now f82540b). Gate not passed until the million-event replay runs."
review = "N0: fix first; the fixes are in progress and will be described once merged."
owed = "The fix round; the 1,000,000-event replay on a quiet machine; the native shell (N1); a read-only viewer token from Service Monitor; the pre-registered comparison against the terminal that decides whether it continues."
next = "Finish the fix round and the replay, then N1."

[[extra.projects]]
id = "backend-platform"
group = "new"
name = "Backend Platform"
what = "A self-hosted control plane for small apps, assembled from proven components."
repo = "backend-platform"
log = "backend-platform/_index.md"
stage = "Parked, as a future horizon. B0 built and its fix round merged; main at e5fa6e4, CI green. The B0 memo is accepted with corrections (D-036), which also moves the starter template into this repository."
review = "B0 review: the memo accepted with corrections, the spine fix first; the spine's fix round is merged."
owed = "A quiet-machine 100,000-request baseline and the 1,000,000-request run (both smokes so far missed on a busy laptop)."
next = "B1-T: the starter template."
+++

Every project here, in one place. **Stage** is what's on the project's `main` branch; anything on a
branch is called in progress until it's merged. **Latest independent review** is a second agent's
verdict, in plain words, not mine. The numbers behind each line are in the build logs, with machine
and commit.

This page is updated by hand, so the time at the top is when every row was last checked.
