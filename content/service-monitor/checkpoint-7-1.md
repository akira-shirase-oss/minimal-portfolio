+++
title = "Checkpoint 7.1: email alerts as a second channel"
description = "Email joins webhooks in the same outbox — one incident transition enqueues one row per configured channel, each with its own retries, so a dead relay can never stall the other channel."
date = 2026-11-06T14:00:00Z

[extra]
kind = "experiment"
milestone = "M7"
step = "7.1"
short_title = "Email alerts"
tests = 125

[extra.summary]
goal = "Alert by email, not just webhook — without a second alerting architecture to keep honest."
built = "notify_outbox.channel (migration 0006): a transition enqueues one row per configured channel (webhook always; email when SMON_SMTP_{DSN,FROM,TO} are all set — partial config is a boot error). Sink::Email is a lettre AsyncSmtpTransport on rustls+tokio driving the same bounded pool, deadline, deterministic backoff and writer bookkeeping as webhooks. Subjects are CR/LF-sanitized; Message-ID carries the event id so retries thread one logical message; a partial outage in one channel can never claim or stall the other's rows."
proof = ["live drill: real server → loopback SMTP stub captured the full wire (EHLO/MAIL/2xRCPT/DATA/QUIT, sanitized subject, event-id Message-ID, forensic times); sqlite shows email delivered attempts=1, webhook pending and visible", "store: one row per channel; integration: 550-refusal→retry→delivered (attempts=2), webhook row untouched; partial-config boot refuses with an honest error"]
code = "akira-shirase-oss/monitoring-service · main @ 5c80f78"
+++

The last deferred channel — done as an outbox channel, not a second architecture.

**Gap:** the old monitor could email alerts; the rebuild shipped webhooks
only. Email is the channel most self-hosters actually have — a relay and an
address, no HTTP endpoint to stand up.

**What changed:** `notify_outbox` gained a `channel` column (migration 0006).
When an incident transitions, the commit transaction enqueues one row *per
configured channel* — same incident, same kind, distinct `event_id`s so each
channel owns its delivery bookkeeping. `pending_outbox` filters by channel, so
each deliverer's poll can never claim the other's rows: a dead SMTP relay
costs email its retry budget, and nothing else. Unconfigured channels enqueue
no dead-plan rows at all — the webhook row still always exists, pending and
visible, as the "no receiver wired yet" signal.

The delivery itself is `Sink::Email`: a lettre `AsyncSmtpTransport` on
rustls+tokio (the workspace's single `aws_lc_rs` provider + webpki-roots —
lettre's `rustls-tls` bundle would have forced `ring` on top and rustls
refuses an ambiguous process provider, which the build caught before any test
ran). It rides the same bounded pool, per-attempt deadline, deterministic
jittered backoff and writer bookkeeping as `Sink::Webhook`. Message headers
get the same paranoia as everything else: monitor names are CR/LF-sanitized
before they can reach a `Subject:` line, and `Message-ID` carries the event id
so an SMTP retry threads one logical message instead of sending duplicates.
Config is env-only — `SMON_SMTP_DSN`/`SMON_SMTP_FROM`/`SMON_SMTP_TO`, all
three required together; a partial set is a boot error, not a half-live
channel — and `Sink::describe` logs a recipient *count*, never addresses or
the credential-bearing DSN.

**Proof:** the store test asserts one row per channel with channel-filtered
polling. `tests/email.rs` runs a real loopback SMTP stub through the real
lettre client and real deliverer: deliver→mark (attempts=1), a 550-refused
`MAIL FROM` → deterministic retry → delivered (attempts=2), and the webhook
row untouched throughout. The live drill booted the real server against the
stub: the wire transcript shows the full conversation — `MAIL FROM`, both
`RCPT TO`s, `DATA` with the sanitized subject, event-id `Message-ID`, and the
forensic times in the body — and the store shows the email row `delivered`
attempts=1 while the webhook row stays pending and visible. Partial SMTP
config fails the boot with an honest error naming the missing var.

**Lesson:** "add email alerts" is a distribution problem wearing a feature's
clothes. The interesting decisions were all about isolation — a channel
column so failures partition cleanly, per-channel event ids so retries don't
collide, and a config contract that refuses to boot half-enabled. The sending
code was the easy part; making sure a broken relay can't lie about or stall
anything else is what makes it safe to run.
