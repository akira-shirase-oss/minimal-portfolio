+++
title = "Payment Sandbox: the build log"
description = "A payment platform for development and testing where the money is simulated and the accounting is real: every synthetic balance is explained by an immutable double-entry journal that PostgreSQL itself refuses to edit. Checkout, signed webhooks and a separate simulated card network. Rust, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "M0–M5 built; review fixes landing; M6 checkout and dashboard next — full 1M load runs owed"
short_title = "Payment Sandbox"
# The milestones from the project's docs/ROADMAP.md.
milestones = [
  { id = "M0", name = "the spine", about = "Exact integer money, a chart of accounts, balanced entries, and a journal PostgreSQL won't let anyone edit or unbalance.", done = true },
  { id = "M1", name = "projects and sandbox keys", about = "Projects, scoped sandbox keys stored only as hashes, revocation that bites on the next request, and projects that can't see each other.", done = true },
  { id = "M2", name = "payment lifecycle", about = "Authorize, capture, void and refund as two-phase holds, with an identity committed before the simulated network is ever called.", done = true },
  { id = "M3", name = "uncertain outcomes", about = "Lost replies and timeouts from the simulator, fenced readback, and a reconciler that settles what's uncertain.", done = true },
  { id = "M4", name = "signed webhooks", about = "An outbox written with every state change, a leased deliverer, signatures with rotation, and a test store that fulfils exactly once.", done = true },
  { id = "M5", name = "explain every balance", about = "A reconciliation report in both directions, and an explanation of any balance, posting by posting." },
  { id = "M6", name = "first useful release", about = "A hosted checkout and a dashboard on SvelteKit, Tailwind and shadcn-svelte." },
  { id = "M7", name = "developer product", about = "A CLI, a TypeScript SDK, a scenario library and dataset resets." },
  { id = "M8", name = "billing direction", about = "Asynchronous outcomes, authorization expiry on virtual time, then settlement, fees, payouts and disputes." },
]
up_next = { milestone = "M5", step = "fixes", title = "Finish the review's fix round, then M6: checkout and the dashboard" }
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
backup restore, with no double charge in any of them. An independent review asked for one fix round
before the next milestone, and those fixes are landing on `main`. The load runs so far are small
smokes on a busy machine; every full million-request run is still owed. M6, the checkout and
dashboard, is next.

The code is public at
[akira-shirase-oss/payment-sandbox](https://github.com/akira-shirase-oss/payment-sandbox).
