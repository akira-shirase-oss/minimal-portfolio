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
what = "A Rust + Svelte CMS that can prove what it published, designed in the open and built one proven milestone at a time — security pass merged, final check: ship."
link = "@/colophon/_index.md"
log = "colophon/_index.md"

[[extra.now]]
process = "service-monitor"
what = "A Rust uptime monitor that tells the truth — security pass done, final check: ship; a million API reads pass, a million checks can't run yet at 20 a second."
link = "@/service-monitor/_index.md"
log = "service-monitor/_index.md"

[[extra.now]]
process = "js-runtime"
what = "A purpose-built JavaScript host in Rust — V8 through deno_core; the engine borrowed, the capabilities and lifecycle ours. Final check: ship; all six M7 load runs re-run and passing."
link = "@/js-runtime/_index.md"
log = "js-runtime/_index.md"

[[extra.now]]
process = "minibtc"
what = "A Bitcoin-style blockchain built from scratch in Rust — consensus through the wallet UI; final check: ship; 6 of 6 million-op load runs pass, though the chain run measured only rejections."
link = "@/minibtc/_index.md"
log = "minibtc/_index.md"

[[extra.now]]
process = "durable-runner"
what = "Acknowledged work survives restarts — journaled, crash-tested, final review: ship; the sustained gate is green, 1,000,000 of 1,000,000 accepted."
link = "@/durable-runner/_index.md"
log = "durable-runner/_index.md"

[[extra.now]]
process = "payment-sandbox"
what = "Simulated money, real accounting: a journal PostgreSQL won't let anyone edit, two-phase payments, signed webhooks — M6 checkout and dashboard shipped; load runs owed."
link = "@/payment-sandbox/_index.md"
log = "payment-sandbox/_index.md"

[[extra.now]]
process = "ai-ops-layer"
what = "Telemetry that admits what it didn't see: one timeline per AI operation, with lost events shown as gaps — A0 done; the first million-event run missed on a busy machine."
link = "@/ai-operations-layer/_index.md"
log = "ai-operations-layer/_index.md"

[[extra.now]]
process = "voice-agent"
what = "A Mac voice assistant that keeps heard, inferred and executed apart — four review rounds; 7% of held-out claims undisclosed; mic drills owed."
link = "@/personal-voice-agent/_index.md"
log = "personal-voice-agent/_index.md"

[[extra.now]]
process = "intent-studio"
what = "Client brief to published website, starting with a contact form that kept every lead in a million-submission run with the provider down."
link = "@/intent-studio/_index.md"
log = "intent-studio/_index.md"

[[extra.now]]
process = "reconciliation"
what = "Every bank line matched, excluded or an exception, each decision explained — R0 done, a million lines in 8.28 s."
link = "@/accounting-reconciliation/_index.md"
log = "accounting-reconciliation/_index.md"

[[extra.now]]
process = "native-workspace"
what = "An optional, read-only Mac workbench for the services — N0 review fixes done; the million-event replay owed; it has to beat the terminal to continue."
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
about = "Bank lines matched, excluded or flagged, each decision explained: deterministic rules first, a model only proposes, people approve, a hash-chained audit trail. R0 done: a million lines in 8.28 s on the laptop, crash drills passing, second review: done. R1 next."
link = "@/accounting-reconciliation/_index.md"
year = 2026
status = "R0 done"

[[extra.projects]]
name = "Intent Studio"
about = "A service business's brief to a tested, published website. The lead-intake spine kept every acknowledged lead in 100,000- and 1,000,000-submission runs with the provider down; I0 is done pending a latency-budget decision. No site generation yet."
link = "@/intent-studio/_index.md"
year = 2026
status = "spine done"

[[extra.projects]]
name = "Personal Voice Agent"
about = "Push-to-talk on a Mac, all on-device, with heard, inferred and executed kept apart. Four review rounds; on held-out sentences 7% of completion claims get no disclosure, all answers to plain questions; live mic drills owed."
link = "@/personal-voice-agent/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "AI Operations Layer"
about = "One honest timeline per AI operation, gaps shown as gaps. A0 done after two reviews; the first million-event run missed on a busy machine and a quiet run is owed; A2 next."
link = "@/ai-operations-layer/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Payment Sandbox"
about = "Simulated money, real double-entry accounting enforced by PostgreSQL. M0–M6 built, including a hosted checkout and dashboard; the M6 review says ship after a restore double-charge fix; full load runs owed."
link = "@/payment-sandbox/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Native Workspace"
about = "An optional, read-only macOS workbench for the services. N0's review fixes are done, verified by a second pass, with three later follow-ups not yet reviewed; the million-event replay is owed; it continues only if it beats the terminal at one investigation."
link = "@/native-workspace/_index.md"
year = 2026
status = "exploration"

[[extra.projects]]
name = "Backend Platform"
about = "A self-hosted control plane for small apps. B0 done and the memo accepted with corrections: the next step is a copy-and-own starter template, not a platform."
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
about = "A Bitcoin-style blockchain built from scratch in Rust — consensus, UTXO set, P2P, mining, an HD wallet, JSON-RPC, an explorer and an MCP server that can inspect the chain and draft payments but never spend without a human. Security pass done, final check: ship; 6 of 6 million-op load runs pass, the chain run on rejections only (being fixed); CI on the head commit failed at the audit step, cause unknown."
link = "@/minibtc/_index.md"
year = 2026
status = "hardened"

[[extra.projects]]
name = "Durable Runner"
about = "A background-task runner where accepting a job is a durable commit: a framed file journal, one writer, at-least-once attempts, and crash recovery that admits what it cannot know. Rust, built in the open. Final review: ship; the sustained gate is green at 1,000,000 of 1,000,000."
link = "@/durable-runner/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "jsrt"
about = "A JavaScript runtime that is a host, not an engine: V8 through Deno's own deno_core, Rust owning capabilities, the lifecycle, and honest errors. Security pass done, final check: ship; all six M7 load runs re-run on the hardened build and passing."
link = "@/js-runtime/_index.md"
year = 2026
status = "hardened"

[[extra.projects]]
name = "Colophon CMS"
about = "A content management system that can prove what it published and survives being killed at any moment. Rust and Svelte, open source, every step logged here. Security pass merged, final check: ship; one CI load smoke miss is unexplained."
link = "@/colophon/_index.md"
year = 2026
status = "in progress"

[[extra.projects]]
name = "Service Monitor"
about = "Keeps an eye on your websites and tells you, honestly, when something breaks. Written in Rust, built in the open. Security pass done, final check: ship; a million API reads pass; a million checks can't run yet at 20 a second."
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
