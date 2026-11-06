+++
title = "Checkpoint 2.1: the outbox deliverer"
description = "Signed webhooks delivered at least once from a bounded pool — a hung receiver holds a delivery slot, never a probe slot."
date = 2026-11-05T16:00:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.1"
short_title = "Outbox deliverer"
tests = 61

[extra.summary]
goal = "When an incident opens, the alert actually gets out — and a hung receiver can't take the monitor down with it."
built = "Bounded delivery pool with per-attempt deadline, retry schedule with deterministic FNV-seeded jitter, HMAC-SHA256 x-smon-signature + stable x-smon-event identity; bookkeeping still through the single writer; exhausted events stay visible in notify_outbox."
proof = ["6 integration tests in tests/deliver.rs (hang, retry, exhaustion, restart, signature)", "live: incident + recovery webhooks delivered signed to /sink, first-attempt", "webhook pointed at /sink/hang: API responsive, probes on schedule, retries bounded"]
code = "akira-shirase-oss/monitoring-service · main @ eec162a"
+++

M2 is the notify milestone — a monitor that sees the outage but can't tell
anyone is a diary, not a monitor. Four steps.

**What changed:** incident transitions already landed in `notify_outbox`
inside the same commit as the check — this step gives them a delivery path. A
bounded worker pool with its own deadline, a retry schedule with deterministic
jitter (FNV-1a hash of the event id — testable, no `rand`), and an
HMAC-SHA256 signature over the exact body (`x-smon-signature: sha256=…`, plus
a stable `x-smon-event` id for receiver-side dedup). Delivery bookkeeping
still goes through the single writer — the deliverer asks the writer to mark
attempts; it never touches the store itself. Events that exhaust their
retries stay visible in the table instead of vanishing.

**Proof:** 6 integration tests in `tests/deliver.rs` covering hang, retry,
exhaustion, restart, and the signature. Live: `/flaky?fail=3&pass=2` cycled
incidents open/resolved and both webhooks arrived signed with stable ids,
first-attempt. Then the sharp edge — webhook pointed at `/sink/hang`: the API
stayed responsive, probes kept landing on schedule, outbox attempts ticked up
with retries scheduled. A hung receiver holds a **delivery** slot, never a
probe slot.
