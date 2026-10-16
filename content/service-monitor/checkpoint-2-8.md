+++
title = "Checkpoint 2.8: telling certificate problems apart"
description = "\"Couldn't connect\" is the least helpful thing a monitor can say about a broken certificate. Mine now says which problem it is (expired, not valid yet, untrusted, for another name) and what to do about it."
date = 2026-10-16T20:00:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M2"
step = "2.8"
short_title = "Telling certificate problems apart"
# Rust tests in the workspace at this checkpoint (the home page draws them as a sparkline).
tests = 441

[extra.summary]
goal = "Every certificate problem gets its own plain reason, counted as the site's failure, never as a gap and never as \"couldn't connect\"."
built = "A reader for the real cause buried inside a TLS error, five plain reasons and one fallback, a test server that makes every kind of bad certificate on demand, and a Guide section that explains each one."
proof = ["each certificate problem through a real TLS handshake, classified exactly", "the monitor refuses even a valid test certificate: it trusts only what the computer trusts", "an incomplete chain fails as untrusted, the full chain passes"]
code = "d576f0c"
+++

Every https website shows visitors a certificate: a digital ID card that proves the site is really itself. Like ID cards, they expire, get issued for the wrong name, or turn out to be signed by nobody you've heard of.

When that happens, most monitors say "couldn't connect". Which is true, in the way "something went wrong" is true. You still have to go and find out what.

Mine now tells you.

## What I built

**Five plain reasons, and one for everything else.** When the secure connection fails, the check says which of these it was:

- *the certificate has expired*: it wasn't renewed in time;
- *the certificate isn't valid yet*: its start date is in the future (usually a clock is wrong somewhere);
- *the certificate isn't signed by an authority this monitor trusts*: it signed itself, a private authority did, or the server forgot to send the middle certificate that links its own to a trusted one;
- *the certificate is for a different name*: real, but for another address;
- *the certificate isn't valid*: broken in some other way;
- and *the secure connection (TLS) failed*, when the problem isn't the certificate at all (say, an https address pointing at a plain http server).

**It's always the site's failure.** The site answered, and its answer was wrong. So it's a red bar that counts towards an incident, never a grey "couldn't check" gap.

**It trusts exactly what your computer trusts.** No build of the monitor can be told to trust anything more. The tests need to trust a test authority, so there's a special test-only version of the checker, and it simply doesn't exist in the program you run. A test proves the real one refuses even the test server's perfectly valid certificate.

**The Guide explains every message**, word for word, with what to do about it.

## How it works (the short version)

**The real reason was buried four layers deep.** The HTTP library's error holds a connection error, which holds an I/O error, which holds another I/O error, which finally holds the actual reason: "expired", "unknown issuer" and so on. The standard way of walking down a chain of errors skips exactly the layer we need, so the monitor opens each layer by hand until it finds the certificate's own complaint. I printed the whole chain from a real failed handshake before writing a line of it.

**A test server that fails on purpose, properly.** It makes certificates in memory every time it starts: a valid one, an expired one, one not valid until the year 2999, one for the wrong name, a self-signed one, and a chain with a missing middle. Every test does a real TLS handshake against it.

## Does it actually work?

**Each problem, through a real handshake.** Expired, not yet valid, wrong name, self-signed, a server that doesn't speak TLS at all: each comes back as a failure with exactly its words, a latency, and no HTTP status (no HTTP was ever spoken).

**The missing middle certificate.** This is the most common certificate mistake in real life, and a sneaky one: some browsers quietly fetch the missing piece themselves, so the site looks fine in one browser and broken everywhere else. I checked what really happens before deciding what to say: a server that sends only its own certificate fails as "isn't signed by an authority this monitor trusts", and the same server sending the full chain passes.

**Behind it:** 441 tests, and 10 clean runs of the whole suite in a row. A tool planted 38 small bugs in the new code: 7 didn't compile, the tests caught 30, and one slipped through. Once a test was done with the fake certificate server, the server would have kept listening. That's harmless today, but now a test proves it stops. A second AI agent built this step in its own copy of the code while I worked on the steps before it. I read every line, and ran every check again on top of those steps.

## Where I messed up

**I wrote "like a browser checks them".** The README said the monitor checks certificates like a browser does. For the missing-middle case, that's exactly wrong: browsers can fill the gap, the monitor (like most programs) doesn't. Now it says "checked strictly", and a test makes sure the old sentence never comes back.

**A planted bug that never got planted.** To prove the tests can fail, I break the code on purpose and watch a test go red. One time I aimed at the wrong line, nothing changed, and the tests "passed". Now every planted bug is confirmed in place before the result counts.

## What it doesn't do yet

- **No warning before a certificate expires.** It tells you once it has. "Expires in 7 days" is a good idea for later.
- **No revocation checks.** The checker has no list of revoked certificates, so it never says "revoked"; that's honest about what it can see.

## Up next

**Checkpoint 2.9: tested against a real backend, at scale.** A real web server that fails in fifteen different ways on purpose, a judge that knows exactly what really happened, and a hundred monitors at once. It has already found one bug.
