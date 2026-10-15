+++
title = "Checkpoint 2.1: giving my monitor a memory"
description = "My monitor now has a database: one keeper, a lock on the door, rules the database enforces itself, and every setting double-checked. Plus the time I almost changed someone else's file before refusing to touch it."
date = 2026-10-15T20:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M2"
step = "2.1"
short_title = "Giving the monitor a memory"

[extra.summary]
goal = "Give the monitor somewhere safe to remember things, before it remembers anything."
built = "A data folder with a SQLite database, one owner that writes to it, a lock so two monitors can't share it, and an init command."
proof = ["a stored check costs 0.73 ms on a real SSD; 102 bytes on disk", "225 tests, 10/10 clean runs", "68 planted bugs: 59 caught, 2 harmless, 7 didn't compile"]
code = "de80542"
+++

Right now, if my monitor restarts, it forgets everything. Every check, every outage, gone. It's a night guard with amnesia who starts each shift with "all quiet, I assume?"

Milestone 2 fixes that. This first step doesn't remember anything yet. It builds the place where memories will live, and makes sure that place is hard to break.

## What I built

**A data folder.** One command sets it up:

```
$ service-monitor init --data-dir monitor-data
monitor-data: initialized (schema 1)
  SQLite 3.53.2, write-ahead log, full sync on every commit
```

Run it again and it says "already up to date", and doesn't change a single byte. The folder is private to your user account, because later it will hold things like alert settings.

**One keeper of the notebook.** Only one part of the program ever writes to the database. Everything else hands it a note through a slot in the door (at most 512 waiting) and gets a reply back. One writer means no two parts of the program can ever trip over each other mid-write.

**A lock on the door.** Two copies of the monitor pointed at the same folder would scribble over each other's notes. So the second one is turned away:

```
service-monitor: another service-monitor is already using monitor-data
```

**Rules the database enforces by itself.** Even if my code has a bug, the database refuses to store the same scheduled check twice, or to open a second incident while one is already open for the same website. A rule written in two places is a rule that has to be broken twice.

**Upgrades that happen completely or not at all.** When a future version changes how things are stored, the upgrade runs as one unit. I tested it with an upgrade that fails halfway on purpose: afterwards, the database is exactly as it was before.

## How it works (the short version)

**Written down before it counts.** Every result will be safely on disk before the monitor acts on it ("full sync" above). If the power cuts out mid-write, the database comes back with that result or without it, never with half of it.

**Every setting double-checked.** SQLite, the database I use, has a quirk: if you give it a setting it doesn't recognize, say because of a typo, it quietly ignores it. No error, nothing. So after setting each option, the monitor reads it back, and refuses to start if anything didn't stick.

**It only touches its own files.** Each database the monitor creates carries a small tag that says "this is mine". Point it at some other program's database and it refuses, politely, and leaves the file alone.

## Does it actually work?

**Speed, measured on a real disk.** Storing one check the way the next steps will (a "started" note, then the result), with a full sync to the SSD every time:

- **0.73 ms** for a typical check, 1.39 ms for the slowest 1 in 100;
- **102 bytes** on disk per stored check (the plan had *guessed* 300);
- **0.18 ms** to open the data folder.

For a sense of scale: 100 websites checked every minute keeps the database busy for about a thousandth of the time. Plenty of room.

**Behind it:** 225 tests, and 10 clean runs of the whole suite in a row. A tool then planted 68 small bugs in the new code: 59 were caught, 7 didn't even compile, and 2 changed nothing anyone could ever observe (like swapping two ways of combining settings that never overlap).

On the first run, 2 more slipped through, and they were the words `init` prints. You could swap "initialized" and "already up to date", and no test noticed. Those words are what a person actually reads, so a test now runs the real program and checks every word.

## Where I messed up

**I almost changed someone else's file before refusing to touch it.** When opening a database, the monitor set its options first and checked the "this is mine" tag second. One of those options gets written into the file itself. So pointed at another program's database, it would have modified it, and *then* said "not mine". I spotted it while writing the test for exactly that case. Now the tag is checked first, without writing anything, and the test compares the other file byte for byte, before and after.

**A lock that was unlocked, but still locked.** Some tests close a data folder and open it again straight away. About 1 run in 3, the reopen failed with "already in use". The culprit was another test running at the same time, starting a copy of the real program. Starting a program briefly hands it copies of every file the parent has open, lock files included, like a spare key copied during a handover. For that instant, the new program "held" a lock the other test had just released. That test now runs in its own separate process: 0 failures in 30 runs.

**My first speed test ran on a RAM disk.** My scratch folder lives in memory, where "write it safely to disk" costs nothing. The same test ran 35 times faster there. Publishing that number would have been a lie by a factor of 35. The numbers above come from the real SSD, and I kept the RAM-disk run as a reminder.

## What it doesn't do yet

- **The monitor doesn't save anything yet.** This step built the notebook; the next ones start writing in it.
- **It doesn't check whether the folder is on a network drive,** where this kind of database isn't safe. That comes with the disk checks later in this milestone.
- **No backups yet.** Also later in M2.

## Up next

**Checkpoint 2.2: a guide in the dashboard, and a proper README.** A Guide page that explains every colour and every word on the dashboard, for someone who has never seen a monitor before, and a README that gets a new person from nothing to their first alert.
