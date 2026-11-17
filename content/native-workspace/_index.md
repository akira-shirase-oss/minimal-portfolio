+++
title = "Native Workspace: the build log"
description = "An optional, time-boxed exploration: a native macOS workbench for the other projects' services, starting with Service Monitor, that has to beat the terminal at one investigation workflow to earn a future. Read-only first; the services stay in charge. Swift and SwiftUI, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "optional exploration; N0 (the Swift spine) in progress — it becomes a project only if it passes a promotion gate after N2"
short_title = "Native Workspace"
# The milestones from the project's docs/ROADMAP.md. N0–N2 are exploration; N3–N5 only after promotion.
milestones = [
  { id = "N0", name = "spine and profiling literacy", about = "A Swift package with a pure core, architecture checks that can fail, CI, and the read-only transport." },
  { id = "N1", name = "native shell", about = "SwiftUI navigation, menus, shortcuts, and an accessibility baseline." },
  { id = "N2", name = "read-only value", about = "The Service Monitor adapter, GET-only, then a pre-registered comparison against the terminal." },
  { id = "N3", name = "evidence-linked assistance", about = "After promotion only: optional AI help over selected, redacted, previewed evidence." },
  { id = "N4", name = "one controlled action", about = "After promotion only: one reversible action, pausing or resuming a monitor, with exact confirmation." },
  { id = "N5", name = "signed release", about = "After promotion only: signing, notarization and signed updates." },
]
up_next = { milestone = "N0", step = "N0", title = "Finish N0's evidence (the million-event replay, profiler traces), then the native shell (N1)" }
+++

**Native Workspace** is an experiment: a Mac app for looking into the other projects' services, starting
with Service Monitor, then Durable Runner, jsrt runs and Colophon's release receipts. Connect to a
service you're allowed to see, look at its status and recent history, pick a failed operation, review
the evidence, and only much later, act.

The services stay in charge. The app is a client, never a back door, and the service's token decides
what it may do. The first versions can only read.

## Where it stands

**Optional.** It's a time-boxed exploration (N0 to N2) that must not slow the active projects. After N2
there's a promotion gate: a comparison, written down before it's run, of this app against doing the
same investigation in the terminal. If the app doesn't win, the project honestly stays a concept.

Started on 2026-11-16. Three slices of N0 are on `main`: the Swift package, its pure core, the
read-only transport, the Service Monitor adapter, a first window, and a drill against real copies of
Service Monitor and Durable Runner. There's been no independent review yet.

The code is public at
[akira-shirase-oss/native-workspace](https://github.com/akira-shirase-oss/native-workspace).
