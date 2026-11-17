+++
title = "I0: a contact form that can't lose a lead"
description = "Day one of Intent Studio starts at the boring end: the contact form. A lead and the job of telling the owner are saved together, the notifier retries for most of a day, and a dead provider loses nothing. The first realism check stored and delivered every lead, and missed its latency target."
date = 2026-11-17T01:55:00Z

[extra]
kind = "experiment"
milestone = "I0"
step = "I0"
short_title = "Leads that survive"

[extra.summary]
goal = "Make the website's contact form the most reliable part of the product: every acknowledged lead stored, every owner eventually told, even when the notification provider is down."
built = "A pure lead-intake domain, a lead and its notification job saved in one statement, a leased notifier with a day-long retry schedule, rate limits and a honeypot, an operator inbox in SvelteKit, failure drills against the release binary, and a k6 load scenario."
proof = ["50 a second for a minute with the provider refusing throughout: 2,851 leads acknowledged, 2,851 stored", "every notification delivered once the provider came back", "p99 402 ms against a 100 ms target, on a busy laptop: committed as a miss", "the first burst run is kept as invalid: a stray probe of mine shared its database", "no independent review of the code yet"]
code = "akira-shirase-oss/intent-studio · main @ 5df19c5"
+++

The most expensive bug a small business's website can have isn't a broken layout. It's a customer who
fills in the quote form, sees "thanks, we'll be in touch", and is never heard from again because an
email service had a bad afternoon.

So the website builder starts with the contact form.

## What I built

Milestone I0, the spine, in four slices:

- **A pure domain** for lead intake: field limits, consent, a honeypot field (a hidden box that only
  bots fill in), submission keys and content fingerprints so a resent form isn't stored twice, the
  states a lead and its notification go through, the retry schedule, rate-limit buckets and retention.
- **Durable intake.** `POST /v1/sites/{site}/leads` takes a form of up to 16 KiB and saves the lead and
  its notification job in one database statement. It limits each address and each site, gives the
  database 3 seconds, and if it can't save, it answers 503 with `Retry-After`. It never says "thanks"
  for a lead it didn't keep.
- **A notifier** with its own database connections, which claims jobs under a lease and counts each
  attempt when it claims it, so a crash can't make an attempt disappear.
- **A provider stand-in** that can answer, fail with 503, hang, or accept and then hang.
- **A read-only operator inbox**: sign in, see leads newest first with their notification state. A table
  on wide screens, a card per lead on phones, built with Tailwind and shadcn-svelte from Colophon's UI
  kit.
- **Drills and load.** Failure drills against the release binary (a notification provider down, one
  that never recovers, an answer lost after acceptance, `kill -9` mid-request, Postgres stopped
  mid-run), each ending with a check that no lead content reached the logs. And a k6 scenario that
  reconciles every acknowledged submission against the database.

## How it works (the short version)

The lead and the "tell the owner" job are written **together, or not at all**. That's the outbox
pattern: instead of saving a lead and then calling the email service (and hoping), you save the lead
and a note saying "send this", in the same step. A separate worker reads the notes and sends them.
If the service is down, the note waits. If the worker crashes, another one picks the note up when its
lease runs out.

## Does it actually work?

The first realism check ran 50 submissions a second for a minute, with the provider stand-in refusing
**every** notification for the whole run, then brought it back:

- **Nothing lost.** 3,001 submissions, 150 of them deliberate resends: 2,851 distinct leads
  acknowledged, 2,851 stored, 0 stored without being acknowledged.
- **Everyone told.** After the provider recovered, all 2,851 notifications were delivered; the largest
  group, 1,083, got through on their fifth attempt.
- **Too slow.** p99 was 402 ms against a 100 ms target, so the run is committed as a **fail**. The
  machine (Apple M2 Pro, 12 cores, 32 GiB) had a load average of 27 to 57 from other builds; idle, one
  submission takes about 2 ms end to end. That's a reason to re-run it on a quiet machine, not a reason
  to call it a pass.

The operator inbox has a browser test at 1280 and 360 pixels wide: keyboard-only sign-in, a wrong
password announced to screen readers, no sideways scrolling, sign-out ending the session on the server,
and no lead content in the server log. The drills and the browser test are wired into the gate and CI.
The commits don't record a test count, so I'm not quoting one.

## Where I messed up

**My retry schedule couldn't survive an afternoon.** The plan promised notifications would keep
retrying for "about a day": start at one minute, double each time, eight attempts. But doubling from a
minute only reaches 64 minutes by the seventh wait, about an hour in total on average. A two-hour
outage would have killed most notifications. It now grows four times per attempt, up to a 6-hour cap:
8.8 to 17.7 hours of waiting in total.

**My own probe poisoned a load run.** The first burst run, 250 submissions a second, looked fine on
the intake side (p99 64.8 ms, every one of 14,251 leads stored). But a manual latency probe I'd
started earlier was still running, missed by my clean-up command, and connected to the same reused
database. Its notifier claimed outbox rows and "delivered" them to an in-memory stand-in: the real
provider fixture accepted 577, while 14,251 rows were marked delivered. So the run's notification
numbers describe a different process. It's kept, marked invalid. The load script now creates a fresh
database for every run and only passes if the rows marked delivered equal what the provider actually
accepted.

## What it doesn't do yet

- **It doesn't build websites.** Briefs, facts, components, the model, previews and launch are
  milestones I1 to I3.
- **I0's load evidence isn't finished.** The burst run needs a valid rerun, the realism check needs a
  quiet machine, and the 1,000,000-submission run is owed.
- **No independent review yet.** Every project that was reviewed today had High findings. This one
  hasn't had its turn.
- **It's blocked on people.** Three pilot clients, a model provider and a spending cap, a privacy
  notice and a data-processing agreement with each client, and deploy access to their sites.

## Up next

Finish I0's load evidence, then a strict independent review of the spine, then I1.
