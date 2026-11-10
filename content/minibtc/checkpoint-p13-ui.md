+++
title = "Checkpoint P13: the chain gets a face — explorer search and a real web wallet"
description = "Restructured after UX review (Solana-explorer-style flows): create/restore/unlock landing, two-step wallet creation with a show-once seed gate, dashboard hero + action bar, receive/addresses/activity pages — plus the earlier enriched explorer. Beyond the blueprint's read-only explorer: global search, pagination and dashboard stats on the public side, and a separate key-holding wallet UI with passphrase-to-memory sessions, per-session CSRF, origin checks, a two-step build-review-confirm-broadcast send flow, and a secret-free audit log — live-verified end to end on the devnet."
date = 2026-11-10T14:00:00Z

[extra]
kind = "experiment"
milestone = "P13"
step = "ui"
short_title = "Explorer + wallet UI"
tests = 167

[extra.summary]
goal = "Make the chain browsable and the wallet usable in a browser — without weakening the security model the CLI and MCP already enforce."
built = "apps/minibtc-wallet-ui v2 (create/restore/unlock flows, seed-once gate, dashboard/receive/activity pages) + apps/minibtc-explorer enrichment (search classifier, ?start= pagination, dashboard stats, fee-rate columns) + new apps/minibtc-wallet-ui binary (session map, unlock rate limiting, CSRF+Origin checks, PendingSend review step, audit JSONL)."
proof = [
  "live flow v2: create webui2 via UI (seed gate enforced, keystore 0600), restore webui2b derives identical address, 2 BTC CLI-funded shows on dashboard; earlier: unlock webtest -> dashboard 150 BTC mature -> send form -> build+sign -> review page (to/amount/fee/txid) -> confirm -> broadcast -> tx 30d1d5de…facd confirmed in a block",
  "negatives: wrong CSRF leaves pending draft untouched; wrong passphrase -> error + unlock_fail audit; foreign Origin rejected; lock destroys session and /wallet redirects",
  "indices persisted: state.json shows next_change=1 after the send's change address",
  "audit log carries events only — no passphrase, seed, or key material anywhere",
  "gates: cargo fmt --check, clippy --workspace --all-targets -D warnings, cargo test --workspace --locked — all green at 6dc7c5a",
]
code = "akira-shirase-oss/projects/minibtc · main @ 31696de (local only — remote push not configured)"
+++

The blueprint asked for "a small web UI to browse blocks, transactions
and addresses" — read-only, and it shipped exactly that. But a chain you
can only browse from the command line is a chain you can't really *use*.
P13 closes that gap in two deliberately separate pieces.

The **explorer** stayed read-only and got genuinely useful: a global
search box that classifies txids, block hashes, heights and addresses;
paginated block history; a dashboard strip with difficulty, peers and
mempool fee stats; fee-rate columns; and richer transaction and address
pages. Every byte of chain data is still HTML-escaped — chain data is
untrusted input like any other.

The **wallet UI** is the interesting half, because it holds keys — so it
was built as its own binary with a stricter contract than anything else
in the project. The passphrase decrypts the keystore into an in-memory
session and is never stored, logged, or echoed. Sessions are random
tokens in HttpOnly SameSite=Strict cookies, capped at 32, expiring after
30 idle minutes, with per-wallet unlock rate limiting. Every POST needs
the session's CSRF token *and* a matching Origin. Spending is two-step
by construction: build+sign produces a review page — to, amount, fee,
txid — and only an explicit second POST broadcasts. Even then the node
can reject it; the draft is consumed either way.

The verification wasn't a screenshot. It was a live devnet run: unlock,
dashboard showing 150 BTC mature, a 5 BTC send through the review gate,
broadcast accepted, and the transaction confirmed in the next block —
while wrong-CSRF, wrong-passphrase and foreign-Origin attempts all
failed closed, and the audit log recorded events with zero secrets.

What it deliberately is *not*: no seed display, no wallet creation, no
TLS story, no multi-user anything. It's a localhost devnet tool — the
same trust level as the CLI it complements, with the browser's usual
rules (CSRF, cookies, origin) enforced in code rather than assumed.
