+++
title = "Checkpoint 2.4: nothing counts until it's saved"
description = "My monitor now writes every result to disk before it believes it. If the disk says no, it doesn't pretend: everything turns grey, a red banner says why, and nothing is lost. Plus: an incident's four times, kept apart."
date = 2026-10-16T03:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M2"
step = "2.4"
short_title = "Nothing counts until it's saved"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 297

[extra.summary]
goal = "A result only counts once it's safely on disk, and a failed save is never hidden."
built = "A 'started' note before every check, one all-or-nothing save per result, incidents with their four times, and an honest 'can't save' mode."
proof = ["a real demo: another program locked the database for 75 s", "160,000 results saved: memory flat at 10.5 MB", "every planted bug that compiled was caught, after 3 fixes"]
code = "b877487"
+++

You know the waiter who says "your order's in!" and then forgets to write it down? Everyone's happy for ten minutes. Then nobody's happy.

Until now my monitor was that waiter. It decided "this website is down" in memory, showed it on the dashboard, and that was that. Nothing was written down. A crash, and the decision was gone, as if it had never happened.

This step fixes it. **A result only counts once it's saved.**

## What I built

**A note before every check.** Before the monitor sends a request, it writes down "check #42 started". It's like signing in at a front desk before walking into a building: if something goes wrong inside, there's a record that you went in. (The next step uses that record to tell "the monitor crashed mid-check" apart from "the website failed".)

**One save per result, all or nothing.** When the answer comes back, everything it leads to is saved in one go: the result, the website's new state, and, if it's the third failure in a row, the incident it opens. Either all of it lands on disk, or none of it does. Only *then* does the dashboard change.

**An incident keeps its four times apart.** When did it first fail? When was it confirmed (that's when it opens)? When did the first good check come back? When was the recovery confirmed? These are four different moments, and mixing them up is how monitors end up claiming exact downtimes they never saw. In the demo below, `/ready` first failed at 18:57:21, was confirmed at 18:57:51, passed again at 18:58:21, and was declared fine at 18:58:51. All four are saved, plus the last time it was seen fine before the trouble (18:56:51).

**An honest "I can't save" mode.** This is the part I'm proudest of. If the disk fills up, or another program grabs the database, the monitor doesn't carry on as if nothing happened. It:

- stops counting anything new (a result it can't save could vanish, so it doesn't trust it);
- shows every website as UNKNOWN, grey, instead of a green it can't back up;
- puts a red banner on every page saying exactly what's wrong;
- answers "not ready" to anything that asks if it's healthy;
- keeps checking, and retries saving with every result.

When saving works again, the checks it couldn't save are written down as gaps, so the history shows a hole instead of quietly skipping it.

<figure class="shot">
  <picture>
    <source srcset="saving-phone-dark.webp" width="780" height="2212" media="(max-width: 600px) and (prefers-color-scheme: dark)">
    <source srcset="saving-phone-light.webp" width="780" height="2212" media="(max-width: 600px)">
    <source srcset="saving-desktop-dark.webp" width="1600" height="1125" media="(prefers-color-scheme: dark)">
    <img src="saving-desktop-light.webp" loading="lazy" decoding="async" width="1600" height="1125" alt="The dashboard while another program holds the database. A red banner at the top reads: 'Monitoring is unavailable: results can't be saved. Since 18:59:26 UTC, nothing new counts, so every monitor shows UNKNOWN. Checks go on, and saving is retried with each one. The error: database error while starting to save a result: database is locked.' Below it, both monitors, /health and /ready, carry a grey UNKNOWN badge and say 'The last result couldn't be saved, so it doesn't count.' Their rows of bars end in green and red, then one grey bar.">
  </picture>
  <figcaption>The real dashboard, 40 seconds into the demo's lock.</figcaption>
</figure>

## How it works (the short version)

**The database checks the monitor's homework.** Every save says "I'm changing the state *from* this, *to* that". If the database has something different from "this", it refuses the save. So the monitor's memory and the database can't drift apart without someone noticing. It's like a bank transfer that only goes through if your balance is what you think it is.

**Saving twice can't count twice.** Each scheduled check has one slot in the database. If the same result somehow arrived twice, the second one is recognised and ignored. It can't make a second failure "in a row", and it can't reopen an incident that's already closed. I tested exactly that: replaying a whole outage, result by result, changed nothing.

**A lost result still breaks the run.** Say a website passes, then one result can't be saved, then it passes again. Those two passes are *not* "two in a row": something happened in between that the monitor didn't see. So a lost result counts as a gap, which resets the count. A test proves it: with the lost result, an incident that would have closed stays open.

## Does it actually work?

**I locked the database on purpose.** The demo runs the real monitor against my little Node.js app. First the app goes into a slow mode for a minute: an incident opens on `/ready`, then closes. Then a second program grabs the database's write lock and holds it for 75 seconds. Here's what the terminal said:

```
service-monitor: results can't be saved: database error while starting to save a result: database is locked
  Nothing new counts until saving works again: every monitor shows UNKNOWN. Saving is retried with each result.
18:59:21 #2 GAP  couldn't be saved, so it doesn't count            UNKNOWN
18:59:34 #1 GAP  couldn't be saved, so it doesn't count            UNKNOWN
service-monitor: saving works again; the results that couldn't be saved are recorded as gaps
19:00:21 #2 PASS 200 OK (0.4 ms)                                   UP
```

(Spacing trimmed to fit.)

The health check answered "ready" before, "not ready: results can't be saved" during, and "ready" after. And the database ended up with exactly one row per check slot: no holes, no doubles, the locked minute written down as a gap.

**A random tester, against a real database.** One test throws 256 random sequences at the monitor (passes, failures, gaps, a clock going backwards) and breaks the database at random moments. After *every single step* it checks that the monitor's memory and the database agree exactly. At the end, every slot must have exactly one row.

**Real failures, not pretend ones.** The tests make SQLite fail for real: a disk that's "full", a database that's locked, one that refuses writes. Each time, the failed save left nothing behind, and the next save worked.

**How fast, and how big.** I pushed 160,000 results through (100 websites, about 27 hours' worth) on my laptop's SSD:

- writing the "started" note: **0.28 ms**; saving a result: **0.30 ms** (typical; 0.75 ms for the slowest 1 in 100);
- each saved check takes **110 bytes** on disk (the plan guessed 300);
- memory: it climbs to **10.5 MB** while each website's recent history fills up, then stays flat. 10.46 MB at 20,000 results, 10.50 MB at 160,000.

One honest catch: SQLite writes in 4 KB pages, so each check actually writes about **35 KB** to the disk, two saves of a few pages each. For 100 websites checked every minute, that's about 5 GB a day. An SSD shrugs that off; an SD card in a Raspberry Pi might not. That's on the list for the disk checkpoint.

**Behind it:** 297 tests, 10 clean runs in a row. A tool planted 133 small bugs in the new code: 31 didn't compile, 99 were caught, and 3 slipped through. One was real: nothing tested what happens when you press Ctrl+C. That matters more than it sounds, because the database can only close once every check has stopped, so a check left running would make Ctrl+C hang forever. A new test presses Ctrl+C on the real program, and I proved it catches that hang by putting the bug in on purpose. The other two were a helper nobody needed (deleted) and a "this can't overflow" rule with no test at the edge (now tested, exactly at the limit and one past it). A second round on the final code: 17 planted bugs, every one that compiled caught.

## Where I messed up

**Green while saving was broken.** The demo caught this one. When the database got locked, the first website to fail its save went grey right away, but the *other* one stayed green until its own next check, about 10 seconds later. My banner was already saying "every monitor shows UNKNOWN". It wasn't true. Now, while saving is broken, everything goes grey at once, and a test with two websites makes sure of it.

**An error message that repeated itself.** "database is locked: Error code 5: database is locked". SQLite's error and its cause say the same thing twice. The messages now skip a cause that only repeats what came before it.

**A memory leak that wasn't.** My first speed test showed memory growing steadily, about 31 bytes per result, forever. Very alarming! Then I did the maths. The test was keeping every timing it measured, 16 bytes each, two per result. The leak was in my measuring tape. With a fixed-size tally instead, memory went flat.

**I guessed an error message.** In one test I typed out what I *thought* SQLite says for a duplicate entry. It doesn't say that. The test failed, which is the whole point of writing the expected words down. But I'm supposed to look things up, not guess.

## What it doesn't do yet

- **A restart doesn't load the saved history yet.** Everything is on disk; reading it back after a restart is the next step.
- **No real full disk in the tests.** Making a disk truly full needs administrator rights on this machine, so the tests use SQLite's own "disk is full" error instead (it's the same error code the monitor sees from a real full disk).
- **Alerts** come in milestone 3.

## Up next

**Checkpoint 2.5: restarts that don't lie.** Kill the monitor in the middle of an incident, start it again, and it picks up exactly where it was: the interrupted check marked as a gap, the incident still open, and two fresh passes needed to close it.
