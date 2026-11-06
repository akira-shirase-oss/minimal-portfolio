+++
title = "Checkpoint 1.4: restart recovery"
description = "Open incidents and streaks rebuild from the store on boot — an incident persists until two fresh passes, and a server killed mid-incident comes back still 'down'."
date = 2026-11-05T12:30:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.4"
short_title = "Restart recovery"
tests = 31

[extra.summary]
goal = "A restart loses nothing — open incidents and streaks rebuild from committed rows, not memory."
built = "Health::rebuild replays the committed tail per monitor on boot; an incident persists until two fresh passes land, and rebuilt streaks match what the rows say."
proof = ["Health::rebuild unit tests + live restart drill", "kill mid-incident → still open, streaks rebuilt from the store"]
code = "akira-shirase-oss/monitoring-service · main @ bf13126"
+++

**What changed:** `Health::rebuild` replays each monitor's committed tail on
boot, restoring streaks and open incidents from the store — never from
whatever the scheduler happened to remember. An incident persists until two
*fresh* passes land; replayed history can't resolve it, and new evidence can't
be mistaken for old.

**Proof:** unit tests plus the live drill that became M1's exit: killed the
server mid-incident → it came back still `down`, streaks intact — the restart
was a non-event because the truth was never in memory.
