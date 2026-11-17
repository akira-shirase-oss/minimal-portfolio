+++
title = "V0–V2: four review rounds, and an honest number for \"done\""
description = "Three more fix rounds after the second review. A hung service is noticed between turns, quitting releases the lock, deleting history really deletes it, and a revocation can't be lost even with the service hung. The \"never say it's done without proof\" guard now has a held-out score: 7% of claims slip through undisclosed, all of them in answers to plain questions. The live microphone drills are still owed."
date = 2026-11-17T00:10:00-05:00

[extra]
kind = "experiment"
milestone = "V0–V2"
step = "fixes"
short_title = "Four review rounds"
# Rust test functions at d6018ad (CI on Linux runs 98; 5 are macOS-only); Swift: 52 tests in 8 suites in CI.
tests = 103

[extra.summary]
goal = "Close what the second, third and fourth reviews found, and give the completion-claim guard an honest score on sentences it was never tuned on."
built = "An idle heartbeat that catches a hung service between turns, a quit that ends the child and a lock that names its holder, deletion that clears the model's recap, revocation that survives a hung service and a full disk, hourly retention, a gate that fails on unexpected skips, and a sentence plus turn-level disclosure for completion claims."
proof = ["held-out claims: 5 of 70 (7%) get no disclosure, all answers to plain questions", "0 of 62 claims that answer a request get through", "52 Swift tests pass in CI, 98 Rust tests on Linux", "CI green at d6018ad", "no review of the last merge yet; live microphone drills not run"]
code = "akira-shirase-oss/personal-voice-agent · main @ d6018ad"
+++

Saying "I've sent it" when you haven't is the one thing a voice assistant must never do. Measuring how
often it happens turned out to need a test set the guard had never seen.

## What I built

Three fix rounds, all merged:

- **A hung service is noticed between turns.** The app now pings the service every 5 seconds while idle
  and on every key press, before the microphone can open. A service that isn't ready 30 seconds after
  launch is replaced, and a relaunch that fails is reported instead of showing "restarting" forever.
- **Quitting lets go.** Quit closes the service's input, sends SIGTERM after a second and SIGKILL half a
  second later. The lock file names its holder's process, so a stale leftover of the same app is
  replaced and anything else is left alone.
- **Delete history deletes it.** The model's short recap of the last two exchanges is now cleared on
  deletion and on revocation, so deleted speech can't be quoted in the next reply. Deletion happens
  first and a failure shows a banner; before, it failed silently and a full disk stopped it.
- **A revocation can't be lost.** If listening was turned off while the service was hung, the
  revocation was lost, and the next key press opened the microphone. Now the app deletes the consent
  token itself first and refuses push-to-talk while listening is off. A revocation also survives a
  failed delete plus a failed log write.
- **Retention runs every hour**, not only at startup, and test runs no longer leave transcript-bearing
  temp folders behind; the gate fails if any are left.
- **The gate doesn't lie about skips.** With a custom build folder set, the old gate skipped 24 tests
  and still exited 0. An unexpected skip now fails it.
- **The completion-claim guard** works per sentence (replace, disclose or leave alone), then adds a
  turn-level "Nothing has been done." when a turn needs it, including turns cut off by an interrupt, a
  model failure or a deadline. Polite requests ("could you…", "please…") now count as requests.

## How it works (the short version)

The guard was tuned on 334 sentences, where it scores well. So it's scored on 92 sentences it was never
tuned on: 70 completion claims and 22 plain replies. The question is simple: how many claims reach you
with no "Nothing has been done" anywhere in the turn?

## Does it actually work?

- **The held-out score.** On its own, the sentence classifier misses 58 of the 70 claims (83%). With the
  turn-level disclosure, **5 of 70 (7%)** get no disclosure, and all 5 are answers to plain questions.
  **0 of the 62** that answer a request get through, and that's the one figure a test pins. The cost is
  real: 12 of the 22 plain replies also get the disclosure, and 6 are replaced. The 7% isn't fully blind
  either, because 9 of the held-out turns were seen before the polite-request fix.
- **On the tuned set**, 1 of 169 claims is missed (0.6%). The original guard spoke 60 of those 169 bare.
- **Tests.** CI is green at `d6018ad`: the Rust job on Linux (98 tests; 5 more are macOS-only) and the
  Swift job on macOS (52 tests in 8 suites, 6 skipped with on-device reasons).
- **The reviews.** The second and third passes said fix first. The fourth, a short final check, closed the
  lost revocation and downgraded the claim guard from High to Medium with three fail-open paths, two of
  which the last merge fixed. Nobody has reviewed that merge yet.

## Where I messed up

Each round's fix opened the next round's finding:

- My idle heartbeat from round 2 made the known lost-revocation gap reachable through a hung service.
- My first revocation fix synced the folder, not the file.
- My hang fix sent no ping before the service was ready.
- My round-3 turn disclosure leaked on polite questions and on cut-off replies.

All four are fixed.

## What it doesn't do yet

- **Claims in answers to plain questions** are the accepted residual: the 7% above. It's documented in
  the project's own decisions, not hidden.
- **None of the 11 live microphone drills has run.** They need a person: push-to-talk, the real stop
  time, barge-in, revocation, a crash, the model unavailable, and the new one, quitting with a hung
  service. Then 100 consented utterances and three one-hour sessions.
- **Latency still misses.** End of turn to first audio is p95 2,036 ms against a 2,000 ms budget, and
  the slow part is the model's first sentence.
- **The ledger smokes failed** on a contended disk (p99 554 ms against 50, and 155 ms against 20), and
  the million-unit runs and a long soak are owed on a quiet machine.
- Echo cancellation still needs one shared audio engine, and V3 and V4 haven't started.

## Up next

A review of the last merge, then the live microphone drills.
