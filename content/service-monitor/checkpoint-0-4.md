+++
title = "Checkpoint 0.4: a test server that fails on purpose"
description = "Eight ways for a server to have a bad day, on demand, and why throwing away one object shuts all of them down."
date = 2026-10-14T12:40:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.4"
short_title = "A test server that fails on purpose"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 49

[extra.summary]
goal = "Give the monitor something real to fail against: slow, broken, silent or rude, on demand."
built = "A practice server with 8 ways to misbehave, a small demo app, and a connection counter."
proof = ["14 new tests, 12 over a real network connection", "3/3 deliberate bugs caught", "0 warnings"]
code = "68c2359"
+++

You can't test a smoke alarm without smoke.

To test a monitor, I need something to break: on demand, in exactly the same way, every time.

Fake responses won't do. The nastiest monitoring bugs are about timing: a server that picks up the phone and then says nothing, or one that promises a long answer and stops after a few words. You only see those over a real connection.

## What I built

A small web server whose only job is to misbehave. Each address is a different kind of bad day:

- `/healthy`: everything's fine.
- `/error`: "500, something broke".
- `/status/404` (or any other code): a valid answer, just not the one you expected.
- `/hang`: listens to your request, then never answers. Ever.
- `/slow-headers/3000`: answers, eventually (3 seconds later).
- `/stall-body`: promises 1,000 bytes, sends 16, then goes quiet.
- `/big-body`: 1 MB, sixteen times more than the monitor will ever read.
- `/close-early`: hangs up without a word.

There's also an address where nobody's listening (a server that's down), a counter of how many connections came in, and a small app to play with it by hand.

It lives in its own separate project, right next to the monitor. That way, test code can never sneak into the real monitor.

## How it works (the short version)

It speaks just enough HTTP, written by hand. A web framework would helpfully tidy up and time out for me, which is exactly what I don't want. Here, `/hang` really hangs.

The interesting part is switching it off. A test that leaves a hanging connection behind could mess up the next test.

In Rust, every value has one owner, and when the owner is done, the value gets cleaned up. So I set it up like a chain:

- the test owns the practice server,
- the server owns its background worker,
- the worker owns a container holding every open connection.

When a test finishes, the server gets thrown away. That stops the worker, which empties the container, which closes every connection. One thing goes out of scope, and everything closes. No "please shut down" messages, no bookkeeping.

(I checked the library's source code to be sure: throwing away that container really does stop everything inside it.)

## Does it actually work?

12 tests talk to it over a real network connection and check both *what* comes back and *when*:

- `/hang` sends nothing for 300 ms, and keeps the line open.
- `/stall-body` promises 1,000 bytes and sends exactly 16.
- `/big-body` delivers exactly 1,048,576 bytes.
- Throwing the server away ends a connection that was stuck on `/hang`.

And here it is by hand, with `curl`:

```
/healthy       → 200
/error         → 500
/status/404    → 404
/close-early   → empty reply (curl exit 52)
/hang          → still nothing after 1 s (curl exit 28)
/big-body      → 1048576 bytes
```

Then I broke it on purpose, three times:

- **Made `/hang` answer:** 2 tests failed.
- **Made `/stall-body` honest:** 1 test failed.
- **Let connections run on their own, outside the container:** the "throwing it away closes everything" test failed. That's the proof that the ownership chain is doing the work.

## Where I messed up

- **My first "break it on purpose" attempt didn't even compile.** A broken version that doesn't compile proves nothing about the tests. So I fixed my broken version until it compiled, and then the test caught it.
- **I'd told the code reviewer that `unwrap()` is fine in tests.** Turns out that only covers the test functions themselves, not the little helper functions next to them. Nine warnings. One clearly commented line fixed it.

## What it doesn't do yet

- It answers every kind of request the same way. There's no special handling for HEAD requests.
- "An address where nobody's listening" is found by grabbing a free port and letting it go. Another program could grab it in between, which is unlikely on my laptop.
- The "nothing happens" tests wait 300 ms. On a very busy machine that could get flaky. I'll keep an eye on it.

## Up next

**Checkpoint 0.5: the monitor's actual check.** One request against this practice server, for the four basic cases: fine, broken, hanging, and down. Each one must be judged correctly within its time limit, using exactly one connection.
