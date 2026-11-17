+++
title = "N0: a client that can only ask"
description = "Day one of the Native Workspace exploration: a Swift package whose network layer physically can't send anything but a bodyless GET, a freshness rule that won't call stale data live, and a drill that kills the service at random and checks nothing is lost or doubled. No window yet."
date = 2026-11-17T01:21:00Z

[extra]
kind = "experiment"
milestone = "N0"
step = "N0"
short_title = "A client that can only ask"

[extra.summary]
goal = "Lay the spine of a native Mac workbench that reads the other services honestly: bounded, read-only, never claiming to be live when it isn't."
built = "A SwiftPM package with a pure core (event model, inert rendering of untrusted text, a bounded ingest queue that counts its drops, a bounded event store, a freshness state machine), a GET-only transport, the Service Monitor adapter, credential handling, architecture checks and CI."
proof = ["37 core test cases in slice 1, more in slice 2", "the architecture check is proven able to fail, 33 planted violations", "disconnect-restart drill: no lost acknowledged events, no duplicate rows, passed at load average 88", "no app window yet: that's N1"]
code = "akira-shirase-oss/native-workspace · main @ 64c10e4"
+++

The safest visitor is one who physically can't touch anything. You can let them walk around the
whole building.

That's the starting rule for a Mac app that looks into the other projects' services: in the first
versions, it can only ask.

## What I built

Two slices of N0:

- **A Swift package** (macOS 26, Swift 6 language mode) with a pure core: the event model, rendering
  of untrusted text as plain text only, a bounded queue whose gap markers count every dropped event, a
  bounded event store that only acknowledges batches it has synced and refuses duplicates, and a
  freshness state machine.
- **A transport that can only GET.** The request builder can only make a bodyless GET. Bodies over the
  cap are cut while they arrive, a declared length over the cap is refused before the body, a hung or
  trickling service hits a hard deadline, and redirects to another origin are refused.
- **The Service Monitor adapter**: status, checks, incidents and paging. The token only ever goes to the
  service's `/api/` paths, and an admin-class token only works against a service on the same machine.
- **Credentials** that can't be printed by any text form, read from the environment or the Keychain.
- **Architecture checks** that fail on WebKit, on starting processes, on UI imports in the pure
  packages, on building any request that isn't a GET, and on interpreting markup.

## How it works (the short version)

The app shows data as **live only within one poll interval plus a second** of the last good answer.
After that it's stale, and it says so. When polling fails it backs off from 1 second up to 30, with
jitter. A `401` stops polling at once, and the data on screen stays visible but turns neutral, so an
expired token never looks like a healthy service.

## Does it actually work?

- **Tests.** Slice 1 recorded 37 test cases for the core. Slice 2 added the transport, adapter and
  connection tests; their total isn't recorded in the commit, so I'm not quoting one.
- **The checks can fail.** The architecture check's self-test plants each violation and proves the
  check catches it: 33 cases.
- **The drill.** A package-level drill kills and restarts the stand-in service at random points (100
  times in CI), with two simulated app restarts, and checks that nothing shows as live while the service
  is down, that recovery happens within the backoff bound, and that no acknowledged event is lost or
  duplicated. It passed with the Mac's load average at 88.

## Where I messed up

**My 2-second deadline was really 4.** The system's networking layer stretched the timeout to about 4
seconds when a response had no `Content-Type`, because content sniffing waits for body bytes. The
transport now enforces its own hard deadline instead of trusting the system's.

**The adapter called a healthy service a mismatch.** It reported Service Monitor's "monitoring ok" as
disagreeing with "ready". Fixed in the same slice.

## What it doesn't do yet

- **No window.** The SwiftUI shell, menus, shortcuts and accessibility are N1.
- **The Keychain test is skipped** in an unsigned test process, with its reason printed. The signed app
  target that can run it comes in N1.
- **It's waiting on Service Monitor** for a read-only viewer token. Today Service Monitor has one admin
  token, so the exploration only talks to a local instance, under a development-only exception.
- **No independent review yet**, no load runs, and no comparison against the terminal. That comparison
  decides whether this becomes a project at all.

## Up next

Finish N0, then N1: the native shell.
