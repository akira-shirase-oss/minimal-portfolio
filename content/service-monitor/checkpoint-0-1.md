+++
title = "Checkpoint 0.1: rules first, code second"
description = "An empty project sounds boring. It's also the cheapest moment to decide what the compiler should never let me do."
date = 2026-10-14T12:10:00Z
aliases = ["/posts/service-monitor-checkpoint-0-1/"]

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.1"
short_title = "Rules first, code second"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 0

[extra.summary]
goal = "Set up the project, and the rules, before writing any real code."
built = "An empty project in nine parts, two pinned libraries, and rules the compiler enforces."
proof = ["0 warnings", "unwanted code left out of the build entirely"]
code = "aca3990"
+++

Nobody gets excited about an empty project.

But it's the cheapest moment to decide which mistakes you'll never allow, because there's no old code to clean up yet.

## How I'm building this

Every milestone is cut into small **checkpoints**. A checkpoint only counts when:

- its tests pass,
- Rust's strict code reviewer (a tool called clippy) has **zero** complaints,
- it's saved in git,
- and it's written up here, mistakes included.

## What I built

- **An empty Rust project, split into nine parts:** checking, scheduling, storage, alerts and so on. Each part has one sentence saying what it does, and what it must never touch.
- **Two libraries, pinned to exact versions:** tokio, the engine that lets a program do many things at once, and reqwest, for making web requests.

## The trick: leaving a feature out

On [day 0](@/service-monitor/day-0-read-the-source-first.md) I found that the web library retries some failed requests by itself. There's a setting to turn that off, and I'll use it.

But settings get forgotten. So I also left out the part of the library where those retries live (HTTP/2, which a simple health check doesn't need).

I checked the build afterwards: that code isn't in there at all. It can't misbehave if it doesn't exist.

## Rules the compiler now enforces

- **No `unsafe` code.** Rust's safety checks stay switched on everywhere in my code.
- **No `unwrap()` outside tests.** That's Rust's "assume this worked, and crash if it didn't". A monitor should report a problem, not fall over.
- **A name-clash check.** From [my AI Rust exams](@/posts/i-made-an-ai-read-the-rust-book.md): give a helper the same name as a built-in method, and Rust can quietly call the wrong one.

And one more choice: if a single check crashes, the monitor writes it down as a gap instead of taking the whole thing down with it.

## Numbers

- **16 seconds** to build the web library and its encryption code, using just the standard compiler on this laptop.
- **0** warnings. **0** tests, because there's nothing to test yet.

## What it doesn't do yet

Nothing runs. This checkpoint is the foundation, and nothing more.
