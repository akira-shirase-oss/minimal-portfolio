+++
title = "Checkpoint 2.7: disk limits and backups"
description = "What should a monitor do when its disk fills up? Not keep showing green. Mine now watches its own disk, steps down calmly before it runs out, and makes backups you can actually restore, even while it's running."
date = 2026-10-16T18:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M2"
step = "2.7"
short_title = "Disk limits and backups"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 427

[extra.summary]
goal = "A full disk is never a silent failure, and a backup is something you can restore, not just a file."
built = "A disk budget with calm steps (warn, refuse new monitors, stop checking) that undo themselves, network drives refused, the write-ahead log kept small, and backup and restore commands."
proof = ["a disk that fills up while the monitor runs: checks stop within 10 s, every monitor UNKNOWN, then they resume on their own with one gap", "6 backups taken while 8 monitors saved results nonstop: each one a single consistent moment", "a week of history for 100 monitors backed up in 1.3 s, with saves going on meanwhile"]
code = "ce9505b"
+++

Every monitoring tool has the same quiet nightmare: the disk fills up.

Not the disk of the website it watches. Its own. Logs grow, a backup lands in the wrong folder, and one day there's no room left to write anything down.

What does a monitor do then? Most keep showing the last thing they knew. Usually that's green. So the one moment you most need the truth is the moment it stops telling it.

This step makes sure mine never does that.

## What I built

**A budget for its own disk.** The data folder gets 2 GiB unless you choose otherwise (`--disk-budget-mib`). Close to the limit, the monitor steps down calmly, one stage at a time:

- at 70%, or with 1 GiB free on the disk or less, it says so;
- at 85%, it refuses new monitors, and changes nothing else;
- at 90%, or with less than 512 MiB free, it **stops checking**.

**It never shows green while it's stopped.** Every monitor turns UNKNOWN, a red banner says why and what will end it, and the health address that watchdogs read answers "not ready: checks are stopped, the disk is too full". Results that were already on their way still get saved, and the tidying from the last step keeps running, because tidying is what makes room.

**It undoes itself.** Once there's room again, checks resume on their own, and the whole stop is written down as one gap per monitor: "skipped 14 checks while the disk was too full". Nothing pretends it was up, nothing pretends it was down.

Leaving a stage takes more room than entering it did (under 80% to resume, against 90% to stop). It's how a thermostat works: if the heating switched off the moment it reached 21° and back on at 20.9°, it would click all day. A disk hovering around 90% would do the same to checks without that gap.

**A new monitor on a full disk is refused politely.** `watch` stops before changing anything, names the address it won't add, and says "Nothing was changed."

**Network drives are refused.** The database's write-ahead log (a scratch file where every save lands first) doesn't work over a network, so a data folder on NFS, SMB and their cousins is refused at the start, with the reason. A folder in memory works, with a note that it's gone after a restart.

**The write-ahead log stays small.** After every round of housekeeping, the monitor empties it. If another program is reading the database (someone left a `sqlite3` shell open, say), it doesn't wait for it: it tries again next round, and if that goes on for 5 minutes, it tells you another program is keeping the database open.

**Backups you can restore.** Two new commands:

```
service-monitor backup --data-dir monitor-data --to monday.backup
service-monitor restore --from monday.backup --data-dir restored
```

The backup works while the monitor is running, and the monitor keeps checking meanwhile. The copy is checked before it gets its name (it's ours, nothing in it is broken, nothing points at nothing), it's only readable by you, and it never replaces an existing file. A restore only goes into a new or empty folder, checks the backup *before* writing anything, and checks the result again.

## How it works (the short version)

**It measures what really counts.** Deleting old checks doesn't shrink the database file: SQLite keeps the space and reuses it before the file grows. So the budget counts the pages in use, plus the write-ahead log, not the file's size. Otherwise a monitor that had just tidied up a week of history would still think it was full.

**It measures before writing.** Before a write, it takes a fresh reading if its last one is more than a second old (6 microseconds each), and it also measures every 10 seconds, so checks resume even while nothing is being written.

**A backup is one snapshot.** SQLite can copy a live database page by page, but if anything writes in between, the copy starts over, and with a monitor saving results every few seconds it might never finish. So the backup copies everything in one pass, from its own read-only connection, while the monitor keeps writing. With a week of history for 100 monitors (120 MiB, about a million rows), a backup takes 1.3 seconds. Only 0.15 seconds of that is spent reading the live database; the rest is checking the copy. During those 0.15 seconds the monitor's saves take 0.67 to 0.69 ms instead of 0.60 to 0.66 ms. Restoring the same backup takes 2.3 seconds, with both checks.

## Does it actually work?

**Real limits, real folder.** A test gives a real data folder a budget of 1 MiB with 2 MB already in it. The real program starts, says monitoring is unavailable, and then nothing: the test server sees zero requests past the first slot, the dashboard shows UNKNOWN with the red banner, and readiness says why. Another test adds a new address on that full disk: refused, exit code 2, and the database is untouched.

**Every limit, crossed and back.** A run of made-up readings climbs past each stage and down again, and a random tester checks the rules from the other side: the same reading twice never flips anything, and using more disk never makes the level calmer.

**Backups under pressure.** 8 monitors save results as fast as they can while 6 backups are taken. Each backup must be one consistent moment: every monitor's saved state matches its newest check, and every incident opened and closed exactly as its checks say. Then a backup is restored and compared with the original, row by row.

**What it costs.** Nothing you'd notice. Old build and new build, taking turns on the same day: a save takes 0.667 ms now against 0.673 ms before, which is the same within noise. Measuring the disk takes 6 microseconds. Under full load the write-ahead log never grew past 4 MiB, and emptying it took 7 ms. The worst case I could build was a `sqlite3` shell left open on the database. Then the log keeps growing (287 MiB over 10,000 results) and saves slow to 1.5 ms. But the monitor never waits for that shell, and once it closes, the log is emptied in 38 ms.

**Behind it:** 427 tests. The whole suite ran clean 9 times out of 10, and 20 more runs of the slow end-to-end tests were clean too. The one failure was an older test that waited 40 seconds for a result and didn't see it. I couldn't make it happen again, so that test now writes down everything it saw instead, for next time. A tool planted 312 small bugs in the new code: 39 didn't compile, the tests caught 237, and 36 slipped through. 26 of those were real holes (the mid-run ones above among them), and new tests close every one. 4 showed me code that could be simpler, so I simplified it. The last 6 can't change what the program does (like flipping a bit that's never set), so no test could ever catch them. A second round over everything I touched planted 96 more, and the tests caught all of them except those same 6.

## Where I messed up

**My safety check slowed every save by 13%.** Measuring the disk is cheap: 6 microseconds, timed in a tight loop. So I measured before every single write. Then I ran the same benchmark I've run since checkpoint 2.4, old build and new build taking turns, and every save had become 0.09 ms slower: 0.73 ms instead of 0.63 ms. In a loop the measurement was fast; squeezed between real writes to a real disk, it wasn't. Now the monitor measures before a write only if its last reading is more than a second old, and the new build saves exactly as fast as the old one. That's why every step publishes numbers: this one would never have shown up in a test.

(While chasing it, I found my laptop's disk syncing 2.2 times slower than the day before, same code, same disk. So numbers only get compared side by side, on the same day.)

**My disk tests all cheated a little.** Every one of them filled the folder *before* the monitor started, so they all tested the same moment: the check it does at startup. To find out whether my tests can actually fail, I use mutation testing: a tool breaks the code in hundreds of small ways, one at a time, and checks that some test notices. Here, 11 of those breakages in the *running* monitor went unnoticed, including "never measure the disk again after starting".

But a disk doesn't fill up at startup. It fills up on a Tuesday afternoon while the monitor is running. So now a test does exactly that. The real program runs, and another program fills its folder. Checks stop within 10 seconds, the dashboard turns UNKNOWN, and a whole check slot goes by with no request. Then the other program makes room, and checks resume on their own, with the stop saved as one gap.

**A check could run late and call itself on time.** The real-backend tests I'm building next found it on their first run. While another program held the database locked for 75 seconds, a check got the go-ahead, waited for the lock to write "started", and sent its request 6.5 seconds after its slot. The rule is 5 seconds. Worse, it was saved as an on-time pass. Now the monitor checks the clock again right after writing "started": a check that would go out late doesn't, and its row says why. A test with a database that takes 7 seconds proves it, and its twin proves 4.9 seconds still runs.

**A script ate my line endings.** I edit code with small scripts, and one of them silently turned a warning message into a sentence with big holes of spaces in it. Python treats a backslash at the end of a line as "join these lines", and the Rust code needed that backslash. Only a test that spelled out the exact message caught it.

**I expected a change that wasn't one.** A test helper of mine said "the level changed" when a monitor with no disk readings got its first calm one. Both count as calm, so the code was right to say nothing changed. The test was wrong.

## What it doesn't do yet

- **No scheduled backups.** You run `backup` yourself (or from cron). Daily, off-machine, encrypted backups come with milestone 5.
- **The budget doesn't count logs yet**, because the monitor doesn't write log files yet.
- **Restoring doesn't turn alerts off**, because there are no alerts yet. When they arrive, a restored folder will start with them paused.

## Up next

**Checkpoint 2.8: telling certificate problems apart.** An expired certificate, a self-signed one, one for the wrong name: each gets its own plain reason instead of "couldn't connect".
