+++
title = "Checkpoint 2.1: notify"
description = "Signed webhooks delivered at least once, editing that can't lose a probe mid-flight, and a fault fixture that fails on command."
date = 2026-11-05T16:00:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.1"
short_title = "Notify"
tests = 61

[extra.summary]
goal = "When an incident opens, the alert actually gets out — and a hung receiver can't take the monitor down with it."
built = "Outbox deliverer (bounded pool, per-attempt deadline, deterministic FNV jitter, HMAC-SHA256 signature), PATCH/DELETE that bump generation atomically, checks+incidents APIs, dashboard detail page, and a Node fault server."
proof = ["incident + recovery webhooks delivered signed to a live receiver", "hung receiver: API responsive, probes on schedule, retries bounded — it only ever holds a delivery slot", "stale PATCH → 409, delete-with-history → 409, 61 tests"]
code = "eec162a"
+++

A monitor that sees the outage but can't tell anyone is a diary, not a monitor.

## What I built

**The outbox deliverer.** Incident transitions already land in `notify_outbox` inside the same commit as the check — this step gives them a delivery path: a bounded worker pool with its own deadline, a retry schedule with deterministic jitter (FNV-1a hash of the event id — testable, no `rand`), and an HMAC-SHA256 signature over the exact body (`x-smon-signature: sha256=…`, plus a stable `x-smon-event` id for receiver-side dedup). Delivery bookkeeping still goes through the single writer — the deliverer asks the writer to mark attempts; it never touches the store itself. Events that exhaust their retries stay visible in the table instead of vanishing.

**Management writes that can't lose a probe.** `PATCH`/`DELETE` revalidate the merged monitor through the same rules as create, then bump `generation` in the same UPDATE — an in-flight probe claimed under the old generation is dropped as stale. Edit and invalidation are one committed fact. And a monitor with recorded checks or incidents can't be deleted at all: evidence isn't erasable through an API call; pause is the answer.

**Evidence endpoints and a detail page.** `GET …/checks` (missed rows included — gaps are part of the record), `GET /incidents` with filters, a dashboard detail route, and CLI `show/edit/pause/unpause/delete`.

**A fault server,** because none of this is provable without targets that fail on command: ok/fail/slow/hang/status/flaky, plus a `/sink` webhook receiver with a `/sink/hang` mode for the worst case.

## Proof, live

`/flaky?fail=3&pass=2` cycled incidents open and resolved; both webhooks arrived signed with stable ids. Then I pointed the webhook at `/sink/hang`: the API stayed responsive, probes kept landing, and outbox attempts just ticked up with retries scheduled — a hung receiver holds a delivery slot, never a probe slot.
