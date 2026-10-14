+++
title = "Checkpoint 0.2: Rust types that can't hold bad data"
description = "Validation that happens exactly once, memory sizes checked by tests, and the shell pipeline that lied to me."
date = 2026-10-14T12:20:00Z
aliases = ["/posts/service-monitor-checkpoint-0-2/"]

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.2"
short_title = "Rust types that can't hold bad data"
[extra.summary]
goal = "Make bad configuration impossible to hold, not just unlikely."
built = "Typed IDs, length-limited text, a status-code bitset, a validated config and a three-way check outcome."
proof = ["20 tests", "2/2 deliberate breakages caught", "0 clippy warnings"]
code = "4326b30"
+++

Most config bugs come from the same place: a value gets checked in one spot, then copied, changed or trusted somewhere else.

So this checkpoint makes bad config **impossible to hold**, not just unlikely.

## One way in

A monitor's settings arrive as a `RawConfig`: plain data from the API or CLI that nothing trusts yet. There is exactly one way to turn it into a `ValidatedConfig`:

```rust
let config = ValidatedConfig::try_from(raw)?;
```

That call checks every rule from the design. The interval must be 30 s to 1 h. The deadline must be 1–15 s. The name must be 1–80 characters. HEAD requests can't have a body check. And so on.

After that:

- The fields are **private**, with no setters. Once a config is valid, it stays valid for as long as it lives. An edit creates a new version instead of changing this one.
- It's deliberately **not `Clone`**. It'll be shared across tasks through an `Arc`, so nobody can deep-copy it by accident.

## Ownership doing the work

`try_from` takes the raw config **by value**, so the strings inside are *moved* into the validated config instead of copied.

It also reports **every** problem at once, not just the first. That's what an API form needs. Each rule turns into an `Option`, and only when all of them are `Some` does a config come out:

```rust
match (name, url, expected_statuses, body_assertion, timing) {
    (Some(name), Some(url), Some(expected_statuses), Some(body_assertion), Some(timing)) => {
        Ok(Self { name, url, method, expected_statuses, body_assertion, timing })
    }
    _ => Err(ConfigError { field_errors: errors }),
}
```

A small helper borrows the error list mutably (`&mut Vec`) for one call at a time and records each failure. The borrow checker makes sure nothing else touches that list in the meantime.

## Memory: measured, not assumed

These sizes are checked by tests, so if a change grows them, a test fails:

- **8 bytes** for an optional monitor ID, not 16. IDs wrap `NonZero` (database ids start at 1), so `None` hides in the zero bit pattern.
- **16 bytes** for a fixed-limit name, against 24 for a `String`. It's a `Box<str>`: text that never grows doesn't need a capacity field.
- **56 bytes** for the set of expected HTTP status codes. It's a bitset on the stack: no allocation, and checking a code is one shift and one mask.

Limits count **characters, not bytes**, so "é" counts as 1 although it takes 2 bytes. There's a test for that too.

## A rule that can never fire

The design says the deadline must be at most half the interval. But with its own ranges (interval ≥ 30 s, deadline ≤ 15 s), that can never be broken.

We kept the check anyway, and test it directly. If someone changes either range later, it won't fail silently.

## Do the tests have teeth?

20 tests passed on the first run. That proves less than it sounds: a test that would also pass on broken code is worthless.

So I broke two rules on purpose:

- Turned off "HEAD can't have a body check": **1 test failed**.
- Turned off "no control characters in names": **2 tests failed**.

Then I restored the originals and compared them byte for byte.

## My mistake

I checked formatting with `cargo fmt --check | head && echo clean`. It printed **clean**, while rustfmt was listing differences right above it.

A shell pipeline returns the exit status of its *last* command, which was `head`, and `head` was perfectly happy. The failure was swallowed.

Fix: run the check on its own, or use `set -o pipefail`. Small thing, but it's exactly how a CI script ends up lying to you.

## Numbers

- **20** tests, **0** clippy warnings.
- **2/2** deliberate breakages caught.

## The honest part

The URL is only length-checked so far. Blocking private and internal addresses, including tricky spellings like `2130706433` (that's `127.0.0.1`), is the next checkpoint.
