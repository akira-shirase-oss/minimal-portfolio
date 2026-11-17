+++
title = "N0: eighteen fixes, and a token that went to whoever answered"
description = "The N0 review found eighteen issues in the read-only Mac workbench. The worst: the admin token went to whatever process answered on the loopback port. Sixteen are fixed, one is documented and one is planned for N1; the second pass verified the fixes, and N0 stays in progress until its million-event replay runs."
date = 2026-11-17T00:59:00-05:00

[extra]
kind = "experiment"
milestone = "N0"
step = "fixes"
short_title = "Review fixes, and a token that went astray"

[extra.summary]
goal = "Fix the first review's findings in the Mac workbench's spine: untrusted text, credentials, the event store and the app's own checks."
built = "Inert, length-capped service text; invisible-character escaping by Unicode property; strict monitor ids; a check that the process on the loopback port is the pinned Service Monitor; a byte-bounded store under a private, locked directory; and closed bypasses in the architecture checks."
proof = ["the token check: 21 of 29 requests carried the token to an impostor before, 0 after", "116 XCTest cases passing in CI, 2 skipped with reasons", "60,000 stored events load in 165.78 ms with no hang", "second review pass: fixes verified, four gaps, all since fixed", "the 1,000,000-event replay is still owed"]
code = "akira-shirase-oss/native-workspace · main @ f4906c8"
+++

Leaving a key under the mat is risky. Handing it to whoever answers the door is worse.

## What I built

The first review found 18 issues: 11 Medium, one Low–Medium and 6 Low. The fixes, all on `main` (one Low is documented rather than fixed, and one is planned for N1):

- **The token only goes to the real service.** The admin token went to whatever process answered on the
  loopback port. Now the app finds the process that owns the socket and checks its executable and code
  hash against a pin before every request. On a mismatch nothing is sent, and `localhost` is
  rewritten to `127.0.0.1`.
- **Service text is inert.** Status strings from services were shown raw: bidi overrides, escape codes,
  forged lines, any length. They're now inert and capped, and unknown states read as "unknown".
  Invisible characters are escaped by Unicode property across every code point instead of from a short
  list, and combining marks are capped at 4 per character.
- **Ids can't walk the URL.** A hostile monitor id could crash the app or send an authenticated request
  to another path, such as `../../version`. Ids now have to be UUIDs, each URL segment is encoded, and
  dot segments are refused.
- **The store is bounded and private.** Storage is bounded in bytes (8 KiB of text per event, 64 MiB in
  memory, 8 MiB segments), and the store's directory is forced to owner-only and held under an
  exclusive lock.
- **The checks can't be dodged.** Bypasses in the architecture checks are closed, with 9 new planted
  cases. One malformed string no longer fails a whole poll, and the environment token is unset once
  it's read.
- **Launch with a big history doesn't stall.** Loading a large stored history at launch used to stall the
  main thread; the figures are below.

## How it works (the short version)

The token fix comes down to **check who you're talking to, every time.** A port number isn't an identity.
The app asks the operating system which process owns the exact address it's connected to, and only that
process, if it matches the pin, gets the token.

## Does it actually work?

- **The token check, before and after.** Before the fix, an impostor on the port received 29 requests
  in 1.5 seconds, 21 of them carrying the token. The independent review reproduced that exactly. After
  it, in the real-service drill, the impostor got 0 requests.
- **Tests.** CI at `f4906c8` ran 116 XCTest cases with 2 skipped for stated reasons and none failing,
  and the architecture-check self-test passed 42 planted cases.
- **Launch with 60,000 stored events**, on my development Mac (Apple M2 Pro) at a load average of about
  22: history loaded in 165.78 ms, with no hang over 250 ms and a worst wait of 76.50 ms. Before the
  fix, a debug build stalled for 663 ms. That run was on an uncommitted tree.
- **The real-service drill**: 3 kill-and-restart cycles, 23 events acknowledged, 0 lost, 0 duplicates.
  Its four failed attempts are kept alongside it.
- **The CI replay smoke**: 29,000 events acknowledged, 2,000 dropped and exactly 2,000 counted in gap
  markers, 4,000 duplicates refused, no hangs.
- **The second review pass** verified the fixes, with fail-first checks holding for five of them, and
  found four gaps. All four are fixed: a flaky gate, an understated window in one decision, a suspected
  hole in a fast path, and a wrong cross-reference.

## Where I messed up

My new id test failed on CI the first time. Closing the architecture-check bypasses made a pipe race in
the gate more frequent: 1 run in 20 failed, now 0 in 50. And one fix commit pointed at the wrong
decision record.

## What it doesn't do yet

- **N0 isn't done.** The 1,000,000-event replay still has to run, on a machine quiet enough for its
  script to start.
- **Three security residuals** from the review are open, along with two non-security Lows. I'll describe
  the security ones once fixed.
- The last three fixes came after the second review pass, so no reviewer has checked them yet.

## Up next

The million-event replay, then N1: the native shell.
