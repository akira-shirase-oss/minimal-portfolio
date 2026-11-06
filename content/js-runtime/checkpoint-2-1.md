+++
title = "Checkpoint 2.1: real timers, honest ref-counting"
description = "setTimeout/setInterval/clearTimeout/clearInterval/unref under rt.*, built on deno_core's own timer machinery — a pending ref'd timer holds the loop until it fires, an unref'd one doesn't, and a thrown callback classifies as a plain exception."
date = 2026-11-07T19:30:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.1"
short_title = "Timers"
tests = 27

[extra.summary]
goal = "Node-style timer semantics scripts can actually rely on — cancellation that cancels, ref'd timers that hold the loop, unref'd ones that don't — with no bare globals leaking into the sandbox."
built = "rt.setTimeout/setInterval/clearTimeout/clearInterval/refTimer/unrefTimer over Deno.core.createTimer (ref-counted, wired into the event loop); an id-map that removes fired one-shots and feeds the pending-work report in 2.3."
proof = ["7 lifecycle tests: pending ref'd timer holds loop + fires; cleared never fires; interval x3 stops on clearInterval; unref'd 60s timer exits immediately; ref'd 60s timer dies to the watchdog (6); throwing callback → 5; bare setTimeout global → ReferenceError(5)"]
code = "akira-shirase-oss (local, not yet pushed) · 79ef3a2"
+++

Timers look trivial until you ask what "pending" means. The honest answer
has three states: a *ref'd* pending timer is work the run must wait for; an
*unref'd* one is work that may be abandoned; and a cancelled one is gone —
all three now exist and are pinned end to end.

**Borrowed machinery, owned contract.** deno_core already ships Node-style
timers (`Deno.core.createTimer`) with ref-counting wired into the event loop
— ref'd timers keep the isolate's loop alive, unref'd ones don't. What was
missing is the public surface: no `setTimeout` global exists by default, and
the `rt.*` contract says everything a script can do lives in one namespace.
So `rt.setTimeout/setInterval` wrap `createTimer` and return ids from a map
that fired one-shots remove themselves from — the same map that feeds the
pending-work report in checkpoint 2.3.

**What the tests pinned.** `rt.setTimeout(cb, 30)` — the loop held, "end"
printed before "fired" (ordering matters: it proves the loop stayed open for
the timer, not that it raced). `clearTimeout` — the callback never ran.
`setInterval` — fired exactly three times, `clearInterval` stopped it.
`unrefTimer` on a 60-second timer — the process exited in ~10ms, proof the
loop isn't hostage to abandoned work. The *ref'd* 60-second timer — died to
the watchdog at 400ms with exit 6, proof the bound holds where Node itself
would just wait a minute. And `setTimeout` bare (not under `rt.`) —
`ReferenceError`, exit 5: the sandbox doesn't leak ambient globals.

**Lesson:** "add timers" is the wrong frame. The frame is *who keeps the
loop alive* — ref-counting is the whole semantics, and it's the difference
between a runtime whose `run` command finishes and one that waits an hour
for a timer nobody wanted.
