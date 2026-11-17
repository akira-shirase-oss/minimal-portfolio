+++
title = "M6: a checkout, a dashboard, and a restore that charged twice"
description = "Three fix rounds closed every open finding from the first reviews, then M6 shipped a hosted checkout and an inspection dashboard. Its review found that restoring an older backup could make a payment charge twice. That's fixed, and the review says ship. Every full load run is still owed."
date = 2026-11-17T02:40:00-05:00

[extra]
kind = "release"
milestone = "M6"
step = "M6"
short_title = "Checkout, dashboard, and a double charge"
# Rust tests at 00645d5 from the independent review's gate run (plus 14 browser journeys, 1 skipped).
tests = 236

[extra.summary]
goal = "Close the reviews' open findings, then ship the first useful release: a hosted checkout and a dashboard that let a test store take simulated payments and inspect them."
built = "Fair-share limits for reports, recovery and webhook delivery; transport limits on all three servers; a journal rule that survives a restore into another database cluster; sealed cursors; a protections manifest checked at startup; and M6, a SvelteKit checkout and dashboard."
proof = ["236 Rust tests and 14 browser journeys passing in the review's gate run", "the restore double charge: 2 authorizations and 2 captures before the fix, 1 and 1 after", "M6 review after the fix: ship", "CI green at cba229f", "no full million-request run yet"]
code = "akira-shirase-oss/payment-sandbox · main @ cba229f"
+++

Restoring from a backup is supposed to take you back in time. It isn't supposed to let you buy the
same thing twice.

## What I built

**Three fix rounds** closed what the first reviews had left open:

- **One project can't slow the rest.** Reports have a per-project budget (429 with `Retry-After`) and
  concurrency caps, and the simulator's reads no longer run on its writer. Recovery takes projects in
  turn instead of letting one backlog starve everyone. Webhook delivery allows at most 4 in flight per
  endpoint, takes endpoints and projects in turn, and has a circuit breaker for dead ones.
- **Every server has transport limits.** In the second review, 70 silent sockets took the simulator
  down. All three servers now have connection caps, read and write deadlines and per-connection
  limits.
- **The journal survives a restore into another cluster.** The journal's rules had trusted
  transaction ids that only make sense inside one database cluster. After a `pg_dump` restore into a
  different cluster, explain-balance showed a balance of 0, and the server's role could add lines to
  posted entries. The rule no longer depends on them, and CI now runs against a second cluster.
- **Cursors are sealed.** A card number placed in a paging cursor could reach the logs. Cursors are now
  signed with an HMAC and bound to their project and account, and query strings are checked for card
  numbers too.
- **"Protected" is checked, not assumed.** The restore rehearsal used to prove a restored database was
  equal to the source, not that its protections were intact. One manifest of protections is now
  checked at startup and in the rehearsal, with each definition pinned by hash.
- Plus a batch of Lows: the network refuses amounts outside 1 to 10¹² (a capture of −500 had been
  approved), webhooks can't target the sandbox's own ports, and an empty simulator token is refused.

**M6, the first useful release:**

- **A hosted checkout** with a scenario picker and no card field: you choose what the simulated network
  will do, approve, decline or leave it uncertain, and pay.
- **An inspection dashboard** for payments, journal entries and webhooks.
- Both are SvelteKit with Tailwind and shadcn-svelte, from this repository's own copy of the UI kit,
  on separate origins, with a hash-pinned content security policy and a `__Host-` session cookie with
  CSRF protection.

## How it works (the short version)

The double-charge fix is one rule: **a conflict with the network is the end of the conversation, not a
decline.** When the server and the simulated network disagree about an attempt, the checkout session
closes and reconciliation reports the disagreement. Attempt numbers stay as they were on purpose, so
paying again with the same scenario replays the network's own record instead of creating a new charge.

## Does it actually work?

- **Tests.** The review's gate run passed 236 Rust tests and 14 browser journeys (one performance spec
  is skipped by default). CI is green at `cba229f`.
- **The double charge, before and after.** Before the fix, the reviewer's restore scenario produced 2
  authorizations and 2 captures of 2,500. After it, 1 and 1, and a pay-again recovered 3,700 exactly
  once. The M6 review then said **ship**.
- **The pages are small.** On my development Mac (Apple M2 Pro) at a load average around 9, the
  checkout was ready in 91.4 ms at the median (p95 101.5) and the dashboard in 89.4 ms (p95 95.7), from
  a debug server over 25 samples. The initial JavaScript is 73,951 bytes gzipped for the checkout
  (budget 90,000) and 82,750 for the dashboard (budget 100,000). There's no threshold on load time yet;
  this is the baseline.
- **The restore rehearsal** dumps the database with `pg_dump` into a fresh one and checks that
  reconciliation, balances and explanations come out the same and that the owner's `UPDATE` is
  refused. The final check ran it live on a fresh cluster: 12 of 12 late lines were refused. No run
  output from the rehearsal is committed yet.

## Where I messed up

**My earlier fix created the double charge.** In the first fix round I recorded a network identity
conflict as a decline. M6's checkout lets you try again after any decline. Put together, after a
restore from an older backup the server reissued an attempt number the network had already seen, got a
conflict, called it a decline, and let the customer pay again. Two charges. The review found it; the
"conflict closes the session" rule fixed it.

Two of my second-round fixes were incomplete the first time (the cursor sealing and the protections
check) and needed a second pass. The browser journeys caught a gap in the content security policy and
a "Not paid" label that contained the word "paid". And one CI run broke on a lockfile.

## What it doesn't do yet

- **No full load runs.** Every milestone from M0 to M6 owes its ≥1,000,000-request run on a quiet
  machine, and the checkout scenario has never run at all, not even as a smoke. Some defaults are
  labelled "chosen, not measured" until saturation runs exist.
- **A few small items are open:** two Lows (one of them by design), one partly fixed performance Low,
  and four minor notes. I'll describe any security-relevant one once it's fixed.
- The two last fixes from the final check haven't had their own independent re-check yet.

## Up next

The full load runs, starting with the checkout, then M7: a CLI, a TypeScript SDK and a scenario
library.
