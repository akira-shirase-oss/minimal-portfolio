+++
title = "Checkpoint H.1: four fix rounds, and three fixes that opened new holes"
description = "An outside gap review found scripts could reach the engine's own internals and redirects could walk past the allowlist. Four fix rounds closed them, each checked by a second reviewer, who caught three of my own fixes creating new ways to jam the server. 84 tests became 130, then 140 in a late verification round that's under review now. The million-request evidence predates the code and has to be re-run."
date = 2026-11-16T18:30:00-05:00

[extra]
kind = "failure"
milestone = "H"
step = "H.1"
short_title = "Security pass: four rounds"
# 130 at ab1bfa2, run twice in the fourth review pass (74 + 25 + 11 + 20); 140 at cb40ddf, as recorded
# in the late verification merge, now under independent review.
tests = 140

[extra.summary]
goal = "Close the holes an outside gap review found in the sandbox, the network fence, the module loader and rt.serve, with every fix re-checked by someone who didn't write it."
built = "No Deno globals, a net grant re-checked on every redirect hop and pinned to public addresses, a loader that only treats .js and .mjs as code, one deadline over a whole fetch, redacted fetch errors, and rt.serve limits that slow and idle clients can't hold forever."
proof = ["tests 84 → 110 → 120 → 125 → 130 across the four rounds, 140 after a late verification round", "final review verdict: ship, with 3 Low items left", "with 256 idle sockets held open, a GET still answers in 1–7 ms", "the M7 million-request numbers predate these fixes: re-run owed"]
code = "akira-shirase-oss/js-runtime · main @ f035c90 (last reviewed at ab1bfa2)"
+++

Picture a bouncer who checks your name at the door, then waves you through when you come back from
the smoking area with a different face. That was `rt.fetch` and redirects. The front door was
checked; the second door wasn't.

jsrt's roadmap finished on 2026-11-06. Today an outside gap review went through it the way an
attacker would, and found 24 gaps, 6 of them High.

## What I built

Four fix rounds, merged one at a time, each followed by an independent review before the next:

- **No more `Deno` inside scripts.** The `Deno`, `Deno.core` and `__bootstrap` globals are gone.
  They reached every built-in operation of the engine, including one called `op_panic`, which let a
  script crash the whole host.
- **Redirects are re-checked.** Every hop is checked against the network grant again, and a granted
  name may only connect to public addresses. A DNS answer that points at a private machine, or at
  the cloud metadata address `169.254.169.254`, is refused. Private names need an explicit opt-in.
- **The loader fence is tighter.** The script's own folder used to work as a read grant for any file
  in it. Now only `.js` and `.mjs` files there count as code; a JSON file needs a declared read path.
- **Fetch is bounded end to end.** One deadline now covers the whole request, body included, and
  errors no longer print passwords or query strings from the URL, only `scheme://host:port`.
- **`rt.serve` can't be held hostage.** A connection cap, header, body and write timeouts, a byte
  budget for request bodies, a minimum upload rate, and room made by closing the longest-idle
  connection when the cap is full.
- Smaller ones: `rt.sleep(1e30)` no longer panics, request ids are 64-bit (answers went missing
  after 2³² requests), supervised workers' output is capped, and the repo finally has its MIT
  `LICENSE` file.

These change behaviour for existing scripts, so the README now has a "Breaking changes" section.

## How it works (the short version)

The pattern behind most of these: **check the thing you actually use, at the moment you use it.**
Checking a host name once, then letting the HTTP client follow redirects on its own, means checking
something other than what you connect to. So every hop goes back through the same gate.

The serve limits follow one rule: **nothing a client sends for free should cost me a scarce slot.**
A request doesn't get a place in the queue until its body has actually arrived. A client that stops
reading loses its slot after the write timeout. A client that announces a big upload has 5 seconds
to send the first byte, then has to keep up 64 KiB a second.

## Does it actually work?

- **Tests went from 84 to 130.** 110 after round 1, 120 after round 2, 125 after round 3, 130 after
  round 4, with the fourth reviewer running the full suite twice. Each new test is tied to a fix,
  and in the first review 18 of the 22 tests checked failed when their fix was taken out.
- **The escapes stay closed.** The reviewer tried redirect hops to `[::1]`, `//127.0.0.1`, the decimal
  address `2130706433` and `localhost`. All exited with code 7, the capability error.
- **The server holds up.** With the connection cap filled by 256 idle sockets, a GET answered in 1
  to 7 ms. Eight connections that announce an upload and send nothing block uploads only until the
  5-second first-byte deadline: a 1 MiB upload got a 503 at +1 s and a 200 at +6 s.
- **The test harness got honest too.** One serve test failed in 7 of 15 runs before its harness fix
  and 0 of 15 after.

These are checks on a busy development laptop, not load runs. No load harness ran today.

## Where I messed up

The second reviewer found that three of my own fixes created new ways to jam the server, across two
rounds, and two of the Medium findings came from my fixes too.

**Round 1's queue.** I added a queue of 64 slots for requests, and a request took its slot as soon as
its headers arrived. So 64 clients could each say "here comes 100 bytes", send 2, and hold every
slot for the 30-second body timeout. Even a plain GET got no answer. The old build had answered it in
1 ms. The same round added a connection cap with no write timeout, so clients that asked for a big
answer and never read it kept their slots forever.

**Round 2's budget.** My fix for that was a shared byte budget for bodies, and each upload grabbed it
piece by piece while holding what it already had. Once half-finished uploads held all 64 MiB, none of
them could finish. That's a deadlock: everyone holding a fork, waiting for a second one. On the
round-1 build, 24 uploads of 7.5 MiB at once all got 200, the slowest in 0.24 s. On round 2: 7
succeeded, 11 timed out, 6 broke, and the slowest took 8.01 s. Round 3 removed the hold-and-wait.

And one hole sat there through two reviews: 256 idle sockets could stop the listener entirely, which
had been true since round 1's cap. The third pass caught it, and round 4 fixed it with
longest-idle eviction.

## What it doesn't do yet

- **The million-scale evidence is stale.** The 1,000,000-request `rt.serve` run (90,251 requests a
  second, p99 608 µs) ran on 2026-11-06, before all of this. Serve 1M, the saturation probe, the
  webhook 1M run, the soak and the cold-start run have to be re-run on this build, on a quiet machine.
  The roadmap and the README's "Still open" section both say so.
- **The final review left three Low findings.** An attacker could steer eviction toward honest
  connections (in one run, a download that paused for 1.5 s was cut off after 678,428 of 16,777,216
  bytes). The minimum-rate rule also cut small slow bodies, turning a 30-second deadline into about 5
  seconds. And the 200 ms drain of a refused body helps one refused client, not many at once. The
  late verification round below takes on the first two; its review is still running.
- **Three of the gap review's Highs are still open.** The 10-second default timeout still kills
  long-running serve apps and the supervisor never restarts a worker; SIGTERM drops requests in
  flight; and worker logs aren't redacted or tagged with a run id.
- **The late verification round is still under review.** It merged at the end of the day: a regression test
  for every defence on the security checklist that wasn't yet proven, each shown failing first. The
  loader now refuses remote, `data:` and `blob:` imports, fetch is capped at 32 in flight per run, the
  V8 heap limit ends a run cleanly with exit 6 instead of a crash, refusal messages name no host paths,
  and `unsafe` code is forbidden outside the supervisor's documented blocks. It also adds a pinned
  toolchain, a gate script and CI on Linux and macOS: 140 tests. Its first CI run on `main` failed on
  Linux: the memory-bomb test never wrote to the memory it allocated, and Linux doesn't count untouched
  pages as resident, so the supervisor's memory budget never fired. The bomb now writes every chunk,
  and CI is green on both systems.

## Up next

Finish the independent review of the verification round, then re-run the million-scale load evidence on the
hardened build and publish it with machine and commit, misses included.
