+++
title = "404human"

[extra]
# The build logs, main project first. Each is a section using series.html. The home
# page draws one panel per log; the terminal's `tail` shows the newest entry of any.
logs = ["colophon/_index.md", "service-monitor/_index.md", "js-runtime/_index.md", "minibtc/_index.md", "durable-runner/_index.md", "payment-sandbox/_index.md", "ai-operations-layer/_index.md", "personal-voice-agent/_index.md", "intent-studio/_index.md", "accounting-reconciliation/_index.md", "native-workspace/_index.md", "backend-platform/_index.md"]

# "Status": what's running now, drawn as live processes on the home page.
# `log = "<section>/_index.md"` fills in that build log's step and test count by
# itself; `writing = true` counts the write-ups. `detail` is shown as written.
[[extra.now]]
process = "colophon"
what = "A Rust + Svelte CMS that can prove what it published, designed in the open and built one proven milestone at a time."
link = "@/colophon/_index.md"
log = "colophon/_index.md"

[[extra.now]]
process = "service-monitor"
what = "A Rust uptime monitor that tells the truth — feature-complete, security round merged, 275 tests; one hardening item before public exposure, and its own million-check run, are owed."
link = "@/service-monitor/_index.md"
log = "service-monitor/_index.md"

[[extra.now]]
process = "js-runtime"
what = "A purpose-built JavaScript host in Rust — V8 through deno_core; the engine borrowed, the capabilities and lifecycle ours. Security rounds merged, final review: ship; load evidence owed again."
link = "@/js-runtime/_index.md"
log = "js-runtime/_index.md"

[[extra.now]]
process = "minibtc"
what = "A Bitcoin-style blockchain built from scratch in Rust — consensus through the wallet UI; security verification and CI merged, one new High being fixed."
link = "@/minibtc/_index.md"
log = "minibtc/_index.md"

[[extra.now]]
process = "durable-runner"
what = "Acknowledged work survives restarts — journaled, crash-tested, frame v2 and security rounds merged, final review: ship; the sustained-load gate waits on the 1M battery."
link = "@/durable-runner/_index.md"
log = "durable-runner/_index.md"

[[extra.now]]
process = "payment-sandbox"
what = "Simulated money, real accounting: a journal PostgreSQL won't let anyone edit, two-phase payments, signed webhooks fulfilled once — two fix rounds merged, second review running."
link = "@/payment-sandbox/_index.md"
log = "payment-sandbox/_index.md"

[[extra.now]]
process = "ai-ops-layer"
what = "Telemetry that admits what it didn't see: one timeline per AI operation, with lost events shown as gaps — fix round merged, second review running."
link = "@/ai-operations-layer/_index.md"
log = "ai-operations-layer/_index.md"

[[extra.now]]
process = "voice-agent"
what = "A Mac voice assistant that keeps heard, inferred and executed apart — second fix round merged, two review items being fixed; mic drills owed."
link = "@/personal-voice-agent/_index.md"
log = "personal-voice-agent/_index.md"

[[extra.now]]
process = "intent-studio"
what = "Client brief to published website, starting with a contact form that kept every lead in its drills; review fix round running."
link = "@/intent-studio/_index.md"
log = "intent-studio/_index.md"

[[extra.now]]
process = "reconciliation"
what = "Every bank line matched, excluded or an exception, each decision explained — R0 built, review fix round running."
link = "@/accounting-reconciliation/_index.md"
log = "accounting-reconciliation/_index.md"

[[extra.now]]
process = "native-workspace"
what = "An optional, read-only Mac workbench for the services — N0 built, review fix round running; it has to beat the terminal to continue."
link = "@/native-workspace/_index.md"
log = "native-workspace/_index.md"

[[extra.now]]
process = "rust-knowledge-base"
what = "Claude Code studying the whole Rust Book, checked by exams the AI can’t see."
link = "@/posts/i-made-an-ai-read-the-rust-book.md"
detail = "final exam 59/59"

[[extra.now]]
process = "writing"
what = "Every experiment written up here, including the parts that didn’t work."
writing = true

# Projects, newest first. Copy a block to add one.
# link: a web address, or "@/posts/<file>.md" for one of your posts.
# status: one or two words, e.g. "live", "shipped", "write-up", "in progress".
[[extra.projects]]
name = "Accounting Reconciliation"
about = "Bank lines matched, excluded or flagged, each decision explained: deterministic rules first, a model only proposes, people approve, a hash-chained audit trail. R0 built, including a 1M-line run on a CI runner with no errors; its review's fix round is running."
link = "@/accounting-reconciliation/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Intent Studio"
about = "A service business's brief to a tested, published website. The lead-intake spine is built and kept every lead in its drills; its review's fix round is running and its full load runs are owed. No site generation yet."
link = "@/intent-studio/_index.md"
year = 2026
status = "spine only"

[[extra.projects]]
name = "Personal Voice Agent"
about = "Push-to-talk on a Mac, all on-device, with heard, inferred and executed kept apart. First release built; second fix round merged, a third review has two items being fixed; live mic drills owed."
link = "@/personal-voice-agent/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "AI Operations Layer"
about = "One honest timeline per AI operation, gaps shown as gaps. A0 re-closed after its fix round; a second review is running; the million-event run is owed."
link = "@/ai-operations-layer/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Payment Sandbox"
about = "Simulated money, real double-entry accounting enforced by PostgreSQL. M0–M5 built and drilled, two fix rounds merged, a second review running; full load runs owed; M6 next."
link = "@/payment-sandbox/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Native Workspace"
about = "An optional, read-only macOS workbench for the services. N0 is built and its review's fix round is running; it continues only if it beats the terminal at one investigation."
link = "@/native-workspace/_index.md"
year = 2026
status = "exploration"

[[extra.projects]]
name = "Backend Platform"
about = "A self-hosted control plane for small apps. B0 built and its fix round merged; the memo is accepted with corrections, so the next step is a copy-and-own starter template."
link = "@/backend-platform/_index.md"
year = 2026
status = "parked"

[[extra.projects]]
name = "Colophon landing page"
about = "Colophon's own landing page and blog, a separate Astro site. Live as a preview at colophon-landing.pages.dev; its own domain isn't attached yet."
link = "https://colophon-landing.pages.dev"
year = 2026
status = "preview live"

[[extra.projects]]
name = "MiniBTC"
about = "A Bitcoin-style blockchain built from scratch in Rust — consensus, UTXO set, P2P, mining, an HD wallet, JSON-RPC, an explorer and an MCP server that can inspect the chain and draft payments but never spend without a human. Security verification and CI merged, 281 tests; one new High being fixed; load runs at HEAD owed."
link = "@/minibtc/_index.md"
year = 2026
status = "hardening"

[[extra.projects]]
name = "Durable Runner"
about = "A background-task runner where accepting a job is a durable commit: a framed file journal, one writer, at-least-once attempts, and crash recovery that admits what it cannot know. Rust, built in the open. Frame v2 and security rounds merged, final review: ship; the sustained-load gate waits on the 1M battery."
link = "@/durable-runner/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "jsrt"
about = "A JavaScript runtime that is a host, not an engine: V8 through Deno's own deno_core, Rust owning capabilities, the lifecycle, and honest errors. Security rounds merged, final review: ship, 156 tests; the million-scale load evidence has to be re-run on the hardened build."
link = "@/js-runtime/_index.md"
year = 2026
status = "hardened"

[[extra.projects]]
name = "Colophon CMS"
about = "A content management system that can prove what it published and survives being killed at any moment. Rust and Svelte, open source, every step logged here. Security fixes on an unmerged branch, their CI and review fixes in progress."
link = "@/colophon/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Service Monitor"
about = "Keeps an eye on your websites and tells you, honestly, when something breaks. Written in Rust, built in the open. Security round merged, review: ship on loopback, one hardening item before public exposure; its own million-check run and a fresh soak are owed."
link = "@/service-monitor/_index.md"
year = 2026
status = "hardened"

[[extra.projects]]
name = "Teaching an AI Rust"
about = "Claude studied the entire Rust Book, then took hidden-test exams with no compiler. 59/59 on a final test full of decoys."
link = "@/posts/i-made-an-ai-read-the-rust-book.md"
year = 2026
status = "write-up"

[[extra.projects]]
name = "This site"
about = "This portfolio and build log: built with Zola, drawn like a small control room, with real numbers from the posts. No tracking."
link = "https://github.com/akira-shirase-oss/minimal-portfolio"
year = 2026
status = "live"
+++

# hey, I *break* things.

Then I fix them, and write down what I learned. Mostly Rust: runtimes, background jobs, AI tools. All in public, mistakes included.
