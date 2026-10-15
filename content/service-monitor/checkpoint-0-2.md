+++
title = "Checkpoint 0.2: making bad settings impossible"
description = "Instead of checking settings everywhere they're used, check them once at the door, then make them impossible to change."
date = 2026-10-14T12:20:00Z
aliases = ["/posts/service-monitor-checkpoint-0-2/"]

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.2"
short_title = "Making bad settings impossible"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 20

[extra.summary]
goal = "Make it impossible for a bad setting to get into the monitor."
built = "A front door for settings: they only get in if every rule passes, and can't change after."
proof = ["20 tests", "2/2 deliberate bugs caught", "0 warnings"]
code = "4326b30"
+++

Most settings bugs come from the same place: a value gets checked in one spot, then copied, changed or trusted somewhere else.

Think of a bouncer at a club. Checking IDs at every table inside is slow, and someone always gets missed. Check once at the door, and everyone inside is fine.

## What I built

A front door for the monitor's settings.

Settings arrive as **raw** settings: whatever you typed, trusted by nobody. There's exactly one way to turn them into **validated** settings, and that's passing every rule:

- check every 30 seconds to 1 hour,
- give up on a slow site after 1 to 15 seconds,
- a name of 1 to 80 characters,
- and a few more.

Once settings are through the door:

- **They can't change.** Editing creates a new version instead.
- **They can't be copied by accident.** They'll be shared, not duplicated.

And the door reports **every** problem at once, like a form that highlights all the wrong fields instead of making you fix them one at a time.

## How Rust helps (the short version)

In Rust, every value has exactly one owner. When the raw settings walk through the door, their text *moves* into the validated version instead of being copied. Nothing is duplicated, and nothing is left behind to go stale.

The whole door is one line wherever settings come in:

```rust
let config = ValidatedConfig::try_from(raw)?;
```

That reads as: "try to turn the raw settings into validated ones, and stop here if any rule fails."

## Small things, measured

I like knowing exactly how much memory things take, so these sizes are checked by tests. If a later change makes them bigger, a test fails:

- **8 bytes** for an "ID, or nothing". Normally it would be 16. But ID numbers start at 1, so Rust uses 0 to mean "nothing" for free.
- **16 bytes** of bookkeeping for a name, instead of the usual 24. Text that never grows doesn't need room to grow.
- **56 bytes** for the list of "good" HTTP status codes, and checking a code is a single step.

Also, limits count **characters, not bytes**. "é" counts as one character, even though it takes two bytes.

## A rule that can never fire

The plan says the timeout must be at most half the check interval. But with the plan's own limits (interval at least 30 s, timeout at most 15 s), that's always true.

I kept the check anyway and tested it directly. If someone changes a limit later, it won't quietly break.

## Does it actually work?

All 20 tests passed on the first run. That proves less than it sounds: a test that would also pass on broken code is useless.

So I broke two rules on purpose:

- Turned off "a HEAD request can't check the page's content": **1 test failed**.
- Turned off "no hidden control characters in names": **2 tests failed**.

Then I put the code back exactly as it was. Good: the tests notice.

## Where I messed up

I checked the code's formatting with a one-line command that printed **"clean"**, while the formatter was complaining right above it.

The reason: when you chain commands with a pipe (`|`), the shell reports how the *last* command went. The last one was perfectly happy.

Lesson: run checks on their own, especially the ones you trust.

## What it doesn't do yet

The web address is only checked for length so far. Making sure it can't point at your private network comes next.
