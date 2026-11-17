+++
title = "Accounting Reconciliation: the build log"
description = "Bank statements and invoices in; every bank line out as matched, excluded or an exception, each with a decision you can explain. Deterministic rules match the bulk, a model only proposes for the ambiguous rest, people approve, and every decision lands in a hash-chained audit trail. It never moves money. Rust, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "R0 (the spine) started; the ship gate needs one or two real accountants, not yet found"
short_title = "Reconciliation"
# The milestones from the project's docs/ROADMAP.md.
milestones = [
  { id = "R0", name = "the spine", about = "Exact money, the line state machine, the hash-chained decision record, a strict CSV import, the database schema with append-only triggers, crash and outage drills, and a million-line import." },
  { id = "R1", name = "imports and the normalized schema", about = "Import profiles, encodings and date formats with ambiguity detection, OFX, invoices and bills, revisions instead of overwrites." },
  { id = "R2", name = "deterministic matching", about = "Matching tiers from exact to rule-based, and a typed exception queue for everything else." },
  { id = "R3", name = "review, approvals, rules and periods", about = "Sessions with mandatory TOTP, four-eyes approval, rules learned from corrections as versioned rules someone approved, and period close." },
  { id = "R4", name = "the model for ambiguous cases", about = "A provider-neutral port where a model only proposes, with recorded responses for every test." },
  { id = "R5", name = "reports, exports and the workspace", about = "Reconciliation reports per account and period, exports, and the review screens." },
  { id = "R6", name = "evidence battery", about = "A labelled synthetic set of 100,000+ lines, the full load runs and the restore drill." },
  { id = "R7", name = "pilot and ship gate", about = "One or two pilot firms closing one real month on the tool." },
  { id = "R8", name = "India", about = "GSTR-2B import, matching by GSTIN and invoice number, UPI references and Tally." },
  { id = "R9", name = "PDF statements", about = "An isolated PDF worker with per-bank layout profiles." },
]
up_next = { milestone = "R0", step = "R0", title = "The rest of the spine: schema, staging import, drills and the million-line import" }
+++

**Accounting Reconciliation** is a workspace for small accounting firms and freelance accountants. You
give it a client's bank statements and their invoices, bills and receipts. It ends every bank line in
one of three states, **matched**, **excluded** or **an exception**, and each one comes with a decision
you can explain to the client.

Plain rules do most of the matching: the exact amount, a date window, a reference, a known
counterparty. A model is asked only about the ambiguous remainder, and it only proposes; a person
approves. Rules learned from corrections are explicit, versioned rules that someone signed off, not a
black box that "remembers". Every decision is written to an append-only audit trail where each record
carries the hash of the one before it, so a quiet edit breaks the chain.

The tool reads records and reports. It never moves money, never sends email, never writes back to
accounting software and never connects to a bank.

## Where it stands

Promoted to a project on 2026-11-16 from a brief, and started the same evening. The first two slices of
R0 are on `main`: the pure domain and a strict streaming CSV reader. The ship gate needs one or two
practising accountants willing to pilot it with a real month, and they haven't been found yet.

The README on `main` still says "no code yet"; the code arrived a few minutes later.

The code is public at
[akira-shirase-oss/accounting-reconciliation](https://github.com/akira-shirase-oss/accounting-reconciliation).
