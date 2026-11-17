+++
title = "AI Operations Layer: the build log"
description = "Telemetry that tells the truth about AI operations: one timeline per request, through model, tool and job steps, that shows where it failed, what was retried and which outcome is still uncertain, and shows missing data as missing. Rust collector, Rust SDK, SvelteKit console. Built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "A0 done (final check after a second review), A1 partly; the first 1M-event run missed on a busy machine; a quiet run owed"
short_title = "AI Ops Layer"
# The milestones from the project's docs/ROADMAP.md.
milestones = [
  { id = "A0", name = "the spine", about = "A pure domain, a PostgreSQL event store, a bounded collector, a Rust SDK that never blocks its host, and a console that draws one honest timeline." },
  { id = "A1", name = "one workflow, investigated", about = "A reference host with injectable faults, the contract's failure cases as end-to-end tests, load smokes, and a pre-registered investigation drill." },
  { id = "A2", name = "first real host", about = "Durable Runner instrumented through its public APIs only, and broader investigation." },
  { id = "A3", name = "controlled recovery", about = "Scoped, audited retry and reconcile through adapters that own execution, never a generic \"run again\"." },
  { id = "A4", name = "quality and adoption", about = "Measured overhead, retention cost, sampling and export, and estimated-versus-reconciled cost." },
]
up_next = { milestone = "A1", step = "A1", title = "The million-event run, then A2: Durable Runner as the first real host" }
+++

**AI Operations Layer** is an add-on for applications that call AI models. When something goes wrong
in one request (the model timed out, a tool returned junk, a background job ran twice), it shows that
one operation as a single timeline: each step, what failed, what was retried, what it cost, and which
outcome is still uncertain.

Its rule is that **telemetry is evidence, not authority.** If events went missing, the timeline says
how many and where, instead of drawing a confident line through the hole. Later milestones add
controlled recovery, but only through adapters that own the work, never a blind "run it again".

A host application reports events through a Rust SDK or a plain HTTP and JSON contract. A Rust
collector stores them in PostgreSQL, and a SvelteKit console draws them.

## Where it stands

Started on 2026-11-16. The spine (A0) is done: two independent reviews and their fix rounds, and a
final check that says so. A1 is partly done: a reference host with injectable faults runs the
contract's failure cases end to end, and the console, now on the shared Tailwind and shadcn-svelte
kit, is checked in a real browser. The only load evidence is two small smokes from the first day, so
the first million-event run missed on a busy machine, and a quiet run is owed.

The code is public at
[akira-shirase-oss/ai-operations-layer](https://github.com/akira-shirase-oss/ai-operations-layer).
