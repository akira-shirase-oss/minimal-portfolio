+++
title = "I read the code before writing the code. It found 4 traps."
description = "Before building my uptime monitor, I checked how its libraries really behave. Four surprises, any of which would have quietly broken it."
date = 2026-10-14T12:00:00Z
aliases = ["/posts/service-monitor-read-the-source-first/"]

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "day 0"
short_title = "I read the code first. It found 4 traps."

[extra.summary]
goal = "Find out how the libraries really behave before trusting them with a monitor."
built = "A knowledge base for the project, and a list of traps with a fix for each."
proof = ["4 traps found before writing any code", "every number in the plan double-checked"]
+++

Have you ever had a website go down and found out from an angry customer instead of your own alerts?

That's the job of an uptime monitor. It checks your site every minute and tells you when something breaks. Simple idea.

But a monitor has one job: telling the truth. And the dangerous bugs in a monitor aren't the ones that crash it. They're the quiet ones: a check that secretly retries until it passes, or a gap in the data that shows up as green.

I'm building one anyway. It's called **Service Monitor**, it's written in Rust, and I'm building it with Claude Code, in the open. This is the first entry in [the build log](@/service-monitor/_index.md).

## The rule: don't trust memory

Programmers (and AIs) often write code from memory of how a library works. But libraries change, and memory is optimistic.

So before writing any monitor code, Claude read the actual source code of the exact library versions we'd use, and ran tiny experiments to confirm what it found.

Four things surprised us.

## Trap 1: an IP address skips the safety check

A monitor visits whatever web address you give it. That's handy, and also a little risky. Someone could point it at things inside your private network, like the special address on cloud servers that hands out passwords to anything that asks from inside. (Security folks call this SSRF.)

The usual guard checks every address when a name like `example.com` gets looked up. But when the address is already a number, like `http://[::ffff:127.0.0.1]/`, there's nothing to look up, so the guard never runs.

In our test, that address reached a private test server, and the guard was called **0 times**.

**Fix:** check addresses written as numbers directly, before anything goes out.

## Trap 2: hidden retries

My rule is "one check, one try". If a service is flaky, I want to see it. If it's struggling, I don't want to pile on.

It turns out the web library quietly retries some requests: up to **2 extra attempts** for certain errors. And a layer underneath it retries too, with no setting to turn it off.

**Fix:** switch off the first, avoid the conditions that trigger the second, and leave out the feature they live in.

## Trap 3: the clock that sleeps with your laptop

Rust's usual stopwatch stops counting while a laptop is asleep. On my machine it said **17,240 seconds** since startup, while the clock that also counts sleep said **62,115**. That's about 12.5 hours of sleep it never noticed.

For a monitor, that means checks missed while the laptop slept would simply vanish, instead of showing up as "we weren't watching".

**Fix:** work out every check time from the real clock, and record missed checks as gaps.

## Trap 4: the database that doesn't mention typos

SQLite silently ignores a setting it doesn't recognise. Mistype the one that makes writes crash-safe, and you get no error, just a less safe database.

**Fix:** read every setting back at startup, and refuse to start if one doesn't match.

## Bonus: checking the maths

The plan was full of numbers, so we checked every one with a script. All correct.

One limit nobody had written down: with the default settings, only **12 monitors** can point at the same server before the monitor starts saying no. That's the first wall a real user would hit.

## What it doesn't mean

- None of these are bugs in those libraries. They're sensible choices for general use, just wrong for a monitor.
- These facts are for these exact versions, and they get re-checked on every upgrade.
- At this point there was zero monitor code. This was all reading.

## The takeaway

The libraries were fine. My assumptions weren't.

Reading first turned four "it probably works like this" into four tests to write before the code that needs them.
