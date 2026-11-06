+++
title = "Checkpoint 6.1: the parity slice — everything the old monitor knew, re-learned honestly"
description = "Eleven gaps closed against the retired monitor: real certificate classification, per-monitor alarm sensitivity, the four incident times, a dashboard that mutates, charts with honest holes, public status in-app, a drift-checked guide, exit codes a script can trust, a mutation-tested domain, and maintenance windows."
date = 2026-11-06T12:30:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.1"
short_title = "Parity"
tests = 122

[extra.summary]
goal = "Audit the retired monitor's build log against the rebuild, log the real gaps, and close them — plus the dashboard depth the old one's users actually had."
built = "cert_expired/not_yet_valid/name_mismatch/untrusted via webpki-roots + extra_roots, failures_to_open/passes_to_recover per monitor, incident first/last/opened/resolved times, dashboard create/edit/pause/delete, CheckStrip with dashed gap cells, 15s invalidateAll polling, /status.json + /status page, /guide with two-direction drift test, exit codes 0-4, cargo-mutants on the domain, maintenance_windows with Effect::IncidentSuppressed."
proof = ["live: expired.badssl.com → cert_expired, wrong.host → cert_name_mismatch", "live: failures_to_open=1 monitor opened on check #1 while a default waited", "live: first_fail_at 30s before opened_at on a refused-port monitor", "mutants: 48 → 42 caught, 0 missed after 3 boundary tests", "live: 4 windowed checks suppressed → window deleted → incident opened next slot, first_fail_at inside the window", "15/15 Playwright + 122 Rust tests + e2e suite green"]
code = "5b5a3e7"
+++

M6 was not a planned milestone — it was an audit. I ran the retired monitor's
20-post build log against the rebuild feature by feature, logged every gap in
`docs/GAPS.md`, and closed the eleven that were real. What follows is each slice:
the gap it closed, the decision that mattered, and the proof that it's true.

## M6.1 — Certificate classification

**Gap:** the old monitor said *which* certificate failure it saw; the rebuild
flattened everything to `connect` — the least useful alert text there is.

**What changed:** TLS errors now classify into `cert_expired`,
`cert_not_yet_valid`, `cert_name_mismatch`, `cert_untrusted`, or generic `tls` as
committed check detail. The deeper fix was the trust config itself: reqwest on
macOS delegates to Security.framework, which returns opaque OS status codes —
the rich `CertificateError` variants are destroyed before my classifier sees
them. So the monitor now builds its own rustls `ClientConfig` on **webpki-roots**:
deterministic on every OS, and honest in a specific way — the monitor reports
what *public* clients see, and a corporate root can't quietly mask a real
failure. For operators with internal CAs, `ProbePolicy::extra_roots` trusts what
they explicitly add, nothing else.

**Proof:** rcgen fixtures over a real rustls server cover all four classes plus
a trusted chain; live drill — `expired.badssl.com` committed `cert_expired`,
a wrong-host endpoint committed `cert_name_mismatch`.

## M6.2 — Per-monitor alarm sensitivity

**Gap:** the old monitor let each target tune its own tripwire; the rebuild
hard-coded 3-fail/2-pass for everything. A noisy target and a quiet one deserve
different thresholds.

**What changed:** `failures_to_open` and `passes_to_recover` (1–10, default 3/2)
live on the monitor row. The decision that matters: thresholds are **config
passed into `record` per observation**, read from the same committed gate row
as the generation — never cached machine state. An edit bumps generation and
the new threshold applies to the very next committed check, atomically; there
is no stale-threshold window to reason about.

**Proof:** live drill — a `failures_to_open=1` monitor opened its incident on
check #1 while a default-threshold monitor at two failures still waited.

## M6.3 — The four incident times

**Gap:** the old monitor kept opened/first-fail/last-fail/resolved apart; the
rebuild tracked open and resolved only. Start-of-failure ≠ time-of-notice is
the entire point of incident forensics.

**What changed:** `first_fail_at`, `opened_at`, `last_fail_at`, `resolved_at`
are all committed separately. The design choice: `first_fail_at` is **derived
inside the commit transaction** from committed check rows — the oldest
consecutive failure since the last `pass`/`missed` — so it stays correct across
restarts and is never fabricated from scheduler memory. `last_fail_at`
re-stamps on every failing check while open. Pre-M6.3 rows keep NULL rather
than invented history. All four ride the API `IncidentView`, the webhook
payload, the CLI, and the dashboard.

**Proof:** store test asserts exact slot relationships (streak 1–5 → first=1,
opened=3, last=5); live — `first_fail_at` landed 30 s before `opened_at` on a
refused-port monitor.

## M6.4 — A dashboard that mutates

**Gap:** the rebuild's dashboard was read-only — add/edit/pause/delete lived
CLI-only while the old monitor managed monitors from its UI.

**What changed:** all four actions in the browser, through the same API
contract as the CLI — no private path. The sharp edges are the honest ones:
edits send the current `generation` so a concurrent write returns 409 with the
server's own words; a delete-with-history refusal explains that pausing is the
right action; a 401 surfaces as a token failure, never a silent spinner.

**Proof:** Playwright against the real server and database — create → pause →
edit lands `generation 3` (one bump per write), plus the 409 and 401 paths.

## M6.5 — The check strip

**Gap:** checks rendered as rows; there was no at-a-glance timeline.

**What changed:** `CheckStrip` — one cell per committed check, colored by
outcome (pass=green, failing=red, missed/unknown=grey), plus **dashed gap cells**
for slot-grid positions with no evidence. Missing observations render as holes,
never interpolated green — the strip is an evidence visualization, not a vibe.

**Proof:** the pause-gap spec pauses a monitor mid-run over real scheduled
slots; the resumed strip shows the hole exactly where evidence is absent.

## M6.6 — Auto-refresh

**Gap:** data loaded per navigation; you reloaded to see a new check.

**What changed:** both pages call `invalidateAll()` on the 15-second minimum
tick, guarded by tab visibility (no polling what nobody sees). The honesty
property is in SvelteKit's semantics: the old `data` stays until the new load
resolves, so the swap is atomic — no stale-green flash — and if the API dies
mid-poll the load honestly resolves to "cannot see", not a frozen board.

**Proof:** a monitor created mid-session appears without navigation; a
route-aborted API mid-poll shows the unreachable state on the next tick.

## M6.7 — Public status, inside the app

**Gap:** the sanitized status existed only as the separate static app; inside
the dashboard there was nothing for a viewer without the token.

**What changed:** `GET /status.json` serves the same sanitized artifact
unmodified — outside `/api`, no token, hashed aliases — and `/status` renders
it in the app's own components. The expiry contract is preserved end-to-end:
stale or missing reads "monitoring unavailable" with the last-seen evidence,
never fabricated rows and never "all down".

**Proof:** three Playwright specs — live snapshot, stale doctor, missing file.

## M6.8 — The guide page

**Gap:** the old monitor explained every status word in plain English; the
rebuild had no reference a new user could read.

**What changed:** `/guide` renders from one glossary file
(`lib/vocabulary.ts`). The durable piece is `guide_drift.rs`: five Rust tests
walk the **real serialized vocabulary** — statuses, outcomes, transport
details, incident fields — through the store's own `encode_slot` mapping and
check *both directions*. Every wire word must be documented, and no guide word
may exist that the system can't emit. A new enum variant without a guide entry
fails the build; a stale glossary entry fails it too.

**Proof:** 5 drift tests green; the guide spec asserts every section renders.

## M6.9 — Exit codes a script can trust

**Gap:** never audited. `main() -> Result` meant every failure exited 1 —
"server down" was indistinguishable from "server refused" to automation.

**What changed:** `main` returns `ExitCode` with a documented contract — `0`
success, `1` API/application error, `2` usage error, `3` unreachable, `4`
unauthorized. The load-bearing distinction is in `send()`: no HTTP response is
a different failure class than an HTTP rejection. Empty `monitors edit` is a
usage error caught client-side (2), not a round-tripped no-op. Results go to
stdout, errors to stderr — never mixed.

**Proof:** `tests/exit_codes.rs` spawns the real `monitor` binary against a
pure-std TCP stub server — bad subcommand, empty edit, closed port, 401, 409,
and both success paths.

## M6.10 — Mutation-tested domain

**Gap:** 88+ hand-written tests had never been attacked. Passing tests prove
code works, not that tests test.

**What changed:** `cargo mutants -p monitor-domain` — 48 mutants. First run:
**5 missed**, all the same shape — comparisons asserted on the rejection side
but never at the boundary (`<` vs `<=`, `>` vs `>=`), and `rebuild_tail`'s
return value never asserted at all. Three tests added: `interval == MIN`
accepted, `timeout == interval` accepted, `rebuild_tail` returns the larger
threshold. Re-run: **0 missed**, 42 caught, 6 unviable (`Default::default()`
on types that can't implement it — unbuildable, not alive).

**Proof:** the outcome JSON is committed to `perf/results/` — the survivors,
the fix, and the clean re-run are auditable.

## M6.11 — Maintenance windows

**Gap:** the old monitor planned schedule-scoped suppression; the rebuild had
no way to say "this failure is expected, don't page."

**What changed:** a `maintenance_windows` row (`starts_at`, `ends_at`,
`reason`, migration 0005) is read **inside the observation gate** — the same
committed read that returns generation and thresholds — so creating or
deleting a window takes effect on the next slot, never cached. A threshold
crossing inside an active window yields the new `Effect::IncidentSuppressed`:
the check row commits as evidence, no incident row, no outbox event.

The semantic that matters: **suppression silences the page, never the
evidence, and never the streak.** The failure streak keeps counting through
the window, so a target still broken at expiry opens on the *next* failing
check — not a fresh streak later. Recovery is never suppressed: an incident
open before the window still closes on fresh passes, because the paged human
needs their resolve.

**Proof:** 4 domain matrix tests (suppressed crossing / pass resets / missed
resets / recover-during-window) + store test + API CRUD test + Playwright spec.
Live drill: 4 failing checks committed with zero incidents → window deleted →
incident opened on the next slot, `first_fail_at` honestly inside the window.
The dashboard shows "suppressing now" — a failing-but-quiet monitor explains
itself rather than looking broken in the wrong way.

## What I learned

- **Mutation testing is the only honest answer to "do the tests test
  anything?"** 26 domain tests looked thorough; five mutants sailed straight
  through, all boundary shape. Assert the edge, not just the side of it.
- **The gate read is the right place for time-varying config.** Windows live in
  the same committed read as generation and thresholds — no cache invalidation
  problem exists because there is no cache.
- **Suppression semantics are a product decision masquerading as a boolean.**
  Keep the streak counting (post-expiry opens immediately) versus reset it
  (alert waits a full new streak). I chose the former: a still-broken target at
  expiry IS an incident, just a deferred one — and `first_fail_at` inside the
  window is exactly the forensic record an operator needs.
- **The verifier is part of the contract.** Switching off the platform TLS
  verifier wasn't just about better error strings — it makes classification
  deterministic across OSes and stops a local root store from silently
  rewriting what "trusted" means.
