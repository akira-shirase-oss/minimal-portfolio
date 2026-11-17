+++
title = "N0: a client that can only ask"
description = "Day one of the Native Workspace exploration: a network layer that can't send anything but a bodyless GET, a freshness rule that won't call stale data live, and a first window. That window's event list froze the app for over a minute under load; an AppKit table fixed it."
date = 2026-11-17T02:05:00Z

[extra]
kind = "experiment"
milestone = "N0"
step = "N0"
short_title = "A client that can only ask"

[extra.summary]
goal = "Lay the spine of a native Mac workbench that reads the other services honestly: bounded, read-only, never claiming to be live when it isn't."
built = "A SwiftPM package with a pure core, a GET-only transport with its own hard deadline, the Service Monitor adapter, credential handling, a first SwiftUI window, a headless replay tool, architecture checks and CI."
proof = ["the architecture check is proven able to fail, 33 planted violations", "the first event list froze the main thread for 72 s and 79 s; with an AppKit table: 0 hangs, worst wait 62 ms", "real Service Monitor and Durable Runner killed 5 times: 0 events lost, 0 duplicates", "the 1,000,000-event replay is owed on a quiet machine"]
code = "akira-shirase-oss/native-workspace · main @ f232c6a"
+++

The safest visitor is one who physically can't touch anything. You can let them walk around the
whole building.

That's the starting rule for a Mac app that looks into the other projects' services: in the first
versions, it can only ask.

## What I built

Three slices of N0:

- **A Swift package** (macOS 26, Swift 6 language mode) with a pure core: the event model, rendering
  of untrusted text as plain text only, a bounded queue whose gap markers count every dropped event, a
  bounded event store that only acknowledges batches it has synced and refuses duplicates, and a
  freshness state machine.
- **A transport that can only GET.** The request builder can only make a bodyless GET. Bodies over the
  cap are cut while they arrive, a declared length over the cap is refused before the body, a hung or
  trickling service hits a hard deadline, and redirects to another origin are refused.
- **The Service Monitor adapter**: status, checks, incidents and paging. The token only ever goes to the
  service's `/api/` paths, and an admin-class token only works against a service on the same machine.
  Durable Runner's reads need no credential at all.
- **Credentials** that can't be printed by any text form, read from the environment or the Keychain.
- **A first window**: each paired service's freshness, re-checked twice a second, the service's own
  verdict, its items (never green unless the data is live), the bounded event list and the ingest
  counters. Pairing problems show in the window instead of a log.
- **A replay tool** that pushes 1,000,000 events through the queue, the on-disk store and the list, with
  bursts and duplicates, and fails on any mismatch or main-thread hang. CI runs a 30,000-event smoke.
- **Architecture checks** that fail on WebKit, on starting processes, on UI imports in the pure
  packages, on building any request that isn't a GET, and on interpreting markup.

## How it works (the short version)

The app shows data as **live only within one poll interval plus a second** of the last good answer.
After that it's stale, and it says so. When polling fails it backs off from 1 second up to 30, with
jitter. A `401` stops polling at once, and the data on screen stays visible but turns neutral, so an
expired token never looks like a healthy service.

## Does it actually work?

- **The checks can fail.** The architecture check's self-test plants each violation and proves the
  check catches it: 33 cases. Slice 1 recorded 37 test cases for the core; later slices added more,
  and their total isn't recorded, so I'm not quoting one.
- **Against the real services.** A drill builds scratch copies of Service Monitor and Durable Runner
  from their `main` branches, runs them on their own ports, and kills and restarts them while the app's
  model watches. Five cycles passed: data went stale 0.01 to 1.7 seconds after each kill and live again
  1.8 to 3.0 seconds after each restart, with 30 events acknowledged, none lost and no duplicate rows,
  also after reopening the store. The two failed runs before it are kept and explained.
- **Against a stand-in service.** A package-level drill kills and restarts a fixture service at random
  points (100 times in CI) and checks nothing shows as live while it's down. It passed with the Mac's
  load average at 88.

## Where I messed up

**The first window froze for over a minute.** Under the fixture load (1,000 events a second, with
10,000-event bursts), the first event list, a SwiftUI `List`, stalled the main thread for 72 seconds,
then 79, and peaked at 1.7 to 2.0 GB of memory. Sampling the process found it in SwiftUI's automatic
row heights for inserted rows, which cost more the bigger the batch. The list is now an AppKit
`NSTableView` with fixed row heights. Same load: 0 hangs, a worst main-thread wait of 62 ms, and an
83 MB peak. The old list is still behind a switch, so the freeze can be reproduced.

**My 2-second deadline was really 4.** The system's networking layer stretched the timeout to about 4
seconds when a response had no `Content-Type`, because content sniffing waits for body bytes. The
transport now enforces its own hard deadline instead of trusting the system's.

**The adapter called a healthy service a mismatch.** It reported Service Monitor's "monitoring ok" as
disagreeing with "ready". Fixed.

## What it doesn't do yet

- **The full replay hasn't run.** The script refuses to start the 1,000,000-event run at a load average
  of 6 or more, and today never got there.
- **No profiler traces.** The Instruments traces of the freeze, before and after, are owed: on the busy
  machine the tracer once hung at its time limit and once never launched the app. Both misses are kept.
- **The Keychain test is skipped** in an unsigned test process, with its reason printed. The signed app
  target that can run it comes later.
- **It's waiting on Service Monitor** for a read-only viewer token. Today Service Monitor has one admin
  token, so the exploration only talks to a local instance, under a development-only exception.
- **No independent review yet**, and no comparison against the terminal. That comparison decides
  whether this becomes a project at all.

## Up next

Finish N0's evidence, then N1: menus, shortcuts and accessibility for the native shell.
