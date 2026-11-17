+++
title = "A0, done twice: one bad character lost a whole batch"
description = "The rest of the first review's list landed, the console moved to the shared design system, and A0 was called done. A second review reopened it with three new Highs, one of them a single NUL character that made the database throw away every event in its batch. Fixed, and the final check says A0 done. The million-event run is still owed."
date = 2026-11-17T00:27:00-05:00

[extra]
kind = "release"
milestone = "A0"
step = "done"
short_title = "A0 done, again"
# Rust tests in CI at 6e9a14b (plus 12 of 12 Chromium journeys).
tests = 141

[extra.summary]
goal = "Finish the first review's fixes, survive a second review, and close A0 honestly."
built = "Refused events reported as gaps, emission order within a source, an SDK circuit breaker, audit writes on their own pool, the console on the shared Tailwind and shadcn-svelte kit, and the second review's fixes: one bad event refused by name, keys checked before bodies are read, write-stall deadlines, and redaction across 13 secret shapes."
proof = ["a NUL in one event no longer loses its batch", "unauthenticated 1 MB bodies on 256 connections: memory 6.4 → 266.0 MiB before, 6.4 → 12.3 MiB after", "a fresh health check answered at once with the connection cap full of non-readers (before: no answer in 60 s)", "final check: A0 done", "141 Rust tests and 12 browser journeys green in CI"]
code = "akira-shirase-oss/ai-operations-layer · main @ 6e9a14b"
+++

One wrong character shouldn't cost you a hundred right ones. In my collector, it did.

## What I built

**The rest of the first review's list:**

- A refused event is now reported as a gap, and the refused count is shown, so a refusal can't look like
  silence.
- Within one source, the timeline follows the order events were emitted in, and a gap report's drop
  window has to sit inside the event-time window.
- The SDK's retry budget counts each attempt's timeout, and a circuit breaker backs off from 0.5 to 5
  seconds.
- The operation list no longer claims to be complete for operations spread across several sources.
- Audit writes have their own database pool, so a burst of denials can't block a revocation.
- **The console moved to the shared design system**, this repository's own copy of Colophon's
  Tailwind and shadcn-svelte kit, with distinct state badges, dark mode under the content security
  policy, and a virtualised event list.

**Then the second review, which reopened A0**, and its fixes:

- **One bad event no longer loses its batch.** An event containing a NUL character made PostgreSQL
  reject the whole batch: a 500, and every operation in it lost. Now that one event is refused by name
  and the rest are stored. The SDK replaces NUL itself and splits a refused batch down to the single
  bad event.
- **Strangers can't make it buffer.** Request bodies were read before the key was checked, so
  unauthenticated clients could make the collector hold about 2 GiB. Now the key is checked from the
  headers first, an unknown key gets 401 without its body being read, and bodies in flight share a
  32 MiB budget.
- **Clients that never read lose their slot**, after a 10-second write stall, with at most 1,000
  requests and 300 seconds per connection.
- **Redaction covers 13 realistic secret shapes**, 11 of which leaked before: camelCase keys, Ruby
  hashes, escaped JSON, URL-encoded values, whole `Authorization` lines and more. It's still pattern
  matching, partial by nature, and the README says so.
- Host text is bidi-isolated, and collector-wide counters now need an admin scope.

## How it works (the short version)

The NUL fix is the timeline's own rule, applied to storage: **a problem with one event is that event's
problem.** It's refused, by name, and shows up in the timeline as a refusal. Everything else in the
batch is kept.

## Does it actually work?

- **The drills, before and after**, on my development Mac (Apple M2 Pro, 12 cores, 32 GiB). With 256
  connections each sending a 999,999-byte body without a valid key, memory went from 6.4 to 266.0 MiB
  and no client got an answer before the fix (load average about 53). After it: 6.4 to 12.3 MiB, pass
  (load average about 35). With the connection cap filled by clients that never read, a fresh health
  check got no answer in 60 seconds before the fix, and was answered at once after it.
- **Tests.** CI at `6e9a14b` ran 141 Rust tests and 12 of 12 Chromium journeys, up from 115 and 7.
- **The reviews.** The second pass found the first pass's list "19 of 23 fixed with tests, 3 partly,
  none ignored", plus 3 new Highs, 2 Mediums and 4 Lows. The final check confirmed the four most
  serious fixed and says **A0 done**. It didn't re-probe the rest or run the full gate.

## Where I messed up

Three of the second review's findings came from my own changes. The console redesign clipped the outcome
badges. My "join without finishing" mode made a joined service's tail read as "unknown" forever; it's
relabelled, and the real fix waits for schema version 2. And two of my changes together let an
operation whose finishes straddle the retention cutoff show different outcomes in the timeline and the
list; that's fixed.

The flaky flood test is hardened, not proven fixed: it now checks that the pilot's SDK dropped nothing
before waiting. The cause is suspected, not reproduced, and nothing runs it repeatedly yet. One CI
failure of a chaos test on the way was never explained; later runs passed.

## What it doesn't do yet

- **No million-event run.** The only load evidence is still the two small smokes from the first day.
  The ≥1,000,000-event run on a quiet machine is owed, with an independent baseline.
- **Two security residuals** from the second review are open; I'll describe them once fixed.
- The steps table's outcome badge can leave the screen at 1,280 pixels, and joined services' event
  counts wait for schema version 2.

## Up next

The million-event run, then A2: Durable Runner as the first real host.
