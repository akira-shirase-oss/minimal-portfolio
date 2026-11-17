+++
title = "Payment Sandbox: the build log"
description = "A payment platform for development and testing where the money is simulated and the accounting is real: every synthetic balance is explained by an immutable double-entry journal that PostgreSQL itself refuses to edit. Checkout, signed webhooks and a separate simulated card network. Rust, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "M0–M6 built; M6 review: ship after the restore double-charge fix; every full 1M load run owed"
short_title = "Payment Sandbox"
# The milestones from the project's docs/ROADMAP.md. M0–M5 are one row here: they were built
# together on the first day, and the roadmap holds them all at "in progress" until the full load runs.
milestones = [
  { id = "M0–M5", name = "the ledger, payments, webhooks and explain", about = "Exact money and a journal PostgreSQL won't let anyone edit or unbalance; scoped sandbox keys; two-phase payments with an identity committed before the simulated network is called; uncertain outcomes settled by a reconciler; signed webhooks fulfilled exactly once; and an explanation of every balance. Functional gates pass; the project's own rule keeps them in progress until a full load run is committed." },
  { id = "M6", name = "first useful release", about = "A hosted checkout and a dashboard on SvelteKit, Tailwind and shadcn-svelte." },
  { id = "M7", name = "developer product", about = "A CLI, a TypeScript SDK, a scenario library and dataset resets." },
  { id = "M8", name = "billing direction", about = "Asynchronous outcomes, authorization expiry on virtual time, then settlement, fees, payouts and disputes." },
]
up_next = { milestone = "M6", step = "load", title = "The full million-request runs for M0–M6, starting with the checkout; then M7" }
+++

**Payment Sandbox** is a place to test a shop's payments without a real payment provider, real cards
or real money. A test store uses its checkout, its API and its signed webhooks the way it would use a
real one.

The money is simulated. The accounting isn't. Every balance comes from an immutable double-entry
journal: each movement is written twice, out of one account and into another, and the two sides
always add up to zero. PostgreSQL itself refuses to edit, delete or unbalance it. A separate
simulator process plays the card network: approvals, declines, and the awkward ones where nobody
knows what happened.

Every response says `Sandbox-Simulated: true`. Nothing in it can be redeemed for anything.

## Where it stands

Started on 2026-11-16. Milestones M0 to M5 are built and drilled: process kills, clock jumps and a
backup restore, with no double charge in any of them. Three fix rounds closed all but a few Lows from the
first reviews, and on 2026-11-17 M6 shipped a hosted checkout and an inspection dashboard. Its review found
that a restore from an older backup could charge twice; that's fixed, and the review says ship. The
project's own rule keeps every milestone "in progress" until its full ≥1,000,000-request run is
committed, and none has run yet.

The code is public at
[akira-shirase-oss/payment-sandbox](https://github.com/akira-shirase-oss/payment-sandbox).
