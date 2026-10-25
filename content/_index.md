+++
title = "404human"

[extra]
# The build logs, main project first. Each is a section using series.html. The home
# page draws one panel per log; the terminal's `tail` shows the newest entry of any.
logs = ["colophon/_index.md", "service-monitor/_index.md"]

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
what = "A Rust uptime monitor that tells the truth, built one tested checkpoint at a time."
link = "@/service-monitor/_index.md"
log = "service-monitor/_index.md"

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
name = "Colophon CMS"
about = "A content management system that can prove what it published and survives being killed at any moment. Rust and Svelte, open source, every step logged here."
link = "@/colophon/_index.md"
year = 2026
status = "design"

[[extra.projects]]
name = "Service Monitor"
about = "Keeps an eye on your websites and tells you, honestly, when something breaks. Written in Rust, built in the open, one tested step at a time."
link = "@/service-monitor/_index.md"
year = 2026
status = "in progress"

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

# hey, <span class="hello-face" aria-hidden="true"></span> I *break* things.

Then I fix them, and write down what I learned. Mostly Rust: runtimes, background jobs, AI tools. All in public, mistakes included.
