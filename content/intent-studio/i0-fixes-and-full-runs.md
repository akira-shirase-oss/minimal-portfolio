+++
title = "I0: eighteen fixes, then a million leads with the provider down"
description = "The review's eighteen findings are fixed, a second round caught what three of those fixes missed, and the final check says I0 is done, pending one decision: what the intake latency budget should be. The 100,000- and 1,000,000-submission runs, with the notification provider down the whole time, stored every acknowledged lead exactly once."
date = 2026-11-17T04:41:00-05:00

[extra]
kind = "release"
milestone = "I0"
step = "load"
short_title = "Fixes, then a million leads"
# Rust tests in CI at c8ec3c3 (84 unit, 33 integration and drill); Vitest 124 + 3 and 4 Playwright runs besides.
tests = 117

[extra.summary]
goal = "Fix everything the first review found in the lead-intake spine, then prove it at full size: every acknowledged lead stored once and every owner told, with the notification provider down."
built = "Connection caps and deadlines, a site quota only valid leads can spend, an outbox fenced per claim, a notifier on its own pool, hardened operator sign-in, security headers, and the 100,000- and 1,000,000-submission runs."
proof = ["1,000,000 submissions at 500 a second: 950,000 leads stored once, 0 duplicates, 0 violations", "p99 12.093 ms (100k run: 5.353 ms) at a load average around 3 to 8", "0 lead-content lines in 8,416,503 log lines", "final check: I0 done, pending the latency-budget decision", "CI green at c8ec3c3"]
code = "akira-shirase-oss/intent-studio · main @ c8ec3c3"
+++

The worst thing a contact form can do is say "thanks" and lose the message. The second worst is let a
bot fill the form so often that real visitors get turned away. The review found the second kind.

## What I built

The review found eighteen things in I0: 3 High, 7 Medium and 8 Low. All of them are fixed on `main`:

- **Connections can't be held open.** There was no header-read timeout, no idle timeout and no cap, and
  the body was read before anything was refused. Now there's a cap of 1,024 connections taken before
  accept, a 10-second header-read timeout that also closes idle keep-alive sockets, a 10-second
  write-stall deadline, at most 1,000 requests and 5 minutes per connection, and at most 64
  connections per address (per /64 for IPv6). The body is read only after load shedding and rate
  limits.
- **Bots can't spend a site's quota.** Junk posts that filled the honeypot still used up the site's
  rate limit, so 60 a minute locked real visitors out. Now only a valid lead for a known site is
  charged, an unknown site gets a 404 and creates nothing, and a resend gets its token back.
- **A stale notifier can't overwrite a newer result.** The outbox lease was fenced per process, so a
  late result from an earlier attempt could overwrite a newer one and leave a row stuck forever. The
  fence is now the owner plus the attempt number, and a sweep marks such rows dead.
- **The notifier really has its own pool**, which the docs had claimed and the code hadn't done.
- **Rate-limit keys can't be chosen by the client.** Only the first `X-Forwarded-For` line was read;
  now all of them are, right to left.
- **Operator sign-in is hardened**: a global attempt budget, audited failures, a `__Host-` cookie and a
  30-minute idle timeout inside the 12-hour session.
- And the rest: bidi and invisible characters refused, a strict content security policy and framing
  headers, the consent-notice version stored with each lead, the silent test provider refused outside
  development, `/metrics` limited to the host or a token holder, an argon2id floor, and redirect or
  auth answers from the provider retried instead of killing the notification.

## How it works (the short version)

Each fix follows the same rule as the rest of I0: **whatever a stranger sends for free must not cost a
real visitor anything.** A connection has to keep moving or lose its place. Only a valid lead spends the
site's budget. And a notification result only counts if it comes from the attempt that currently owns
the row.

## Does it actually work?

Both full runs were at `e61d0c2`, on my development Mac (Apple M2 Pro, 12 cores, 32 GiB) with the load
generator, the server and Postgres all on the same machine. The notification provider was down for the
**whole** run. Retries ran on the real schedule at 1/60 scale, so the run doesn't take a day.

| | 100,000 run | 1,000,000 run |
|---|---:|---:|
| rate | 500/s | 499.998/s |
| dropped iterations | 0 | 0 |
| p50 / p99 | 1.635 / 5.353 ms | 1.869 / 12.093 ms |
| leads stored, each exactly once | 95,001 | 950,000 |
| notifications delivered = provider acceptances | 95,001 | 594,803 |
| duplicates / violations | 0 / 0 | 0 / 0 |
| lead content in the logs | 0 of 734,516 lines | 0 of 8,416,503 lines |
| load average before → after | 4.76 → 6.46 | 3.17 → 8.31 |

In the million run, one request went unanswered and was never acknowledged, so nothing was lost. And
355,197 notifications ended dead after their eight attempts. That's what should happen when the
provider is down for all 33 minutes: the lead is kept, and the notification gives up honestly instead
of retrying forever.

CI is green at `c8ec3c3`: 117 Rust tests, 124 + 3 Vitest tests, and the browser journeys at two widths.

## Where I messed up

The second review found that three of my fixes weren't finished:

- **My sign-in budget could lock out the operator.** The global attempt budget was spendable by
  anonymous junk, so an attacker could keep the real operator from signing in. Now it can't.
- **My connection bounds were incomplete**, and the default still let one address fill a small cap.
  The per-address limit is now a quarter of the cap at most.
- **A retried record was mislabelled as a lost lease.**

I also numbered three fix commits off by one against the review's own list, which made the history
harder to read than it needed to be.

## What it doesn't do yet

- **One decision is pending: the latency budget.** The plan says the intake's p99 must stay within a
  budget set from a quiet-machine baseline. The baselines exist now (p99 14.7 ms at 50 a second, and
  89.9 ms in a short burst at 250 a second), but the decision that sets the budget hasn't been written.
  Until it is, the 100 ms target is a proposal, and the 500-a-second rate isn't shown to be the highest
  rate that holds it.
- **It still doesn't build websites.** That starts at I1, and I1's component set is blocked on choosing
  the pilot clients.
- **One Low security residual and one test-hygiene item** are open. I'll describe the security one once
  it's fixed.
- Some docs still list the million-submission run as owed.

## Up next

The latency-budget decision, then I1.
