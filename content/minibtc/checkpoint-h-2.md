+++
title = "Checkpoint H.2: the fix that banned the honest peer"
description = "The fourth review's two findings are fixed, a security verification pass and CI landed, and then the fifth review caught my new peer scoring getting an honest peer banned in about three minutes. Fixed, a final check says ship, and the million-operation load runs at the reviewed build all pass. The CI run on the very last commit failed, and I don't know why yet."
date = 2026-11-17T06:19:00-05:00

[extra]
kind = "failure"
milestone = "H"
step = "H.2"
short_title = "The fix that banned the honest peer"
# Tests at 3844afd as recorded in the round-5 merge message; the review counted 281 at 3cc37db.
tests = 290

[extra.summary]
goal = "Close the fourth review's two peer-to-peer findings, run the security verification checklist against every surface, add CI, and re-run the million-operation load at the reviewed build."
built = "A ban that closes the connection, block requests rotated away from withholders, owner-only key files, deadlines and caps on every web surface, a push-only mempool rule, CI with a required dependency audit, and a fix for the peer scoring that blamed honest peers."
proof = ["a banned flooder's socket closed in 3.52 ms (before: never)", "behind a block withholder, first block at +9 s instead of +87 s", "final check at 3844afd: ship", "6 of 6 load runs at 1,000,000 operations each pass at 3844afd", "CI failed on the head commit at the dependency-audit step: cause not known yet"]
code = "akira-shirase-oss/miniBTC-chain · main @ eefa6c9 (final check at 3844afd)"
+++

Punishing whoever's nearest when something goes wrong is a great way to lose your friends. My
node learned to do exactly that.

## What I built

**The fourth review's two findings, fixed.**

- **A ban now hangs up.** Banning a peer used to remove it from the peer table and block reconnects,
  but its open connection kept being read. Now the ban closes the live connection, and so does the
  `banpeer` command.
- **A peer that withholds blocks loses its requests.** One that announced headers and then never
  sent the blocks used to hold its requests for the full 60-second timeout. Now a stalled request
  moves to another peer after 10 seconds, halving with each stall down to 2, and the staller loses
  score.

**A security verification pass, P14,** worked through a checklist against every surface:

- Keystores, the RPC cookie and drafts are created readable by the owner only, and a planted symlink
  is replaced, never followed.
- The wallet's send and confirm handlers never broadcast without the CSRF token and a matching
  origin.
- A network frame over 2 MiB is refused from its header, before the body is read.
- Listening on anything but loopback needs an explicit flag.
- The RPC checks authentication before reading a body, and every web surface has a connection cap
  and a header deadline. The wallet UI sends a content security policy, refuses to be framed, and
  checks the `Host` header against DNS rebinding.
- The MCP server labels peer-supplied text as untrusted and has a read-only mode.
- The mempool refuses `scriptSig`s that aren't push-only. That's a policy rule; consensus is
  unchanged.
- **CI**: GitHub Actions runs the full gate with the dependency audit required, a daily advisory
  check, pinned actions and Dependabot.

## How it works (the short version)

The fix for the review's new High is one rule: **only blame someone who promised something.** A
node now asks for a block only from peers that announced it, and a peer that doesn't have a block
can say so with a new `notfound` message. The peer delivering best is never scored for a stall.

## Does it actually work?

- **The live drills, before and after.** Before the ban fix, a banned flooder had 16,299 more of its
  messages handled and was never disconnected. After it, the node closed the socket in 3.52 ms.
  Behind a block withholder, the first block used to arrive at +87 seconds; after the fix, at +9.
- **The framing fix, live.** Over 11 attacker cycles, no stall was blamed on the honest peer, and the
  victim matched its tip. The final check re-ran it: 37 stall verdicts, none against the honest
  peer.
- **Load at the reviewed build** (`3844afd`, release build, 1,000,000 operations each), on my
  development Mac (Apple M2 Pro, 12 cores, 32 GB) with the load average around 4 to 6, which is close
  to quiet. All six pass:

| run | rate |
|---|---:|
| codec | 4,001,670 ops/s |
| wire | 4,491,323 ops/s |
| script | 22,387 verifies/s |
| mempool | 753,174 admits/s |
| chain | 2,277,096 validations/s |
| RPC | 54,655 requests/s, 1,000,000 of 1,000,000 ok |

  The chain run passes on the rejection path only (no valid blocks in it), so it measures how fast
  bad blocks are turned away, not how fast good ones connect.
- **The web surfaces at a million requests each.** The explorer served 1,000,000 requests at
  34,564.84 a second, p99 2 ms, and the wallet UI 1,000,000 at 9,021.41 a second, p99 2 ms. There's no
  threshold for these yet. About 0.1% failed in each, roughly one per connection the server closed at
  its new per-connection cap, which fits the load tool's old HTTP/1.0 keep-alive handling. That
  explanation isn't proven server-side.
- **Tests**: 249 at the start of this round, 281 after P14, and 290 at the reviewed build as recorded
  in its merge message. The final check says **ship**.

## Where I messed up

**My stall scoring got an honest peer banned.** An attacker announced headers it didn't have and
withheld the blocks. My node re-asked honest peers for blocks they'd never announced; they stayed
silent, and my node scored them for it. Live, an honest peer was banned in about three minutes. The
fifth review caught it, and the "only blame someone who promised" rule above fixed it.

**P14 left gaps in its own bounds.** There was no write deadline, so 64 clients that never read could
lock out the RPC for 45 seconds and the explorer for 60. Now there's a 10-second write-stall deadline
and a limit of 1,000 requests per connection. The `Host` check also ignored case, and a missing
`Host` header wasn't refused; both are fixed, and peer score is capped.

**My own test was weaker than its name.** With the ban fix switched off, the test that a banned peer
is disconnected still passed, because a second mechanism also ends the session.

**The decision record overstates one result.** It says the attacker was disconnected every cycle; the
log shows it was closed before reconnecting in 9 and 8 of the 11 cycles.

## What it doesn't do yet

- **CI failed on the very last commit,** at the dependency-audit step, on a commit that only changed
  docs and result files. The cause isn't known yet: a new advisory or a fetch failure. CI passed on
  the reviewed build.
- **The devnet demo wasn't re-run** after round 5, and the final check didn't re-run the full gate or
  re-test the write-deadline fixes live.
- **One Low and one accepted trade-off** from the final check are open. I'll describe the Low once it's
  fixed.
- The MCP server still can't explain a rejected transaction.

## Up next

Find out why the last CI run failed, then the devnet demo on the final build.
