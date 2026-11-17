+++
title = "Checkpoint H.1: four review rounds, and a node stuck at block 128"
description = "An outside gap review found that a block failing halfway through could leave the chain half-applied, and that the project's own gate had probably never passed. Four fix rounds closed 11 High gaps. Each round's review found something new, including a header flood that ate 4.7 GB of memory and a fix that left any node more than 128 blocks behind stuck forever."
date = 2026-11-17T01:40:00Z

[extra]
kind = "failure"
milestone = "H"
step = "H.1"
short_title = "Security pass: four rounds"
# No executed full-suite count is recorded for round 4 yet; the entry gives the per-round counts.

[extra.summary]
goal = "Close the consensus, peer-to-peer and wallet gaps an outside review found, with every round re-checked live by a second reviewer before the next."
built = "Atomic block apply, per-block spend checks, merkle-mutation detection at every level, difficulty and BIP30/34 rules enforced in validation, reorgs judged at the fork point, bounded block and header intake, address-keyed bans, and an MCP spend gate where only the owner's signature approves."
proof = ["executed tests 167 → 214 → 231 → 242 across the first three rounds", "header flood: memory 6 MB → 4.7 GB before the fix, peak about 11 MB after", "the catch-up stall at block 128 found live, then fixed with a test that fails without it", "devnet demo 22/22 on all round-4 code", "fourth review pass still running: no verdict yet"]
code = "akira-shirase-oss/miniBTC-chain · main @ d007ae5"
+++

A blockchain node is a very suspicious accountant. It trusts nobody, checks every receipt, and
throws out anything that doesn't add up. Today's gap review asked: what happens when the accountant
gets interrupted halfway through a page?

The answer was bad. A block that failed partway through being applied could leave the chain's record
of who owns what half-updated. And the project's own gate, `scripts/check.sh`, failed on a rule that
had probably been broken since the day it was written. 23 gaps in total, 11 of them High.

## What I built

Four fix rounds on `main` (41 commits), each re-checked by an independent reviewer who ran real
nodes against it:

- **Blocks apply all or nothing.** A block that fails midway rolls back completely. Spends are
  checked against a view of the coins as they were before the block, which closes the class of bug
  where one transaction spends the same coin twice inside one block.
- **The rules live in validation.** Difficulty retargeting, the proof-of-work limit and the rules
  known as BIP34 and BIP30 (every block names its height; no transaction id can be reused while its
  coins are unspent) are now checked when a block arrives, not just when it's mined. A mutated merkle
  tree (the CVE-2012-2459 trick of duplicating a branch) is caught at every level.
- **Reorgs are judged where the chains split.** A competing branch is checked against the coins at
  the fork point, and a reorg that fails returns to the old tip.
- **The network can't drown it.** Block and header intake are bounded, a peer that floods useless
  headers is banned, a peer's slot is reserved the moment it's admitted, and at most 16 connections
  can be mid-handshake at once.
- **The AI can't approve its own spending.** The MCP server only produces unsigned drafts, and the
  owner's signature is the approval. The decision record is honest about the limit: an agent that
  has a shell *and* the wallet passphrase can always spend, so the passphrase is the real barrier.
- **The gate passes.** The "pure" consensus crate read a file from disk, which its own architecture
  rule forbids. It now only parses text it's handed.

Datadirs record a rules version now. An old devnet datadir that can't be replayed under the new
rules is refused, and the README explains how to start fresh.

## How it works (the short version)

Most of these come down to one idea: **never change the books until the whole page checks out.**
The block is applied to a scratch copy of the coin set. If anything fails, the copy is thrown away,
and the real set never saw it.

The flood fixes follow another: **a stranger gets a small, fixed allowance.** Headers from a peer are
kept in a bounded table, every one is validated, and a peer whose headers lead nowhere gets
penalised and then banned. Memory stays flat no matter how fast they send.

## Does it actually work?

- **Executed tests went from 167 to 214, then 231, then 242** through the first three rounds, each
  count from the reviewer's own runs, twice per round. Round 4 adds seven more test functions; its
  full-suite run hasn't been recorded yet.
- **Reverting a fix breaks its test.** The reviewer took fixes back out one at a time: for example, 2
  of 3 tests failed without atomic apply, and 4 of 5 without the per-block coin view.
- **Reindex holds.** After round 2, rebuilding the chain from disk reached the right tip in 10 of 10
  runs, including runs killed with `kill -9` at six different points.
- **The header flood is fixed on a real socket.** Across five flood variants, peak memory stayed
  between 5,984 and 11,344 KB, and the flooding peer got banned.
- **The devnet demo passes 22 of 22 checks** on all of round 4's code, including a node catching up
  600 blocks in 11 seconds, at a load average around 73.

All of this is on my development Mac, a 12-core M2 Pro, shared with other builds. No load runs today.

## Where I messed up

Every round fixed what it set out to fix, and every review found something the round had missed or
caused.

**Round 1 broke reindex.** To judge side branches properly, I started storing them after only the
cheap checks. Then reindex picked whichever child of the tip a hash map returned first. One cheap,
peer-supplied side block with a bad spend made `--reindex` fail at random: 8 of 20 runs, then 11 of
20. The review also found two older bugs: reindex ending on a weaker tip in 14 of 20 runs, and a
reorg never reaching a node that only hears blocks through a relay.

**Round 2 left the header table unbounded.** The reviewer pointed one TCP connection at a node and
sent 60,972 messages, 121.9 million headers, in 40 seconds. The peer was never banned, and the node's
memory went from 6 MB to 4.7 GB in 20 seconds.

**Round 3's fix stranded every slow node at block 128.** The server answered at most 128 blocks per
request and silently dropped the rest, while the requester asked for 500 at a time. Before, every new
batch of headers re-asked for the missing blocks, which hid the drop. My bounded header table now
counted those blocks as "known", so nobody ever asked again. Any node more than 128 blocks behind
stopped at height 128 for good. Live, it sat there for 126 seconds, then 504, and a 5,000-block run
stopped at 128 too. The old binary had synced 1,000 blocks in 16 seconds.

The same pass found that forks more than 2,000 blocks deep never resolved, that headers skipped the
median-time-past check, and that a per-IP ban on loopback cut off every local peer at once.

Round 4, merged tonight, asks for at most 128 blocks at a time, makes the server refuse an
over-sized request out loud instead of dropping part of it, re-asks for stranded blocks with a 60-second
timeout and another peer, and builds locators from the peer's best header so deep forks resolve. A new
test with a node 1,000 blocks behind gets stuck at 128 without the fix.

## What it doesn't do yet

- **Round 4 hasn't been reviewed.** The fourth pass is still running; until it reports, the 128-block
  fix is mine, not checked.
- **The load evidence is old.** The last million-scale run was 6M operations on 2026-11-10, and the
  explorer and wallet UI have only seen a smoke run (100,000 and 20,000 requests). Both are owed again
  on this code, on a quiet machine.
- **The MCP server still can't explain a rejected transaction**, and the end-to-end demo still has no
  seed restore or send back the other way.
- **No CI.** The gate passes when run by hand; nothing runs it on every push yet.
- Connecting UTXO-heavy blocks looked about 2.5 times slower after the fixes in one noisy debug-build
  measurement. That needs a proper measurement before anyone believes it either way.
- The README's status line still quotes the older 20-check demo.

## Up next

Read the fourth pass and fix what it finds. Then CI, the 1M-operation and UI load runs at `HEAD`, and
a README that matches the code.
