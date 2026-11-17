+++
title = "Checkpoint 0.7: a million submits, all accepted, and the restart bug my last fix made"
description = "The sustained-load gate is green: 1,000,000 submits at 100 a second, every one accepted and done, p99 41.3 ms. Getting there took a security round that found my previous round's frame rule could make a restart refuse the journal, a backup that restored empty with exit 0, and connections that never let go. All fixed; the final review says ship."
date = 2026-11-17T03:45:00-05:00

[extra]
kind = "release"
milestone = "D4"
step = "load"
short_title = "The sustained gate, green"
# Test functions at head (cdbdfb8's code); the review's last gate run counted 141 passed + 3 ignored at 1bcaea7.
tests = 146

[extra.summary]
goal = "Close the security review's findings, then pass the sustained-load gate that had been red since 2026-11-10."
built = "Torn batches cut at their first frame, backups that carry a checksummed manifest, connection caps and header, body and write-stall deadlines, keyless reads only for a loopback Host, golden files pinning the on-disk formats, and a SIGTERM that reports cut requests."
proof = ["sustained: 1,000,000 of 1,000,000 accepted and done, p50 12.5387 ms, p99 41.2505 ms", "the 2026-11-10 run: 481,914 accepted, p99 29,934 ms, FAIL", "kill -9 drill: 36 kills, 20,801 acknowledged submits and 7,261 cancels, 0 lost", "final review: ship", "a reverse proxy is still required for any public exposure"]
code = "akira-shirase-oss/durable-runner · main @ e69f12f (server built at cdbdfb8)"
+++

A week ago the sustained-load gate was red twice over, and I wrote that per-record `fsync` was the
ceiling. Today it's green. In between, a review found that the fix I'd made to the journal format had
its own way of losing history.

## What I built

A security round, then a follow-up round, both merged:

- **A torn batch can't poison the next restart.** If the process crashed partway through writing a
  group commit, the complete frames of that batch were kept. The next append then started *inside* the
  old batch, so the restart after that refused the whole journal, and backups taken in between wouldn't
  open. The documented repair would have deleted runs acknowledged after the first restart. Now a batch
  is replayed only if its whole extent is on disk; otherwise it's cut at its first frame. Its `fsync`
  never returned, so nothing in it had been acknowledged.
- **A backup can't restore empty.** A backup missing its generation restored with exit code 0 and
  served an empty journal. Backups now carry a manifest with the generation and each file's size and
  CRC-32, and restore refuses missing, unlisted, altered or non-replaying files before publishing
  anything. Restore also re-checks each file after opening it, and syncs the target directory before
  the manifest rename.
- **Connections let go.** With no timer armed, 300 half-sent requests stalled the health check. Now
  there's a 512-connection cap, a 10-second header timeout that also covers idle keep-alive, a
  30-second body deadline (answered 408), and backoff on accept errors. The follow-up round added the
  other half: clients that never read their answers lose their slot after a 10-second write stall, with
  at most 100 requests and 600 seconds per connection.
- **Keyless reads only on loopback.** In the mode that allows reads without a key, they're now answered
  only for a `localhost` or loopback `Host` header, which closes off DNS rebinding.
- **The formats are pinned.** Golden files, written by an independent script, pin the version 1 and 2
  logs, the snapshot and the index.
- Small ones: SIGTERM exits non-zero when it had to cut requests at the drain timeout, input has to be
  canonical base64, and the load harness moved off a port another project uses.

## How it works (the short version)

The sustained gate passes because of **group commit**, which landed the day before. On 2026-11-10 every
record was written and `fsync`ed alone, on the engine's own thread. Now a writer thread commits up to
1,024 records or 4 MiB with one `fsync`, and every acknowledgement still waits for the `fsync` that
covers it. The declared rate didn't change: 100 submits a second, both times.

## Does it actually work?

- **The sustained run**, with the server built at `cdbdfb8` on my development Mac (Apple M2 Pro, 12
  cores, 32 GB): 1,000,000 submits at 100 a second over 10,176 seconds. **All 1,000,000 sent, accepted,
  answered 200 and done after the drain.** p50 12.5387 ms, p99 41.2505 ms, max 3,167.16 ms. The
  1-minute load average had a median of 3.52 and peaked at 24.96, when other projects' builds
  overlapped. Its gate checks that everything sent was accepted and done; it has no latency threshold.
- **For comparison, 2026-11-10:** same rate, same target, 481,914 accepted and 518,086 refused with 503,
  p99 29,934 ms. FAIL.
- **A new `kill -9` drill harness**, on a busy machine: 36 kills, 20 at random and 16 targeted, with
  20,801 acknowledged submits and 7,261 acknowledged cancels. None lost, none duplicated. 28 of 28
  checked backups restored complete.
- **The connection drills.** With 300 idle connections held, the first health check answered in 3.08
  s, and all 300 were closed by 15.1 s. Against 512 clients that never read, the health check answered
  throughout, and all 512 were closed by 21.1 s.
- **The reviews.** The verification pass closed the restart bug and the backup item and found one more
  High, the write stall, now fixed. The final check says **ship**.

## Where I messed up

**My frame rule from the last round caused the restart bug.** The rule that records each batch's extent
was meant to make torn writes safe, and it made a torn batch poison the next append instead.

Two smaller ones: my new backup manifest at first allowed duplicate entries and missing checksums,
both now named refusals. And a test assumed inode numbers are unique, which failed on hosted Linux CI.

## What it doesn't do yet

- **It isn't ready to face the internet on its own.** Any non-local exposure needs a reverse proxy in
  front that terminates TLS, rate-limits and caps connections per client, and buffers slow responses.
  The operating guide says so.
- **The rest of the load battery** is still owed: replay at 100,000 is pending and three runs are
  deferred. Some docs still describe the sustained gate as red.
- **The ship gate** still needs a second developer to run, inspect, back up and restore it unaided.
- No independent review has looked at the sustained run itself.

## Up next

The rest of the load battery, then the restore by a second developer.
