+++
title = "N0: a client that can only ask"
description = "Day one of the Native Workspace exploration: a network layer that can't send anything but a bodyless GET, a freshness rule that won't call stale data live, and a first window. That window's event list froze the app for over a minute under load; an AppKit table fixed it. N0 is built and under its first independent review; its million-event replay is owed."
date = 2026-11-16T21:05:00-05:00

[extra]
kind = "experiment"
milestone = "N0"
step = "spine"
short_title = "A client that can only ask"

[extra.summary]
goal = "Lay the spine of a native Mac workbench that reads the other services honestly: bounded, read-only, never claiming to be live when it isn't."
built = "A SwiftPM package with a pure core, a GET-only transport with its own hard deadline, the Service Monitor adapter, credential handling, a first SwiftUI window, a headless replay tool, architecture checks and CI."
proof = ["75 XCTest cases, two of them stated skips; the architecture check proven able to fail, 33 planted violations", "the first event list froze the main thread for 72 s and 79 s; with an AppKit table: 0 hangs, worst wait 41 ms in Instruments", "real Service Monitor and Durable Runner killed 5 times: 0 events lost, 0 duplicates", "1,000-point package drill passed; the 1,000,000-event replay is owed on a quiet machine"]
code = "akira-shirase-oss/native-workspace · main @ b0e3554"
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

- **Tests and checks.** The roadmap records 75 XCTest cases, two of them skipped with their reason
  stated (the Keychain round trip needs the signed app; the real-service drill runs only under its
  driver). The architecture check's self-test plants each violation and proves the check catches it:
  33 cases.
- **Against the real services.** A drill builds scratch copies of Service Monitor and Durable Runner
  from their `main` branches, runs them on their own ports, and kills and restarts them while the app's
  model watches. Five cycles passed on a clean commit: data went stale 0.01 to 1.9 seconds after each
  kill and live again 1.2 to 7.6 seconds after each restart, with 29 events acknowledged, none lost and
  no duplicate rows, also after reopening the store. The two failed runs before it are kept and
  explained.
- **Against a stand-in service.** A package-level drill kills and restarts a fixture service at random
  points (100 times in CI) and checks nothing shows as live while it's down. The 1,000-point version
  passed too: 737 seconds at load averages of 21 to 66, 98,469 events, none lost, every request a GET.
  Its first attempt hung for about 46 minutes, because starting the fixture server had no time limit.
  That miss is kept, and both start and stop are bounded now.

## Where I messed up

**The first window froze for over a minute.** Under the fixture load (1,000 events a second, with
10,000-event bursts), the first event list, a SwiftUI `List`, stalled the main thread for 72 seconds,
then 79, and peaked at 1.7 to 2.0 GB of memory. Instruments put 100% of 15,666 main-thread samples in
the list's row diffing, 78% of them building a hosting view for each inserted row. (I first called it
quadratic; that was an overstatement.) The list is now an AppKit `NSTableView` with fixed row heights.
Same load: 0 hangs and an 83 MB peak, and in the Instruments trace afterwards a worst main-thread wait
of 41 ms over 76,631 events. The old list is still behind a switch, so the freeze can be reproduced.

**My 2-second deadline was really 4.** The system's networking layer stretched the timeout to about 4
seconds when a response had no `Content-Type`, because content sniffing waits for body bytes. The
transport now enforces its own hard deadline instead of trusting the system's.

**The adapter called a healthy service a mismatch.** It reported Service Monitor's "monitoring ok" as
disagreeing with "ready". Fixed.

## What it doesn't do yet

- **The full replay hasn't run.** The script refuses to start the 1,000,000-event run at a load average
  of 6 or more, and the load never fell below 16 today.
- **The first independent review is running**, so these results are mine until it reports.
- **The Keychain test is skipped** in an unsigned test process, with its reason printed. The signed app
  target that can run it comes later.
- **It's waiting on Service Monitor** for a read-only viewer token. Today Service Monitor has one admin
  token, so the exploration only talks to a local instance, under a development-only exception.
- **No comparison against the terminal yet.** That comparison decides whether this becomes a project
  at all.

## Up next

Fix what the review finds and run the full replay on a quiet machine. Then N1: menus, shortcuts and
accessibility for the native shell.
