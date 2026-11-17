+++
title = "A0–A1: a timeline that admits what it didn't see"
description = "Day one of the AI Operations Layer: a collector, a Rust SDK that never blocks its host, and a console that draws one operation as one timeline, with lost events shown as a hole instead of papered over. The failure cases pass end to end. An independent review found six ways the timeline could still mislead, all fixed the same evening; the load smokes missed their ingest target."
date = 2026-11-16T23:10:00Z

[extra]
kind = "experiment"
milestone = "A0"
step = "A0–A1"
short_title = "An honest timeline"
# Tests in check.sh at main 9524e94, as recorded in that commit's message (plus 7 browser journeys).
tests = 99

[extra.summary]
goal = "Show one AI operation as one truthful timeline, where missing or conflicting evidence is shown as such, without ever slowing down or breaking the application being watched."
built = "A pure domain with schema v1 and named refusals, a PostgreSQL store with deduplication, a bounded collector with hashed per-host keys and scoped query tokens, a Rust SDK with a bounded queue, a SvelteKit console, and a reference host with injectable faults."
proof = ["99 tests in the gate plus 7 browser journeys", "collector down: the host keeps serving, every dropped event later shown as a gap", "review: 0 of 36,006 host requests failed because of the SDK", "6 review Highs, all fixed on main", "ingest p95 153.1 ms against a 100 ms target, on a heavily loaded laptop"]
code = "akira-shirase-oss/ai-operations-layer · main @ 9524e94"
+++

A security camera that skips frames is fine. One that skips frames and then shows you a smooth video
anyway is dangerous: you'd swear nobody walked past.

Most monitoring tools do the second thing. When events go missing they draw the line straight
through the gap. This project's first rule is to show the gap.

## What I built

**A0, the spine:**

- **A pure domain**: the event schema, named reasons for refusing an event, size caps, a default-deny
  list of attributes that may be stored, secret redaction, and the logic that builds a timeline. It
  shows the declared outcome or "no finish observed", exact loss where sequence numbers have holes,
  and unknown loss as unknown.
- **A PostgreSQL store** that deduplicates by event id, writes each batch in one transaction, and
  reports conflicts instead of picking a winner silently.
- **A collector** in Rust and Axum: per-host keys stored hashed, body and batch caps, a token bucket
  per key, load shedding, and scoped, expiring tokens for reading. A refused read is audited, and if
  the audit can't be written, the read fails.
- **A Rust SDK** for the application being watched. Sending an event is a quick drop into a bounded
  queue of 8,192. If the queue is full, the event is counted and reported later as a gap. The SDK
  never panics and never makes its host wait.
- **A SvelteKit console** that draws the timeline.

**A1, partly:** a reference host that runs a small AI workflow (generate, validate, fact-check,
publish) against a fake model, with faults you can switch on. Plus k6 load scenarios, a script that
counts what actually reached the database, browser journeys in Chromium, and a drill kit for timing
how fast someone can diagnose an incident.

## How it works (the short version)

Every event from a host carries a sequence number for its operation. If the collector has events 1,
2, 4 and 5, it knows exactly one is missing, and the timeline shows a hole at 3. If the SDK had to
drop events, it says so with a `gap.reported` event, so the loss is part of the record.

And the collector never decides what happened. The host declares the outcome; the collector only
says whether it saw that declaration, and whether two declarations disagree.

## Does it actually work?

- **Tests.** The gate runs 99 tests at `main`, as recorded in the latest commit, up from 84 at the
  review. The 7 browser journeys pass.
- **The failure cases, end to end.** With the collector down, the reference host keeps serving, and
  every dropped event is later shown as a gap. A proxy that duplicates and reorders batches doesn't
  produce a false order of events. A flooding host is limited and counted. That proxy test also found
  a real bug: timestamps were being sorted wrongly.
- **The reviewer's measurements.** The SDK never blocked or broke its host: 0 failed requests out of
  36,006. All 20,250 acknowledged events survived a PostgreSQL restart in the middle of ingest.
- **Retention.** One sweep deleted 1,000,000 expired events and kept 100,000 fresh ones in 15.4
  seconds, about 64,758 rows a second, at a load average of 24 to 55.

The two load smokes ran on my development Mac (Apple M2 Pro, 12 cores, 32 GB) at load averages
around 46 to 69, sending 100 batches of 10 events a second for 30 seconds. Both stored every event
with **0 lost**. The first missed both targets: ingest p95 114.25 ms (target under 100), timeline
p95 1,039.84 ms. After caching project lookups and doubling the query pool, the timeline p95 fell to 24 ms
and the list to 9.86 ms. Ingest p95 was 153.1 ms, still a miss. On a machine that loaded I can't tell
that apart from scheduling noise, so a quiet run is owed.

## Where I messed up

The independent review's verdict: the spine is real, but fix six Highs before A2. They were mostly
ways the timeline could look more certain than it was:

- **A lost "step started" event removed a warning.** If that one event went missing, or attempts
  arrived out of order, the timeline dropped its "an external effect may have happened" warning. That's
  exactly backwards: less evidence produced more confidence.
- **Conflicting finishes showed one green status**, and the list and the timeline could disagree.
- **An event repeated inside one batch was counted twice.**
- **Random keys could shed a real host's data.** A flood of requests with made-up keys made the
  collector drop a legitimate host's batches: 58 of 96 in the review.
- **Retention couldn't keep up.** It removed at most 100,000 rows an hour while the reference load
  writes 3.6 million an hour.
- **The SDK sent batches too big to accept.** It never limited a batch's size in bytes, so the
  collector's 1 MiB cap refused whole 500-event batches. In the reviewer's probe, 800 events were
  sent, 550 accepted and 500 dropped. It now splits a refused batch in half and resends.

All six are fixed on `main`, each with a test that failed before its fix. One more from the review
landed too: a second key could write into another host's operation and fill its gaps. Three of my
tests also turned out flaky on the loaded machine and had to be made realistic.

## What it doesn't do yet

- **Mediums from the review are still open:** a PostgreSQL restart returns a 500 instead of a clean
  refusal, there's no timeout for reading request headers, expired detail is shown as "never
  received", one key can use up the name budget, redaction caught 1 of 7 secret shapes the reviewer
  tried, a refused event doesn't say why, and SIGTERM isn't handled.
- **The README and roadmap are behind** the code: they still list defects that are now fixed.
- **No million-event run.** It's owed on a quiet machine, with the overhead and storage measurements.
- **The drill doesn't count yet.** The dry runs were done by the same agent that wrote the incident
  generator, so they prove the kit works, not that the console helps a person. The real comparison
  moves to a workflow on Durable Runner.
- The console still has to move to Tailwind and shadcn-svelte, the stack chosen for every project's
  web screens.

## Up next

The remaining Mediums, then A2: Durable Runner as the first real host, instrumented only through its
public API.
