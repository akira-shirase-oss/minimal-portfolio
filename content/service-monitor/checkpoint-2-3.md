+++
title = "Checkpoint 2.3: remembering who's who"
description = "My monitor now remembers what it watches. Restart it, kill it, reorder the list: every website keeps its number and its schedule, and one you stop watching is kept, not deleted. Plus: per-website alarm sensitivity."
date = 2026-10-16T01:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M2"
step = "2.3"
short_title = "Remembering who's who"

[extra.summary]
goal = "The same website is the same monitor after every restart, with its history attached."
built = "watch --data-dir: monitors stored by address, versions for changed settings, nothing ever deleted, and per-website thresholds."
proof = ["killed and restarted three times: every number stayed put", "253 tests, 10/10 clean runs; 300 random change sequences", "every planted bug that compiled was caught, after one fix"]
code = "1d687db"
+++

Imagine a receptionist who hands out new staff numbers every morning, at random. Yesterday you were #4, today you're #11. Good luck finding last week's timesheets.

Until now, that was my monitor. Each time it started, it numbered the websites in the order you typed them. Before it can save any history (the next step), it has to know that *this* website is the same one as yesterday.

## What I built

**A memory of what it watches.** Point `watch` at the data folder from the last step, and every website keeps its number from one run to the next, whatever order you list them in. Each line says what changed since last time:

```
#1 http://127.0.0.1:9000/healthy  no longer watched: kept with its history
#2 http://127.0.0.1:9000/error  every 30 s, first check at 16:33:13 UTC (unchanged)
#3 http://127.0.0.1:9000/status/204  every 30 s, first check at 16:32:55 UTC (new)
```

**Nothing is ever deleted.** Stop watching a website and it's put aside, with its history. List it again later and it comes back as itself, number and all.

**Changes get a new version, not an overwrite.** Change how often a website is checked, or how long a check may take, and the monitor starts a new *revision* of it, like a new version of a document. Old results will keep pointing at the settings they were made with, so a result from last week is never judged by this week's rules.

**Each website keeps its moment.** Every website is checked at its own fixed moment in the minute, so they don't all fire at once. That moment is now stored too, so after a restart, a website's checks land exactly where they did before.

**Alarm sensitivity, per website.** By default an incident opens after 3 failed checks in a row and closes after 2 passes. Now you can choose, from 1 to 10. A flaky staging server might deserve 5 strikes; a payment page, maybe 1. The dashboard shows each website's own numbers ("Opens after 5 failures").

## How it works (the short version)

**All or nothing.** Comparing your list with what's stored, adding new websites, starting new revisions, putting the missing ones aside: it all happens as one transaction, like a bank transfer. If anything fails halfway, nothing changed at all. I tested exactly that, with a sync rigged to fail on its third website: the first two weren't kept either.

**A website is its address.** `HTTP://Example.COM/health` and `http://example.com/health` are the same website, so they're the same monitor. Listing it twice is refused, with a message saying which one. Names now come from the address too, so reordering your list doesn't "rename" anything.

## Does it actually work?

**I pulled the plug, three times.** A test starts the real program with two websites, then kills it outright, the way a crash or a power cut would. It restarts with a different list, then kills it again, then restarts with changed settings. Every time, the numbers stayed put, the left-out website was kept, it came back as #1 when listed again, and the changed settings became revision 2. Each restart also proves the lock on the data folder was released when the program died, even though it never got to clean up.

**A random tester.** Another test throws 300 random sequences of changes at it: websites added, dropped, brought back, settings flipped. It checks every step against a simple model of what *should* happen: numbers never change, revisions only ever go up by one, exactly one active version per active website.

**How fast.** Syncing 120 websites, the most the monitor's limits allow, takes 3.8 ms the first time, and 1.2 ms on an ordinary restart when nothing changed. That's on a real SSD, with every change safely on disk.

**Behind it:** 253 tests, 10 clean runs in a row. A tool planted 64 small bugs in the changed code. 25 didn't compile, 33 were caught, and 6 slipped through, all in the little function that names monitors after their address. Nothing checked the names, or what happens at exactly 80 characters, where a long name gets cut. Now a test does, right at the edge: 80 characters stay whole, 81 get trimmed to 79 and a "…". All 5 bugs planted there are caught.

## Where I messed up

**One long sentence rearranged the whole help screen.** I wrote a long description for the new `--data-dir` option. The help screen's layout engine decided the options no longer fit on one line each, and switched *all* of them to two lines. That pushed each "[default: …]" onto the next line, where my README test couldn't see it, so the test failed. Nice catch, test. The fix was a shorter description (and a shorter placeholder, `<N>`), which brought back the compact layout, plus a smarter test that reads both layouts.

**My test threw away the line it was looking for.** The helper that reads the program's output skips every line before the one it wants, and drops them. In the third restart, the "no longer watched" line comes out first, but my test looked for "#1" first, so it skipped straight past it. The program was right all along; the test now reads lines in the order they're printed.

## What it doesn't do yet

- **Results aren't saved yet.** It remembers *who* it watches, not *what it saw*. That's next.
- **A restart forgets an open incident.** Picking up mid-incident comes two steps from now.
- **No adding or editing websites from the dashboard.** That's milestone 4.

## Up next

**Checkpoint 2.4: nothing counts until it's saved.** Every result written to disk, in the same step as the decision it leads to, before the dashboard shows it.
