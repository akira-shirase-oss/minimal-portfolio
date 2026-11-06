+++
title = "Checkpoint 5.1: ship — denied means denied, DNS that can't be fooled, and a measured baseline"
description = "Bearer auth on every management route, the SSRF guard finished inside the DNS resolver itself, 4,000 loaded checks with zero missed, and a release that was actually installed."
date = 2026-11-06T02:00:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.1"
short_title = "Ship"
tests = 90

[extra.summary]
goal = "Make the thing operable by someone who isn't me: real auth, finished SSRF hardening, load evidence that is measured rather than targeted, and an install that was actually exercised."
built = "SMON_ADMIN_TOKEN Bearer gate + dashboard token gate + CLI token, PolicyResolver inside reqwest's DNS + redirects followed ≤5 revalidated hops, perf/lab-profile.mjs harness + committed baseline, deploy.sh release install + /version + refreshed README/RUNBOOK."
proof = ["live: 401/401/200, tokenless public bind refused before any task spawned", "live: localhost-as-name refused rejected_local at DNS; redirect chain→pass/200, loop→http_fail/302", "measured: 4000/4000 slots, 0 missed, p95 commit lag 4.9s, 107/107 alerts first-attempt, RSS flat", "install drill: fresh prefix → migrations → readyz+version+dashboard+401/200 auth"]
code = "6ae40fc"
+++

## What I built

**Denied means denied.** `SMON_ADMIN_TOKEN` turns on `Authorization: Bearer` for every `/api/**` route — compared on SHA-256 digests so the check is fixed-length, no early-exit timing tell. Health endpoints and static files stay open (a token gate has to load to hold a token). The sharp edge: with no token, loopback boots with a loud warning but a public bind refuses *before a single task spawns* — I initially ran the check after the coordinator started and the refuse log showed "coordinator stopped" first. Moved it earlier; a refused boot now starts nothing.

**The SSRF guard, finished where it has to live.** Redirects are now followed — up to 5 hops, each revalidated through the same policy — because a redirect is a target the target chose. The DNS layer was the real work: `PolicyResolver` hooks reqwest's own resolver, so every address in the OS answer is validated *and reqwest only ever dials the validated set*. That closes the classic check-then-resolve-again hole: there is no second resolution to race. One private address in the answer fails the whole thing — round-robin DNS makes "usually public" no defense. And a DNS refusal classifies `rejected_local` via a cause-chain walk, not an ambiguous `connect`. Verified live: `http://localhost:…` registers fine (it looks like a name), then every probe lands `transport` + `rejected_local` — the refusal is committed evidence, not a silent skip.

**Load: measured, not targeted.** `perf/lab-profile.mjs` uses the monitor's own scheduler as the load generator — an external driver would only exercise the API. 100 monitors at the 15 s floor, registered in 126 ms, so every wave is a phase-locked 100-slot burst on the 20 global slots across 10 fixture origins (50 ok / 20 flaky / 15 slow / 10 dead / 5 hung). Ten minutes: **4,000 checks = every slot accounted, zero missed**, a 22.5% error rate held, commit-lag p95 **4.9 s** against the 5 s grace — the wave-drain queue is the whole story, and it's honest that headroom is ~2%. 62 incidents produced exactly 107 outbox events (45 resolved × 2 + 17 open), **all delivered first-attempt**, sink hits match to the row. RSS flat at ~27 MB. The guide's 24-hour soak is written down as *not yet run* — the bounded baseline is the evidence that exists.

**A release that was actually installed.** `scripts/deploy.sh` → `releases/<sha>/bin` + `current` symlink, `data/` outside releases. On a fresh prefix: migrations ran, `/livez` `/readyz` `/version` answered, the dashboard served, auth held (401/200). `GET /version` is new — it reports the binary's own version, the only honest answer after an upgrade or rollback. README rewritten to what the system actually is now (it still said "scaffold"); RUNBOOK's verify steps now check `/version`.

## Two findings worth keeping

- **The per-origin bound is the product working.** The first load run put all 100 monitors on one fixture origin — the 2-per-origin semaphore throttled everything and 180 slots went `missed` in the first minute. That's polite-probing working as designed; the harness (not the bound) was wrong, and the fix was more origins.
- **UUIDv7 ids share millisecond prefixes.** Two monitors created together collided on an 8-char id-prefix alias in the public snapshot; aliases are now `sha256(id)[:12]` — stable, opaque, uniformly spread.
