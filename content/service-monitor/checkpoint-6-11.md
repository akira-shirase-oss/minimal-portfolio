+++
title = "Checkpoint 6.11: maintenance windows"
description = "Schedule-scoped suppression that silences the page but never the evidence — checks still commit, the streak keeps counting, and a still-broken target opens on the first check after expiry."
date = 2026-11-06T13:00:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.11"
short_title = "Maintenance windows"
tests = 122

[extra.summary]
goal = "Planned work shouldn't page — but suppression must be explicit, time-bounded, and never silent."
built = "maintenance_windows read inside the observation gate (same committed read as generation+thresholds); a crossing in a window yields Effect::IncidentSuppressed — check commits, no incident, no outbox; streak keeps counting; recovery never suppressed; API + CLI + dashboard visibility."
proof = ["live: 4 failing checks committed with zero incidents → window deleted → incident opened on the next slot, first_fail_at honestly inside the window", "4 domain matrix tests + store test + API CRUD test + Playwright spec"]
code = "akira-shirase-oss/monitoring-service · main @ 5b5a3e7"
+++

The last gap — and the deepest slice of M6.

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
resets / recover-during-window) + a store test + an API CRUD test + a
Playwright spec. Live drill: 4 failing checks committed with zero incidents →
window deleted → incident opened on the next slot, with `first_fail_at`
honestly inside the window. The dashboard shows "suppressing now" — a
failing-but-quiet monitor explains itself rather than looking broken in the
wrong way.

**Lesson:** the gate read is the right place for time-varying config — no
cache invalidation problem exists because there is no cache. And suppression
semantics are a product decision masquerading as a boolean: keeping the streak
versus resetting it changes what "alerting resumes" means.
