+++
title = "V0–V2: a voice assistant that keeps three notebooks"
description = "Day one of the Personal Voice Agent: push-to-talk on a Mac, Apple's on-device speech and model, and a Rust service that records what it heard, what it guessed and what it did as three separate things. The automated checks pass. An independent review then found five serious ways it breaks at the edges."
date = 2026-11-16T22:49:00Z

[extra]
kind = "experiment"
milestone = "V0–V2"
step = "build"
short_title = "First release, built and reviewed"
# Rust tests at c744552, counted in the independent review's gate run (22+2+21+9+1+2+11).
# The Swift side adds 28 more; see the entry.
tests = 68

[extra.summary]
goal = "A push-to-talk assistant that runs entirely on the Mac, keeps heard, inferred and executed as separate records, and can't act in your name without asking."
built = "A pure Rust session domain, a session service the app launches as a child process with a crash-safe turn ledger, a SwiftUI app with on-device recognition, model and voice, and a player that refuses audio from a turn you interrupted."
proof = ["68 Rust and 28 Swift tests, gate exit 0 three times in a review", "100,000 interrupts: 0 stale audio chunks played", "350 kill -9s in review: every log valid, nothing acknowledged lost", "speaking to first audio p95 2,203 ms, missing the 2,000 ms budget", "review: 5 High findings, fixes on a branch, not merged"]
code = "akira-shirase-oss/personal-voice-agent · main @ c744552"
+++

Telling a friend "remind me to call the dentist" is different from them calling the dentist for you.
A good friend knows which one you asked for. Most voice assistants blur the two.

This one is built so it can't. It keeps three notebooks: what it **heard**, what it **thinks you
meant**, and what it **actually did**. In this first release the third notebook stays empty, because
it can't do anything yet. That's on purpose.

## What I built

The first release, steps V0 to V2, in one day:

- **A Mac app** in Swift and SwiftUI. Hold Space to talk, press Escape to stop. It uses Apple's own
  on-device speech recognition, language model and voice, so nothing leaves the machine: no cloud
  provider, no API keys, no stored audio.
- **A Rust session service** that the app starts as a child process and talks to over plain text
  lines. It owns the conversation: who's speaking, every deadline, cancellation, and the record.
- **A turn ledger**: an append-only file per session where heard, inferred and executed are separate
  record types. Consent to use the microphone is recorded the same way, and can be revoked.

## How it works (the short version)

The heart of it is a **reducer**: a plain function that takes the current state and one event and
returns the next state, with no disk, network or clock inside. Because it's pure, a test can throw
100,000 random steps at it and check the rules after every one, then replay them and get the same
answer.

Anything **consequential** (an amount, a date, a person, anything irreversible) or **ambiguous**
(the recognizer's confidence below 0.80) has to go to a confirmation. Those two words are defined
by rules, not by asking the model what it thinks.

The audio player is **turn-fenced**. Every chunk of sound carries the number of the turn that made
it. When you interrupt, the fence moves up, and any late chunk from the old turn is turned away at
the door. So the assistant can't keep talking over you about something you've already moved past.

The ledger writes each record to disk and waits for the disk to confirm before saying "saved". If the
process dies mid-write, the half-written last line is spotted and cut on the next start.

## Does it actually work?

The machine-checkable parts do. All numbers are from my development Mac (Apple M2 Pro, 32 GB), which
was shared with other builds the whole day.

- **Tests.** An independent review ran the project's full gate three times at `c744552`: exit 0 each
  time, with 68 Rust tests and 28 Swift tests passing. CI on GitHub is green for both at that commit,
  with 6 Swift tests skipped there because the on-device model isn't on CI machines. Two earlier pushes
  failed CI.
- **Interrupt storm.** 100,000 interrupts through the real player: **0 stale chunks accepted**,
  silence afterwards, memory 15.5 MB before and 15.1 MB after. Stopping took 8 µs at the median and
  1.9 ms at p99, with the machine's load average around 60 to 70.
- **Crashes.** The reviewer killed the real service with `kill -9` 350 times: 150 times while driving
  random turns, interrupts and consent changes, and 200 times during startup and recovery. Every log
  file stayed valid, and no record that had been acknowledged was lost.
- **Hearing.** On six committed recordings (48 words of synthetic speech from the Mac's own voice),
  the word error rate was 0.042 in quiet and 0.021 with noise added at 10 dB. Synthetic speech is far
  easier than a person in a room, so this proves the pipeline works, not how well it hears you.
- **Speed.** The time from letting go of Space to the first sound of the answer started at a median
  of 3,873 ms (p95 5,042 ms), and 4 of 18 turns hit the model's 6-second deadline. Two changes, each
  tried in a probe first: keep one warm voice instead of a fresh one per reply, and give each turn a
  fresh, prewarmed model session with a short recap. The second run: **median 1,877 ms, p95 2,203 ms**,
  all 18 turns completed.

That still **misses the 2,000 ms p95 budget**. The slow part is the model's first sentence (p95
2,073 ms). The reviewer re-ran it from a quiet machine and got p95 2,223 ms, so it's the model, not
the busy laptop.

The service's own load runs were small smokes: 50,000 ledger appends (p99 27.0 ms, gate 50 ms),
2,000 appends with a disk sync each (p99 13.4 ms, gate 20 ms) and 100,000 turn events (reply-turn
p99 4.4 ms, gate 10 ms). The first turn-event run failed and is kept: on the overloaded machine a 5 ms
test deadline also caught ordinary turns, and the test client waited forever for speech that was
never coming.

## Where I messed up

The review's verdict: the Rust core is careful, but the promises break where the app, the process
boundary and the disk meet. Five High findings, all reproduced:

- **After a crash, the assistant went quiet.** The new session numbered its turns from 1, but the
  player's fence still sat at the old number, so every reply up to that number was refused. My test
  called "restart on service crash" stopped as soon as the service said ready. It never ran a turn
  after the restart, which is exactly how it hid this.
- **The app could kill itself.** Writing to a service that had just died raised SIGPIPE (the signal
  for "the other end of this pipe is gone"), and the whole app exited: 9 of 50 runs in the reviewer's
  reproduction.
- **The microphone outlived push-to-talk.** Let go of Space before the service confirmed capture, and
  the mic kept recording for up to 60 seconds while the screen said "Hold Space to talk". A hung
  service kept it open indefinitely.
- **A revocation could be lost.** On a full disk, "stop using my microphone" failed to save, and on
  the next start consent came back as granted. Two copies of the app on the same data folder could
  also "recover" each other's live session.
- **"Never say it's done without proof" was a word list.** The rule was enforced by 43 banned
  phrases. 11 of 12 ordinary ways of saying it got through: "Payment sent." "Sent!"

Two of my tests were weaker than their names. I loosened the on-device end-to-end test to stop
load-related flakes, and overshot: it then passed with the model path broken. The 8-thread player
stress test never actually produced the race it claimed to rule out. The code was right by
inspection, but the test didn't prove it.

## What it doesn't do yet

- **The fixes aren't on `main`.** A fix round for these findings is being written on a branch right
  now. Until it's merged and checked again, the bugs above are in the published code.
- **The live drills need a person with a microphone:** push-to-talk, the real stop time on the
  speakers, barge-in, revocation, a crash, the model being unavailable. Then 100 consented
  utterances, quiet and noisy, and three one-hour sessions.
- **Echo cancellation is limited.** Capture and playback use separate audio engines, so the echo
  canceller can't hear what the assistant is saying. One shared engine is owed in code.
- **Heard transcripts are kept forever**, with no way to delete them, in this build.
- **The million-unit load runs haven't run.** The rule is a load average below about 6; today it sat
  between 25 and 160.
- No memory, no personal voice and no tools. Those are V3 and V4, with their own contracts.

## Up next

Merge the fix round once the full gate passes and a second reviewer has re-checked it. Then the live
microphone drills, then the model's first-sentence latency.
