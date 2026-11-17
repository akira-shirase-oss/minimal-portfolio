+++
title = "Checkpoint H.1: the security pass, and the fixes that needed fixing"
description = "A gap review found the 2 GiB disk cap held on one database connection out of four, webhook secrets in the logs and holes in the SSRF guard. Four fix rounds later the last reviewer says ship, tests went from 137 to 215, and three of the fixes turned out to have created bugs of their own. The million-check run and a fresh soak are still owed, and one SQLite advisory waits on an upstream release."
date = 2026-11-16T23:45:00Z

[extra]
kind = "failure"
milestone = "H"
step = "H.1"
short_title = "Security pass: four rounds"
# Executed tests at main 9c51ff1, from the fourth review pass's gate run.
tests = 215

[extra.summary]
goal = "Close the gaps an outside review found before the monitor goes on its own server, with each fix round re-checked by a second reviewer."
built = "A disk ceiling on every pooled connection, secret-free logs and alerts, an SSRF guard over the full special-purpose address tables, a readiness check that goes red when an internal task dies, bounded retention, strict config, a graceful SIGTERM, a hardened systemd unit and an MIT licence."
proof = ["tests 137 → 176 → 194 → 204 → 215 across the review passes", "final review verdict: ship", "an old store boots under the new binary unchanged", "backup drill passed on its own ports", "1M-check run and 24-hour soak on this build: owed"]
code = "akira-shirase-oss/monitoring-service · main @ 9c51ff1"
+++

A smoke alarm with a full battery is useless if it's in the wrong room. The monitor had a 2 GiB disk
limit, written down, tested, and enforced on exactly one of its four database connections.

That was the first line of today's gap review: 23 gaps, 7 of them High. The monitor's roadmap was
finished, so this was the "read it like an attacker" pass before it moves to its own server.

## What I built

Four fix rounds, merged one at a time into `main` (43 commits), each followed by an independent
review:

- **The disk limit holds everywhere.** The ceiling is now set as each pooled connection opens. When
  the store is at its cap, retention frees space before writing, with a fixed reserve so it can
  always make room.
- **Secrets stay out of logs.** Logs show only `scheme://host:port`. Alerts drop the password, query
  and fragment from a monitored URL.
- **The SSRF guard knows every reserved range.** SSRF is tricking a server into calling addresses it
  shouldn't, like your own private network. The guard now checks the full IANA special-purpose
  tables for IPv4 and IPv6, and the probe and webhook clients ignore proxy settings, which could
  route around it.
- **It says when it's broken.** If the writer or the scheduler dies, `/readyz` answers 503 and
  statuses turn `unknown` instead of staying a stale green. A task stalled for two minutes makes the
  process exit so the service manager restarts it.
- **Everything has a horizon.** Every table has a retention limit, retention runs in batches of
  5,000 rows, and there's a cap of 100 monitors.
- **Operations basics.** Strict config parsing (a bad value stops the boot), SIGTERM drains and exits
  0 instead of being killed, a `Secure` session cookie behind TLS, a systemd unit that runs as its
  own user, downtime recorded as an explicit gap, a 32-byte minimum for the admin token, and an
  MIT licence.

Several of these change behaviour for existing installs, so they're listed in the `CHANGELOG`.

## How it works (the short version)

The theme is **one rule, applied at every door**. A limit that's set "on the connection" has to be
set on every connection the pool will ever open, so it now runs in the pool's connect hook. A
redaction rule that applies "to logs" has to cover the alert payload too. A guard against private
addresses has to sit where the request actually leaves, after DNS and proxies, not where the URL is
typed in.

The other theme is **failing loudly**. Before, a dead internal task left the dashboard looking
healthy. Now there's one engine verdict, ok, degraded or unavailable, and readiness, statuses and
the exit code all follow it.

## Does it actually work?

- **Tests went from 137 to 215.** Counted by the reviewers' gate runs: 176 after round 1, 194 after
  round 2, 204 after round 3 and 215 at `main` after round 4, with svelte-check clean and the
  dependency audit passing under a dated exception. The dashboard's 16 browser tests pass.
- **Failures were injected for real.** A forced writer panic made the process exit within 4 seconds.
  A process frozen for 130 seconds with `SIGSTOP` exited within a second of waking. A store at its
  cap grew only 2 pages past it.
- **Upgrades work.** The reviewer booted a store made by the old binary under the new one with no
  extra step, and the database migrations' checksums are unchanged.
- **Flaky tests got fixed, not retried.** A TLS test that failed 3 of 5 runs on the busy machine passed
  12 of 12 after its race was fixed.
- **The backup drill passed**, now on its own ports. More on why below.

No load harness ran today: the machine's load average was far too high for numbers to mean anything.

## Where I messed up

Three of my fixes created bugs, and the reviewers caught all three:

- **I silenced the alarm I was building.** Round 1 refused private targets when you register a
  monitor. But I recorded a refusal *at probe time*, like a redirect to a local name or a DNS answer
  that turns private later, as an ordinary missed check. So the most suspicious case never paged
  anyone. Reverted the same day: probe-time refusals page again.
- **My restart limits made one bad boot permanent.** Round 3 capped restarts at 5 in 10 minutes, with
  a 3-second delay. One slow dependency at boot used them up in about 20 seconds, and the unit stayed
  failed for good. It now backs off from 15 seconds to 10 minutes.
- **A frozen process looked like a stalled one.** The stall watchdog couldn't tell a process that was
  paused from outside (and fine when resumed) from one that was genuinely stuck. Fixed in round 4.

Smaller ones: an old `.gitignore` rule silently hid a new route from the commit, the strict config
parser broke the env template's inline comments, and the template's placeholder admin token was
accepted as a real one.

And the drill itself was dangerous. The backup drill ran `kill -9` on whatever was listening on its
port, and on my Mac that's my real, running monitor, so the reviewers refused to run it. The drill now
has its own ports and never kills anything by port number. The load harness still defaults to the
live port, which would point it at an installed monitor; its fix is on a branch.

## What it doesn't do yet

- **The monitor itself has never seen a million checks.** The big earlier run (3.84M requests) hit
  the *target* app. The harnesses still drive a debug build. A release-build run of ≥1,000,000 checks
  and API requests is owed, and so is a 24-hour soak on this build.
- **One SQLite advisory is waiting on upstream.** `RUSTSEC-2026-0459` is fixed in SQLite 3.54.0, but
  the patched `libsqlite3-sys` can't be used until `sqlx` allows it. There's a dated exception in the
  dependency policy, and the gate fails on its own after 2026-12-16 if nothing has changed.
- **Four Low findings from the last pass are open.** After a long freeze with 100 monitors the
  scheduler wrote 962 catch-up misses in one go and exited, so that fix is incomplete. A failed disk
  mount isn't retried by systemd, a helper script could signal a reused process id, and `--help`
  exits with code 2.
- **The systemd unit has never run on a real Linux host.** That's the first thing to do on the
  droplet.
- **CI and the guarded load-harness ports are on a branch** that's pushed but not merged.
- Accounts and multi-tenancy for the SaaS version are a plan, not code.

## Up next

Merge the verification branch with CI, run the monitor's own ≥1M checks on a release build, then
the 24-hour soak on the hardened build, then the droplet.
