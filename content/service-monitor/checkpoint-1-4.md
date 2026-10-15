+++
title = "Checkpoint 1.4: a fair queue for checks"
description = "My monitor now takes turns: at most 20 checks at once, and 2 per website, so one slow site can't hog the line. It also refuses a setup that would overload itself, before it even starts."
date = 2026-10-15T16:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M1"
step = "1.4"
short_title = "A fair queue for checks"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 201

[extra.summary]
goal = "Never pile onto a struggling website, and never let one slow site make the others wait."
built = "Check slots (20 overall, 2 per website), a 5-second rule for starting on time, and a bouncer that refuses a setup too big to keep up with."
proof = ["12 checks on a hung app: two waited 2.1 s for a slot, exactly as predicted; none skipped", "201 tests, 10/10 clean runs (three times over)", "71 planted bugs in the new code: 61 caught, 0 missed (10 didn't compile)"]
code = "8957bdf"
+++

The worst time to hammer a website is when it's already struggling. And that's exactly when a careless monitor does it: every check takes longer, more of them stack up, and the monitor becomes part of the outage.

So this step teaches my monitor to take turns.

## What I built

**Check slots.** At most 20 checks run at the same time, and at most 2 on any one website. Think of a bank with 20 tellers and one rule: no company sends more than 2 people to the counter at once.

**A 5-second rule.** Every check has a time it's supposed to run. If it can't get a slot within 5 seconds of that time, it doesn't run late and pretend it was on time. It's skipped, and the dashboard shows a grey bar that says why: "skipped 1 check: this site was busy". Grey means "couldn't check", never "fine".

**A bouncer at the door.** Before it starts anything, the monitor adds up how busy your list of websites will keep those slots, on average. If that's more than half of them, it refuses, and tells you why:

```
$ service-monitor watch <13 URLs on the same site>
service-monitor: too many checks for the check slots:
  13 monitors on http://127.0.0.1:7070 would keep 1.09 check slots busy on average, but one site may use at most 1 (half of 2)
  Watch fewer URLs on one site, check less often (--interval-secs), or give each check less time (--timeout-ms).
```

**Checks that can't take the monitor down with them.** Each check now runs in its own little task, holding its slots. If a check crashes (a bug in my code), or hangs past its time limit, it's stopped, its slots go back, and the result says "couldn't check". The monitor carries on with the next one.

## How it works (the short version)

**Two tickets, in the right order.** Every check needs two tickets: one for its website, then one for the whole monitor. The order is the clever bit.

If a check grabbed the monitor-wide ticket first, a crowd of checks for one slow website could stand in the main line, holding tickets, while they wait for their website's turn. Everyone else would queue behind them. Taking the website's ticket first means a check that's waiting holds nothing anyone else needs. One slow website can use at most 2 of the 20 slots, and the main line stays first come, first served.

**The bouncer's arithmetic, in plain words.** A check with a 5-second time limit, once a minute, keeps a slot busy for at most 5 seconds out of every 60: one twelfth of the time. Twelve of them fill one slot. A website gets 2 slots and the rule allows half, so 12 fit and the 13th doesn't.

I count this in whole milliseconds per hour: each of those checks uses at most 300,000 ms of slot time per hour, and 12 of them use exactly 3,600,000, one full slot-hour. With whole numbers, "exactly the limit" really is exactly the limit. With decimals, a rounding error could wrongly turn away the 12th.

**Why only half?** It's a safety margin, not a promise. Checks can still bunch up: twelve monitors don't spread themselves perfectly over a minute. Admission keeps the average low, and the 5-second rule deals with the bunching.

## Does it actually work?

**A real app, a real hang.** I pointed 12 monitors at the Node.js app from [checkpoint 1.1](@/service-monitor/checkpoint-1-1.md): exactly the limit for one website at the default settings (a check every minute, a 5-second time limit). A 13th was turned away at the door; the message above is the real one.

Before running it, I worked out from the monitors' timing which checks would bump into each other if the app hung. Monitors #12 and #8 come due a couple of seconds after #5 and #1. When the app hangs, every check takes its full 5 seconds, so #12 and #8 should find both of the site's slots taken, and wait about 2.1 seconds for one to free up.

Then I made the app hang for 130 seconds. Here's the terminal (spacing trimmed to fit):

```
14:15:28 #5  FAIL no reply before the deadline (5001.4 ms)  SUSPECT (1 of 3 failures)
14:15:28 #1  FAIL no reply before the deadline (5001.8 ms)  SUSPECT (1 of 3 failures)
14:15:30 #12 FAIL no reply before the deadline (5001.5 ms), started 2.1 s late  SUSPECT (1 of 3 failures)
14:15:31 #8  FAIL no reply before the deadline (5001.7 ms), started 2.1 s late  SUSPECT (1 of 3 failures)
```

The time on the left is when each check was due. Instead of piling a third and a fourth request onto an app that was already stuck, #12 and #8 waited their turn: 2.1 seconds, exactly as predicted, in both minutes of the hang, and in both runs I did. Nothing was skipped, because 2.1 seconds is well inside the 5-second rule.

No incident opened, by the way. 130 seconds of hang is two failed checks per monitor, one short of three strikes. That's the rule from [checkpoint 1.2](@/service-monitor/checkpoint-1-2.md) doing its job.

**The bad days, on purpose.** A normal day barely needs a queue, so I staged the bad ones in tests. These run on a fake clock, so a 10-second hang takes no time at all and every timing is exact to the millisecond:

- **A slow site next to a fast one.** Ten checks for site A that each take 10 seconds, all due at once, plus one check for site B, due a tenth of a second later. Three slots in total. Site A got its 2, its other 8 checks were skipped after 5 seconds, and site B's check started at its exact time. Not a millisecond late.
- **A stampede.** Thirty checks due at the same moment, 2 seconds each, 5 slots. They ran in three waves, starting at exactly 0, 2 and 4 seconds. The other 15 couldn't start within 5 seconds, so they were skipped and marked. Never more than 5 at once.
- **The same over a real network.** Twenty-four real checks against my test server, all due at once, 4 slots: 16 ran, 8 were skipped, never more than 4 at once, and the server saw exactly 16 connections. A skipped check doesn't even knock on the door.
- **Crashes and hangs.** A check that crashes becomes "the check crashed (a bug in the monitor)"; one that ignores its time limit is stopped exactly 1 second after it. In both tests there's only one slot, so the next check can only run if the slot really came back. It does.

**Behind all that:** 201 tests. The whole suite ran 10 times in a row without a single failure, three times over, because a test that only fails sometimes makes every other result a guess.

I also planted 6 bugs by hand, one for each rule: take the tickets in the wrong order, don't reserve room for the result, let a check's task run loose, run checks without their own task, wait forever for a slot, forget to look at the real clock. Every one was caught (the first one only after the fix you'll read about next). Then a tool planted 71 more small bugs in every line I changed: 61 caught, none slipped through, and the other 10 didn't even compile, so they prove nothing either way.

## Where I messed up

**My fairness test checked *whether*, not *when*.** To prove the ticket order matters, I swapped it on purpose and ran the tests. One test failed, good. But my big "a slow site can't starve another" test passed. What happened: the main line is first come, first served, so site B's check queued behind site A's waiting checks. At exactly 5 seconds they gave up, and B slipped in just before its own 5 seconds ran out. "Checked", technically. But 4.9 seconds late.

It's like a delivery test that checks the pizza arrived, but not that it arrived cold. The test now checks that B's check started at its exact due time, and the swapped order fails it.

**A laptop nap could sneak a stale check through.** Before committing, I re-read the plan line by line, and one line stopped me: "a check must start within 5 seconds of its time". My 5-second wait used a timer, and computer timers pause while a laptop sleeps. Close the lid while a check is waiting for a slot, open it an hour later, and the timer thinks only a second has passed. The check would run, an hour late, as if it were on time.

Now, after waiting, the monitor looks at the real clock again. Too late is too late: the slots go back and it's marked as a missed check. A test fakes exactly that nap, and fails without the fix.

**I repeated yesterday's mistake.** In the last checkpoint, I wrote about a test that accepted two answers ("A or B") because I hadn't looked up which one was right. This time I caught myself typing the same thing. Same fix: look it up, check the one right answer. Catching it while typing instead of after the fact is progress, I think.

## What it doesn't do yet

- **No "check now" button yet.** That comes with the full dashboard (M4), and it will wait in the same line as everything else.
- **Two names for the same server count as two websites.** The monitor decides what "one website" means from the address you typed, before looking anything up.
- **The limits are fixed** at 20 and 2.
- **It still forgets everything on restart.** That's the next milestone.

## Up next

That's milestone 1 done: the monitor checks on a schedule, calls outages carefully, shows them in a browser, and takes turns.

**Next is M2: remembering.** Every result saved to a small database, so a restart never loses track of an outage.
