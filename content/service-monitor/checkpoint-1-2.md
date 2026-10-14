+++
title = "Checkpoint 1.2: three strikes and it's down"
description = "My monitor now checks on its own schedule and only calls an outage after three failures in a row. I hung a real app on purpose and watched one incident open and close, exactly by the rule."
date = 2026-10-14T21:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M1"
step = "1.2"
short_title = "Three strikes and it's down"

[extra.summary]
goal = "Check on a schedule, and only call something down when the evidence agrees."
built = "A watch command, a three-strikes rule for outages, and a scheduler that never doubles up and never catches up in a burst."
proof = ["incident opened 75 s after a real hang, resolved 45 s after the fix", "133 tests, 10/10 clean runs", "61 planted bugs, 0 survived"]
code = "e1a3ee6"
+++

Last time, in the middle of a slowdown, one health check came back in 1.5 ms. The checks just before and after it took 60 and 136 ms.

If my monitor believed every single check, it would flicker between "down" and "fine" like a bad light bulb. So this step teaches it some patience.

## What I built

**A `watch` command.** Give it some URLs and it checks each one on a schedule, forever, printing what it saw and what it now believes.

**A three-strikes rule,** like a referee:

- One failed check makes the site **suspect**. You can see it, but no alarm goes off.
- **Three failures in a row** open an incident. That's the alarm.
- Once it's down, **two passes in a row** close the incident. One lucky answer isn't enough.

**"I couldn't look" is never "fine".** If a check didn't happen (the laptop was asleep, the clock jumped), the monitor writes down a gap and shows UNKNOWN. A gap also resets the count, so fail, gap, fail is not "two in a row".

## How it works (the short version)

**Every monitor runs on a timetable,** like a train: at 18 and 48 seconds past every minute, say. Each monitor gets its own fixed offset, so 50 monitors don't all fire in the same second.

**One worker per monitor,** so a monitor's checks can never overlap.

**No catch-up bursts.** If the laptop lid is closed for 10 minutes, the worker doesn't wake up and fire 20 checks in a row. It writes down one gap, "missed 20 checks", and waits for the next slot.

**The rule is one small function** with no clock and no network. You give it the current state and one result, and it hands back the next state. That makes it easy to attack: I checked it against a second, independently written version of the rule on 5,000 random runs of results.

**All the state has one owner.** The workers don't share anything. They send their results to one coordinator, which is the only thing allowed to change the state. In Rust that means no locks anywhere.

## Does it actually work?

I pointed it at the Node.js app from [checkpoint 1.1](@/service-monitor/checkpoint-1-1.md), checking every 30 seconds with a 2-second limit. Then a script made the app hang (it accepts requests but never answers) and fixed it two minutes later.

Here's what the monitor printed for `/ready`, copied from the log. I trimmed the spacing and shortened "no reply before the deadline" to "no reply":

```
20:43:05  PASS 200 OK (0.6 ms)       UP
          ... 20:43:20: the app hangs ...
20:43:35  FAIL no reply (2001.0 ms)  SUSPECT (1 of 3 failures)
20:44:05  FAIL no reply (2000.5 ms)  SUSPECT (2 of 3 failures)
20:44:35  FAIL no reply (2001.1 ms)  DOWN  << incident opened
20:45:05  FAIL no reply (2000.4 ms)  DOWN
          ... 20:45:20: the app is fixed ...
20:45:35  PASS 200 OK (0.8 ms)       RECOVERING (1 of 2 passes)
20:46:05  PASS 200 OK (1.0 ms)       UP  << incident resolved
```

What to notice:

- **The first failure came 15 seconds after the hang:** the next slot on the timetable.
- **The incident opened 75 seconds after the hang.** That's the price of patience: three checks, 30 seconds apart. With the default one-minute interval it would take two to three minutes. A faster alarm means more false alarms. That trade-off is real, and now it's visible.
- **One incident, not four.** The fourth failure just kept it DOWN.
- **It resolved 45 seconds after the fix,** on the second pass in a row.
- `/health` told the same story 13 seconds later each time, because its slot sits 13 seconds later on the timetable.

## Where I messed up

**I almost shipped a monitor that could go silent for an hour.**

To wait for the next check, my code read the wall clock, worked out "the next check is in 30 seconds", and set a timer. But a timer works like a stopwatch: it counts seconds and never looks at the clock on the wall.

Computers do get their clock changed: a time-sync correction, or a virtual machine restored from a snapshot. Set the clock back an hour, and my monitor would wait an hour without checking anything, still showing the last state, "UP", as if it were fresh. For a tool whose whole job is telling the truth, a silent bug is the worst kind.

I found it by re-reading my own plan before committing. It said, in plain words: "treat a backwards clock jump as a gap". My code didn't.

**The fix:**

- never wait longer than one interval without looking at the clock again;
- if the clock went back, write down one gap and show UNKNOWN;
- never run the same check twice.

Four new tests run on fake time, so a 10-minute clock jump takes no real time at all. I swapped the old code back in to check: all four fail on it.

**And one of those tests was wrong at first.** I guessed it should finish "within a minute" and forgot that the fake check itself takes a second. On fake time everything is exact, so the test now checks the exact second instead of a guess.

## What it doesn't do yet

- **It forgets everything when you stop it.** Saving history comes in M2.
- **It only prints to the terminal.** No dashboard yet: that's next.
- **No limit on how many checks run at once.** Fine for a handful of URLs, not for hundreds. That's a small step after the dashboard.
- **The 3-and-2 rule is fixed.** Making it adjustable comes with saved settings, in M2.
- **One machine, one five-minute demo.** The timings above are real, but they're one run.

## Up next

**Checkpoint 1.3: the first dashboard.** A plain web page, served by the monitor itself, that shows every monitor's state and its recent checks. No JavaScript: the page just refreshes itself.
