+++
title = "Checkpoint 0.7: I let a tool attack my code. It found 19 holes."
description = "Hand-picked tests said everything was fine. Automatic mutation testing, random inputs and 400 checks at once disagreed."
date = 2026-10-14T13:10:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.7"
short_title = "I let a tool attack my code. It found 19 holes."
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 102

[extra.summary]
goal = "Stop trusting tests I picked myself: let tools attack the code, and fix every hole they find."
built = "Mutation testing on every change, 11 rules tested with random inputs, and stress tests with 400 checks at once."
proof = ["19 surviving bugs found, then killed", "final run: 0 of 258 planted bugs survived", "102 tests, 10 clean runs in a row"]
code = "748267e"
+++

So far, every checkpoint ended with me breaking the code on purpose and checking that a test noticed.

There's a problem with that: **I** chose what to break. I'm also the person who wrote the tests. Of course my tests caught my attacks.

So for this checkpoint, I handed the attacking over to tools.

## Attack 1: a tool that plants bugs

There's a tool called **cargo-mutants**. It makes hundreds of tiny changes to your code, one at a time. It flips a `>` into a `>=`, deletes a line, makes a function return nothing. After each change, it runs all your tests.

If the tests still pass with the bug in place, that's a **survivor**: proof that a real bug could hide there.

First run, on all my code: **238 planted bugs, 19 survived.** Every one of my hand-picked attacks had been caught, and the tool still found 19 holes.

The survivors told a very clear story:

- **Edges.** Nothing tested a page of *exactly* the 64 KB limit, or a web address of *exactly* 2,048 characters. A `>` quietly turning into `>=` went unnoticed. Edges are where bugs live, and I'd only tested near them.
- **Things I never actually checked.** A monitor set to send a `HEAD` request could have sent `GET` instead, and no test would have noticed. Same for the "this reply is compressed" safety check: no test ever sent a compressed reply.
- **Two copies of the same code,** where only one was tested.

I wrote a test for each one, and ran the tool again. **258 planted bugs, 0 survivors.** Two of them made the tests hang instead of fail (an endless loop). That still counts as caught, because the test run stops on a time limit, just more slowly.

## Attack 2: thousands of random inputs

My tests used examples I made up. **Property tests** flip that around: I write a rule that must *always* hold, and a tool throws thousands of random inputs at it. For example:

- **Every** address inside every blocked range is blocked, using random addresses, not my favourites.
- `::ffff:10.0.0.1` and other "IPv4 in an IPv6 costume" forms always get the same answer as the plain address.
- The address checker **never crashes**, no matter what string you throw at it.
- To catch the opposite mistake, big chunks of the real internet must always be *allowed*. A typo that blocked half the internet would fail this.

**11 rules, about 45,000 random cases every run.** No counterexamples. Honestly, I was a little disappointed.

## Attack 3: 400 checks at once

Then I fired 400 checks at my practice server at the same time. Each one had to get the right answer, using exactly one connection.

It passed. Then I ran the whole test suite 10 times in a row, and it failed **3 times out of 10**.

Under load, a few checks reported "timed out while connecting". Was my monitor wrong? The Linux kernel keeps a counter for exactly this situation, so I checked it before and after each run: **124 to 420 dropped connections** every time.

The culprit: my practice server could only keep **128** connections waiting to be picked up. That's the default in Rust's networking, copied from the standard library. A burst of 400 overflowed it, the kernel dropped the extra connection attempts, and they took over 2 seconds to retry.

So the monitor was **right**. Connecting really did take too long. My test server was the weak link. I raised its waiting room to 4,096, and the result was **0 dropped connections in 20 runs**, and 10 out of 10 clean runs of the full suite.

Bonus: this is exactly why the plan says the monitor should never fire more than 2 checks at once at the same server. Now I've seen why with my own eyes.

## Where I messed up

The tools found two bugs **in my tests**, not my code:

1. **A test that agreed with anything.** To test a size limit, I used the limit's own value from the code. So when the tool shrank the limit, my test shrank with it, and still passed. A test has to write down the expected number itself.
2. **A pipe I closed by accident.** One test read a line from a program's output through a temporary helper. In Rust, a temporary is thrown away at the end of its line, and throwing it away closed the pipe. The program's next print then crashed. It only failed sometimes, depending on timing, which is the worst kind of bug. The fix is to give the helper a name, so it lives as long as needed.

## What it doesn't mean

- Zero survivors means the tests **notice** every small change the tool knows how to make. It doesn't mean the code is bug-free.
- Two planted bugs made the tests hang instead of fail (an endless loop). Those count as caught, because the test suite stops on a time limit, but they're slower to notice.

## Up next

The first milestone is done. Next, the monitor learns to **check on repeat**, every minute and without overlaps. It also gets its **first dashboard**, so you can watch it work in a browser, and a real **Node.js app** to watch.
