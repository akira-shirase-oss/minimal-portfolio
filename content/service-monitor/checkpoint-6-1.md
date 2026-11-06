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

## What I built

M6 was not a planned milestone — it was an audit. I ran the retired monitor's
20-post build log against the rebuild feature by feature, logged every gap in
`docs/GAPS.md`, and closed the eleven that were real. Two classes of work:

**Backend gaps.** The old monitor knew *which* certificate failure it saw; the
rebuild flattened everything to `connect`. Now cert_expired, cert_not_yet_valid,
cert_name_mismatch, cert_untrusted and generic tls are committed details — via a
deterministic webpki-roots trust config instead of the platform verifier (which
returns opaque OS errors). Per-monitor `failures_to_open`/`passes_to_recover`
replace the global 3/2, read from the committed gate row so an edit applies
atomically. Incidents now keep four times separately: `first_fail_at` derived
inside the commit transaction from committed check rows (restart-safe, no
fabricated history), `opened_at`, `last_fail_at`, `resolved_at`. CLI exit codes
became a documented contract — 0/1/2/3/4 — pinned by tests that spawn the real
binary against a stub HTTP server. And `cargo mutants` attacked the domain: the
first run missed 5 boundary mutants, three tests closed them, re-run clean.

**Dashboard gaps.** The old monitor managed monitors from its UI; the rebuild's
dashboard was read-only. Now it creates, edits (with the optimistic `generation`
guard), pauses and deletes — through the same API contract as the CLI, surfacing
envelope errors instead of swallowing them. The check strip renders one cell per
committed check plus *dashed gap cells* for slots with no evidence — a paused
window shows as a hole, never interpolated green. Both pages poll `invalidateAll`
on the 15s tick with the tab-visibility guard; a mid-poll outage resolves to
"cannot see", not a stale board. `/status.json` serves the sanitized artifact
unmodified (public viewers never touch `/api`); `/status` renders it. `/guide`
documents every wire word in plain English — and `guide_drift.rs` checks *both
directions*, so a new enum variant without a guide entry fails the build.

**Maintenance windows** closed the milestone: schedule-scoped suppression where
checks still commit but a threshold crossing yields `IncidentSuppressed` — no
incident, no page. The streak keeps counting, so a still-broken target opens on
the first check after expiry; the live drill's `first_fail_at` honestly landed
inside the window. Windows are read at commit time, never cached; the dashboard
shows "suppressing now" rather than letting a failing-but-quiet monitor look
mysterious.

## What I learned

- **Mutation testing is the only honest answer to "do the tests test anything?"**
  26 hand-written domain tests looked thorough; mutants proved 5 edge mutants
  sailed straight through. Every miss was the same shape: asserting the rejection
  side of a comparison but never the boundary itself.
- **The gate read is the right place for time-varying config.** Windows live in
  the same committed read as generation and thresholds — no cache invalidation
  problem exists because there is no cache.
- **Suppression semantics are a product decision masquerading as a boolean.** Keep
  the streak counting (post-expiry opens immediately) versus reset it (alert waits
  a full new streak) — I chose the former because a still-broken target at expiry
  IS an incident, just a deferred one.
