+++
title = "Checkpoint H.2: ready for the internet, and a million API reads"
description = "Two more security rounds closed what the reviews asked for before the monitor faces the internet: per-address login limits, connection and write deadlines, and DNS-rebinding protection. The final check says ship. A million API reads all answered 200. A million checks can't run yet: at the monitor's 20 checks a second, that's almost 14 hours."
date = 2026-11-17T06:09:00-05:00

[extra]
kind = "release"
milestone = "H"
step = "H.2"
short_title = "Internet-ready, and 1M API reads"
# Tests in CI at f953306 (ubuntu-latest): 279 passed, 0 failed, 0 ignored.
tests = 279

[extra.summary]
goal = "Close the last items the reviews wanted fixed before the monitor's droplet faces the internet, then run the owed million-request evidence."
built = "A login throttle per address instead of one global pool, a header-read deadline and a connection cap, loopback-only Host values in tokenless dev mode, a write-stall deadline with per-connection limits, a safe forwarded-address fallback, owner-only stores, and a 1M API read harness."
proof = ["final check at 310f5f6: ship", "1,000,000 of 1,000,000 API reads answered 200, p99 32.623 ms", "with the cap full of non-readers, a fresh GET answered 200 after 12.1 s (before: never)", "279 tests in CI, every main push green", "1M checks not run: 20 checks a second makes it about 14 hours"]
code = "akira-shirase-oss/monitoring-service · main @ f953306 (final check at 310f5f6)"
+++

"Fine on my own machine" and "fine on the internet" are two different promises. The reviews kept a
list of what stood between them.

## What I built

Two more rounds, each one reviewed:

- **Logging in can't be starved.** My first round's login throttle was one global pool of 4 slots, so
  under pressure 19 of 20 correct owner logins got a 429. Now each address (each IPv6 /64) gets its own
  bucket in a bounded table, wrong tokens are throttled too, and a trusted-proxy setting handles
  deployments behind one.
- **Connections can't be held open.** There was no header-read or idle timeout and no connection cap.
  Now there's a 10-second deadline and a cap of 1,024.
- **Clients that never read lose their slot.** Response writes had no deadline, so clients that never
  read held every slot. That was the one hardening item the reviews wanted before public exposure. Now
  there's a 10-second stall deadline, and each connection closes after 1,000 requests or 5 minutes.
- **DNS rebinding is blocked in dev mode.** Without a token, the dev mode skipped its Host and Origin
  checks, so a web page could use DNS rebinding to read monitors and write a backup. Now only loopback
  Host values are accepted.
- **The forwarded-address fallback is safe.** When a forwarded hop couldn't be parsed, the monitor fell
  back to an entry the client wrote. Now it falls back to the real peer.
- Smaller ones: fixed 5xx text, an authentication inventory that covers the whole app, back-up-first
  upgrades with roll-back by restore, existing stores tightened to owner-only, the request id applied
  outermost, and undrilled behaviours marked as such. Dependencies were updated, with the crypto
  libraries pinned by known-answer tests.

## How it works (the short version)

Every limit is now **per client, not shared.** A shared login pool meant one noisy client used everyone's
budget. A slot held by a client that stopped reading was a slot nobody else could use. Each fix gives a
stranger a small, fixed allowance and takes it back when they stop moving.

## Does it actually work?

- **The reviews.** At the start of this round: ship, but fix the login throttle and the connection
  deadline before the droplet faces the internet. After the next round: ship for the loopback install,
  but fix the write stall first. After that: **ship**. Apart from one Low, documented as a gate (below),
  nothing above Info is open from those passes.
- **The write-stall fix, live.** With the connection cap filled by clients that never read, a fresh GET
  was answered 200 after 12.1 seconds. Before, it never was.
- **A million API reads**, on a release build at `304edd5` on my development Mac (12 cores), with 32
  virtual users over 607.5 seconds: **1,000,000 of 1,000,000 answered 200**, 1,647 a second, p50 15.735,
  p95 30.924, p99 32.623 ms. The load average went from 1.70 to 8.79, with other work using about two
  cores, so this isn't a quiet machine. Underneath, the probes ran 4,000 checks with none missed, but the
  commit-lag p95 was 5,143 ms against a 5-second target. That miss is kept.
- **Tests.** CI ran 279 tests at `f953306`, and every `main` push since the last entry is green.

## Where I messed up

**My login throttle starved the owner.** One global pool of 4 slots was easy to fill. The review found 19
of 20 correct logins refused.

**My connection fix only covered reads.** The connection deadline from the first of these rounds bounded
reading requests but not writing responses, so the review found the same class of problem on the other
side.

And three branch CI runs failed on documentation lint warnings before merging.

## What it doesn't do yet

- **A million checks hasn't run.** The monitor's ceiling is 20 checks a second, so a million takes at
  least 13.9 hours. A 120-second ceiling probe gave 800 passed and 800 missed. How to get a million-check
  run is an open question in the SaaS plan.
- **One Low from the review is open**, documented as a gate that has to close before webhooks are offered
  to tenants (D-017). I'll describe it once it's fixed.
- **RUSTSEC-2026-0459** is still a dated exception, re-checked by 2026-12-16, waiting on an `sqlx`
  release. The exposure is assessed as negligible, and owner-only files, which that assessment relies
  on, are now enforced.
- The commit-lag miss, the freeze drill, systemd's behaviour on a slow volume, and the end-to-end run
  after the latest dashboard update are owed. The README still says 275 tests.

## Up next

The commit-lag miss, then the droplet.
