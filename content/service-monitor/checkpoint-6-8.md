+++
title = "Checkpoint 6.8: the guide page"
description = "Every status word documented in plain English from one glossary — and a drift test that fails the build if the wire vocabulary and the guide ever disagree."
date = 2026-11-06T12:51:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.8"
short_title = "Guide + drift check"
tests = 106

[extra.summary]
goal = "A plain-English reference a new user can read — that cannot silently rot as the system grows."
built = "/guide rendering lib/vocabulary.ts, plus guide_drift.rs: five tests that walk the real serialized vocabulary through the store's own encode_slot and check both directions."
proof = ["a new enum variant without a guide entry fails the build; a stale guide word fails it too", "5 drift tests + guide render spec green"]
code = "akira-shirase-oss/monitoring-service · main @ 911287e"
+++

Eighth slice.

**Gap:** the old monitor explained every status word in plain English; the
rebuild had no reference a new user could read.

**What changed:** `/guide` renders from one glossary file
(`lib/vocabulary.ts`) — statuses, outcomes, transport details, incident fields,
and the concepts that trip people up (coverage vs success, generation, missing
evidence, monitoring-unavailable). The durable piece is `guide_drift.rs`: five
Rust tests walk the **real serialized vocabulary** through the store's own
`encode_slot` mapping and check *both directions*. Every wire word must be
documented, and no guide word may exist that the system can't emit. A new enum
variant without a guide entry fails the build; a stale glossary entry fails it
too.

**Proof:** the drift test is the feature's own guarantee — add a word to the
API and the guide demands an entry; remove one and it demands the entry's
removal.
