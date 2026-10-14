+++
title = "Checkpoint 0.5: the first real check"
description = "My monitor can finally look at a website and tell the truth about it. Plus two of my own mistakes that the tests caught."
date = 2026-10-14T12:50:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.5"
short_title = "The first real check"

[extra.summary]
goal = "The monitor's real job: check a website once, and tell the truth about what happened."
built = "The check itself, a locked-down web client, and an address book with a bouncer."
proof = ["4/4 basic cases right, each within its time limit", "67 tests, 4/4 deliberate bugs caught", "0 warnings"]
code = "7930d6e"
+++

For four checkpoints, my monitor couldn't actually monitor anything.

Now it can.

## What I built

The heart of the whole project: **one check**. Give it a web address and some settings, and it comes back with one of three answers:

- **it's fine,**
- **it's broken,** and how: an error code, a timeout, a refused connection, a reply that's too big…
- **or "I couldn't look".** That's a *gap*, for example when the address isn't allowed. A gap is never counted as fine.

Every check follows the same strict rules: one try, one connection, one time limit for everything. It doesn't follow redirects, go through proxies, reuse old connections, or unzip compressed replies.

## How it works (the short version)

- **One time limit covers everything,** from looking up the name to the very last byte. Think of a kitchen timer you start before you even pick up the phone.
- **The address book has a bouncer.** When the monitor looks up a name like `example.com`, every address that comes back must be on the public internet. If even one is private, the whole answer is refused. Mixing a real address with a private one is a known trick for sneaking past checks like this.
- **A broken website isn't an error in my code. It's the answer.** The check always reports what it saw, so a crash in the monitor can never be mistaken for a broken website, or the other way round.

## Does it actually work?

First, the four cases from the plan, against [the practice server from 0.4](@/service-monitor/checkpoint-0-4.md), over real connections:

- **Fine:** pass (200).
- **Broken:** "500", reported as a failure.
- **Hanging:** gave up when time ran out, within the 1-second limit plus a quarter-second of slack.
- **Server off:** "connection refused", in under a second.

Each one used **exactly one** connection.

Then the security side:

- An address that isn't allowed is refused **before anything is sent**. The practice server saw 0 connections.
- A fake address book that points a name at the cloud's password address (`169.254.169.254`): refused. Same for a mix of a real address and a private one.
- A name that can't be looked up: reported as a DNS failure, with the reason.

**67 tests** in the whole project, all passing. **0 warnings.**

## Where I messed up

Two of my own mistakes, both caught in this checkpoint.

**1. A leaky exception.** Back in [0.3](@/service-monitor/checkpoint-0-3.md), I let *names* use the special "testing on my laptop" port, assuming the address check would keep them honest. But the address check never sees the port number, which gets added later. So in testing mode, a name could have reached *any* port on my laptop.

Fixed: only the literal address `127.0.0.1` gets the exception now. Names always follow the public rules.

**2. A test that couldn't fail.** I broke the "never reuse a connection" setting on purpose, and every test still passed.

Why? My practice server always says "close the connection after this", so reuse could never happen in a test, and the setting was invisible. I added a practice address that keeps connections open, plus a test that runs two checks and expects two connections. Now, breaking the setting fails the test: 1 connection instead of 2.

That's the whole point of breaking things on purpose. A passing test only means something if it *can* fail.

(Plus a small Rust one: the compiler refused a line that walks through a chain of errors. One extra character, `&`, fixed it, and it's now in my Rust notes so it doesn't happen twice.)

## What it doesn't do yet

- Problems with a site's security certificate show up as "couldn't connect", instead of getting their own category. That needs its own test server, in M1.
- With a time limit under 2 seconds, a slow start to the connection is reported as "no reply in time" rather than "slow to connect".
- It does one check, once. There's no schedule yet.

## Up next

**Checkpoint 0.6: a command I can actually run.** `service-monitor check <url>` will print exactly what the check saw. Then the first milestone is done.
