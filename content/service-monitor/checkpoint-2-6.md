+++
title = "Checkpoint 2.6: keeping a week, summing up the rest"
description = "My monitor now cleans up after itself. Every check is kept for a week; after that, each hour is boiled down to a small summary that lives for 90 days. It never deletes anything it hasn't summed up first, and it never keeps the writer busy for more than a blink."
date = 2026-10-16T07:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M2"
step = "2.6"
short_title = "Keeping a week, summing up the rest"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 348

[extra.summary]
goal = "History that never grows without limit, and never loses the story: raw checks for a week, hourly summaries for 90 days."
built = "Hourly summaries counted from the raw checks, old checks deleted only after their hour is summed up, a note on every incident before its checks go, and housekeeping in small steps every minute."
proof = ["8 simulated days: every summary equals a fresh recount of its checks", "a week's backlog for 100 websites cleared in 1.9 s, never more than 22 ms at a time", "a 9-day-old folder summed up and tidied by the real program in under a second"]
code = "72b406d"
+++

A shop keeps its till receipts for a week, in case someone comes back with a question. After that, the receipts go in the bin, but the daily totals go in the ledger, and the ledger is kept for years. Nobody needs every receipt from March. Everybody needs to know how March went.

My monitor had the receipts part down. Since the last two steps, it saves every single check: about 1,440 a day per website. At 100 websites that's a million rows a week, and it would have kept growing forever.

This step gives it the ledger.

## What I built

**A summary for every hour.** Once an hour is over, the monitor counts it up, for each website: how many checks were due, how many passed, how many failed, and how many it couldn't make (gaps). Plus how long the checks took, sorted into fixed time buckets: up to 1 ms, up to 2 ms, up to 5 ms, and so on up to 15 seconds, plus one for anything slower.

**Every check counts exactly once.** Expected = passed + failed + gaps, always. The database refuses to save a summary where that doesn't add up. A slot with no record at all counts as a gap: nothing says what happened, so it can't be a pass. And if the monitor was off for three days, that one "monitor was stopped" record is split across the hours it covers, so each hour gets its share.

**Old checks go, but only after they're summed up.** Raw checks are kept for 7 days. After that they're deleted, but never before the hour they belong to has its summary. Summaries are kept for 90 days, and so are incidents that were resolved. An incident that's still open is never deleted, however old it gets.

**Incidents keep a note.** When the checks that opened and closed an incident are about to go, the incident gets a one-line note first:

```
opened by the check due 2026-10-15 21:13:46 UTC: expected {200}, got 503 Service Unavailable (HTTP 503, 0.6 ms)
```

So three months later you can still see *what* went wrong, not just *that* something did.

**Housekeeping in small steps.** Once a minute, the monitor does a little tidying: at most 200 hours summed up and 1,000 old checks deleted per round. If there's a backlog (after a long stop, say), it does another round every fifth of a second until it's caught up, with real checks slipping in between rounds.

## How it works (the short version)

**One writer, never held hostage.** All saving goes through a single "writer" (it's how the database stays consistent). If housekeeping grabbed it for a long time, check results would pile up behind it. So housekeeping works in small, bounded steps, and lets everything else through in between.

**Counting is a pure function.** The part that adds up an hour takes rows in and gives counts out, with no database and no clock. That makes it easy to test against the slowest, most obvious way of doing it: look at every slot of the hour, one by one, and ask which record covers it. A random tester throws thousands of messy layouts at both and checks they agree.

**Summaries are kept separate where mixing would lie.** Passes and failures get separate timing buckets, and so do "time until the first byte" and "time to read the whole page". Averages of averages are a classic way to fool yourself, so the monitor only ever adds counts together.

## Does it actually work?

**Eight days in a few seconds.** A test runs two websites through eight simulated days of real saves, about 23,000 results with failures, runs of missed checks, an incident that opens and closes, and another that stays open the whole time. Every simulated hour it runs a round of housekeeping, then checks four things: every summary equals a fresh recount of its checks; no check was deleted before its hour had a summary; the open incident is still there; and running housekeeping again changes nothing.

**The real program, with a backlog.** Another test takes the real monitor, pretends its data folder is nine days old, and starts it. In under a second, every finished hour is summed up and the checks older than a week are gone. The two old passes live on in their hour's summary.

**How fast, how big.** I built eight days of checks for 100 websites (1,152,000 records) on my laptop's SSD and let housekeeping catch up from scratch:

- 19,200 hours summed up and 144,100 old checks deleted in **1.93 seconds**, over 145 small rounds;
- a typical round took **14.7 ms**, the slowest **21.9 ms**: that's the longest a check result ever waited behind it;
- a summary takes about **174 bytes**, so 90 days of them for 100 websites is about 38 MB.

All in, a data folder for 100 websites checked every minute settles around **160 MB**: under 8% of the disk space the monitor allows itself.

One honest note: the file doesn't shrink when old checks are deleted. The space they leave is reused for new ones first, so the file stops growing instead of getting smaller. That's normal for SQLite, and it's why "settles around" is the right phrase.

**Behind it:** 348 tests, and 10 clean runs of the whole suite in a row. A tool planted 227 small bugs in the new code: 4 didn't compile, 16 sent housekeeping into an endless loop (a time limit catches those), and the tests caught all the rest, but only after I closed the 16 that slipped through along the way. They hid in 11 places, and one of them twice, because my first fix didn't actually close it. The one I like best is above: the test that agreed with any mistake.

## Where I messed up

**A late check could have made a summary lie.** A summary is written once its hour is over. But if saving is slow, a check from that hour can be saved *after* the summary was written, and the summary would still count it as a gap. I spotted this thinking it through, before writing the tests. Now saving a check into an hour that's already summed up recounts that hour, in the same step. A test saves a pass two hours late and checks the summary picks it up.

**The same question, two answers.** The random tester found it: when two records claimed the same slot (impossible in the real database, but the counting code shouldn't depend on that), my code sometimes picked one and sometimes the other, depending on how a sort happened to break the tie. A function that counts should give the same answer every time. Now it does, and that exact case is saved, so it's replayed on every run.

**A test that agreed with any mistake.** One test compared every hourly summary with a fresh recount of its checks. Sounds airtight. But the recount used the same counting code as the summary. When a testing tool deleted "failure" from that code, failures turned into "couldn't check" on *both* sides, and the two agreed perfectly. A test that checks code against itself can't catch that code being wrong. Now one hour's numbers are simply written down: 60 checks, 50 passes, 6 failures, 4 gaps.

**I named two things the same.** The database handle got a "housekeep" method, and so did the interface it was plugged into. It worked, but it's the kind of name clash that can later make the wrong one run. A strict check I run on every build flagged it (I've made this mistake before, which is exactly why that check is on). Renamed.

## What it doesn't do yet

- **The summaries aren't on the dashboard yet.** They're counted and kept, ready for "last 30 days" numbers, but nothing shows them so far.
- **No live demo of real days passing.** A week is a long time to wait. The proof is the eight-day simulation and the real program clearing a nine-day backlog.
- **No disk limits yet**, and the database's write-ahead log (a scratch file where every save lands first) isn't watched yet. That's the next step.

## Up next

**Checkpoint 2.7: disk limits and backups.** The monitor checks how much disk space is left (and stops politely before it runs out), keeps its write-ahead log small, and learns to make a backup you can actually restore.
