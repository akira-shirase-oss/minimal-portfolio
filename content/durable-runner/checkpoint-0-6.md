+++
title = "Checkpoint 0.6: three review rounds, and a compaction that could forget"
description = "A gap review named per-record fsync as the load gate's root cause, so the journal got group commit. Three fix rounds followed, each checked by a second reviewer. The first review blocked the set: one of my fixes could delete the live journal. Compaction at 100,000 runs went from about 2.5 s to under 0.2 s, restart memory at 800,000 runs fell from 4,334 MiB to 1,200 MiB, and the third review found an older truncation bug. Its fix merged late with a dozen others, not yet reviewed."
date = 2026-11-16T20:00:00-05:00

[extra]
kind = "failure"
milestone = "D4"
step = "0.6"
short_title = "Review rounds: no job lost"
# Executed tests at main ed29802, passed twice in the third review pass (99 test attributes, 3 of them ignored probes).
tests = 96

[extra.summary]
goal = "Close the gap review's Highs, chiefly the journal's per-record fsync, without ever losing an acknowledged job, and make the runner fit a 2 GB server."
built = "Group commit on a journal writer thread, a writer that poisons itself on a failed write or fsync, crash-safe compaction with a binary checksummed snapshot, streamed restart, an API key on every mutating route, confined backups, full disk as a clean 503, and bounds on every queue, page and index."
proof = ["kill -9 drills across three passes: 142 rounds, 0 acknowledged jobs lost", "compaction at 100k runs: 2.4–2.5 s → 0.10–0.17 s", "restart memory at 800k runs: 4,334 → 1,200 MiB", "an older truncation bug found in the third pass; its fix merged late, unreviewed", "the sustained 1M battery has not been re-run"]
code = "akira-shirase-oss/durable-runner · main @ e4f08fe (last reviewed at ed29802)"
+++

A diary is only as good as the habit of closing it. If you write a page, then forget whether you
turned it, the next entry can land on top of the last.

The runner's journal is that diary. Today's gap review found 25 gaps, 12 of them High, and named the
reason the load gate was red: every single record waited for its own `fsync`, the call that makes the
disk promise the data is really there.

## What I built

Three fix rounds, merged to `main` one at a time, with a review after each:

- **Group commit.** Submits now go to a writer thread that collects up to 1,024 records or 4 MiB and
  makes them durable with one `fsync`, then answers every waiter in the batch. A live `kill -9` drill
  with 32 submitters lost 0 of 1,115 acknowledged runs.
- **A writer that knows when it's broken.** A failed write rolls back. A failed `fsync` poisons the
  writer: it refuses everything from then on, and the process exits so a supervisor restarts it.
- **Compaction that can't eat the journal.** More on this below. It's also off by default now, and its
  snapshot is a compact binary file with a checksum.
- **Restart that fits a small server.** The snapshot is read as a stream, a missing snapshot stops
  startup instead of starting empty, and a finished run keeps only the small record needed to spot a
  duplicate (about 230 bytes).
- **Locked doors.** An API key of at least 32 characters is required to start, every mutating and
  admin route checks it, and backups can only be written inside a declared folder.
- **Everything bounded.** A full disk answers 503 and readiness goes false. Lists are paged. There are
  caps on live runs (100,000), the outbox (64 MiB) and the index (512 MiB by default).

These change how the runner is started and called, and the operating guide lists every change. The
journal's on-disk frame format didn't change.

## How it works (the short version)

Compaction squeezes a long journal into a snapshot plus a short new log, called the next
*generation*. A small file, the manifest, says which generation is current. Switching generations
means renaming the manifest, and that rename is the moment of truth.

The rule now is: **from the rename onward, any error is fatal.** The new log is opened *before* the
switch. If anything fails after it, the journal is poisoned, every waiter gets a 503, the process
exits, and restart opens whatever the manifest on disk says. And clean-up of old generations reads
that manifest from disk, never from memory.

## Does it actually work?

- **No acknowledged job lost, across every pass.** The reviewers ran `kill -9` drills against the
  real binary: 52 rounds with 33,979 acknowledged jobs, then 42 rounds with 35,362, then 48 rounds
  with 15,114 acknowledged submits and 4,440 cancels. Not one acknowledged job was lost.
- **Tests.** The third pass ran the suite twice: 96 tests pass, and ten repeats at a load average of
  11 to 19 had no failures. That's quieter than the rest of the day, though not quiet by this site's
  rule of below about 6. The pilot drill (submit, kill, restart, compact, back up, restore into a separate
  directory, serve again) passed in all three passes.
- **Compaction, measured before and after** at 100,000 runs of 1 KiB each:

| | before | after |
|---|---:|---:|
| snapshot size | 1,104 MiB | 103 MiB |
| compaction time | 2.41–2.51 s | 0.10–0.17 s |
| a submit during it | 1,955–2,058 ms | 82–159 ms |
| reopen | 4.01–4.14 s | 0.06–0.08 s |
| peak memory | 1,770–1,870 MiB | 458–459 MiB |

- **Restart memory**, before and after the streaming fixes:

| 1 KiB runs | from the snapshot | from the journal |
|---|---:|---:|
| 100,000 | 342 → 135 MiB | 547 → 153 MiB |
| 800,000 | 2,716 → 1,057 MiB | 4,334 → 1,200 MiB |

Both tables were measured on my development Mac (Apple M2 Pro, 32 GB) while it was busy, with load
averages of 25 to 79 and 8.6 to 28.3. They're development observations, and memory on macOS isn't
counted the way Linux counts it.

## Where I messed up

The first review **blocked** the fix set, and two of its three Highs were bugs I'd just written.

Here's the data-loss path, plainly. Compaction renamed the manifest to point at the new generation.
If the next step failed (syncing the folder, or reopening the log when the process ran out of file
handles), compaction returned an ordinary error. But the writer still pointed at the *old*
generation's log. New jobs went into the old log, got synced and acknowledged, and readiness stayed
green. On restart, the runner opened what the manifest named, the *new* generation, and every job
acknowledged since the failure was gone. The reviewer reproduced it: 30 of 30 acknowledged jobs lost.

Worse, my clean-up fix from the same round trusted memory about which generation was current, so the
next compaction could delete the live one. A fault probe lost 10 of 10.

The third High was a default: I'd turned on hourly compaction. At 100,000 runs that wrote a 1,245 MiB
snapshot and stalled submits for over 6 seconds every hour.

The second pass found the runner wouldn't fit its 2 GB server: restart took 2,704 MiB at 800,000
runs, and finished runs never freed their capacity, so it would eventually refuse everything with
`at_capacity`.

The third pass found an older bug, there since the journal's first milestone: **a corrupted length
field in any committed frame is read as a torn last write.** Startup then cuts the log at that point
and throws away every acknowledged record after it. In the repro, 25 of 50 runs were served, and the
log was cut from 10,181 to 5,081 bytes.

And one from the start of the month: I committed build output to the repository on 2026-11-08. It's
about 480 MB of history that only a rewrite can remove, and I haven't rewritten it.

## What it doesn't do yet

- **The truncation fix hasn't been reviewed.** Journal frames now carry a checksum over their header
  and the size of their batch (frame version 2, with version 1 still readable), so a damaged length
  stops startup instead of being trusted. It merged at the end of the day with about a dozen more
  fixes: restore under the journal lock, deadlines on engine replies, a SIGTERM drain, reads behind a
  key unless opened on loopback, with a read-only key, owner-only journal files, handler calls with no redirects or proxies, a
  strict CSP for the inspector, and hosted CI. Its own `kill -9` drill harness ran 36 kills with
  25,201 acknowledged submits and lost none. No reviewer has attacked any of it yet.
- **The sustained load gate is still red.** Group commit was the named root cause, and it's in. In
  the first review, on a machine with a load average of 360 to 500, accepted submits at 32 clients
  went from about 200 a second to about 2,000 to 3,000. That's a rough look, not committed evidence.
  The 1,000,000-submit battery has to re-run on a quiet machine before I claim anything.
- **A 2 GB server is tight.** With a seven-day duplicate window and scheduled compaction, the sizing
  works out to about 3.9 one-step 1 KiB jobs a second.
- **Not done:** step outputs and a retry/dead-letter policy, a second developer restoring a real
  journal unaided, a Linux memory measurement, rate limits on reads, and the SaaS layer.

## Up next

An independent review of the late round, including the frame-header fix. Then the 1M sustained
battery on a quiet machine, then the restore by a second developer.
