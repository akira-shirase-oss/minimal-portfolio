+++
title = "Checkpoint 0.4: a test server that fails on purpose"
description = "Eight ways for a server to misbehave, written by hand in Rust, and why dropping one value shuts all of them down."
date = 2026-10-14T12:40:00Z

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.4"
short_title = "A test server that fails on purpose"

[extra.summary]
goal = "Give the monitor something real to fail against: healthy, broken, slow, silent or rude, on demand."
built = "A separate test-server crate with 8 failure routes, a demo binary and a connection counter."
proof = ["14 new tests, 12 over real TCP with real timing", "3/3 mutants caught", "0 clippy warnings"]
code = "68c2359"
+++

To test a monitor, you need something to break: on demand, exactly the same way, every time.

Mocks won't do. A monitor's hardest bugs live in timing and in half-finished conversations: a server that accepts your connection and then never says a word, or one that promises 1,000 bytes and sends 16. You only see those over a real socket.

## What I built

A small HTTP server whose only job is to misbehave. Each path is a different failure:

- `/healthy`: 200, a short body.
- `/error`: 500.
- `/status/{code}`: any status from 200 to 599, e.g. a valid but unexpected one.
- `/hang`: reads your request, then says nothing. Ever.
- `/slow-headers/{ms}`: waits, then answers.
- `/stall-body`: promises 1,000 bytes of body, sends 16, then goes quiet.
- `/big-body`: 1 MiB, 16× more than the monitor will ever read.
- `/close-early`: hangs up without sending a byte.

There's also a helper that returns a port nobody is listening on (the "stopped server" case), a counter of accepted connections, and a small binary that serves all of it for manual demos.

It lives in **its own crate**, in a Cargo workspace next to the monitor. Test code can never end up in the monitor's binary that way, because it's not even the same package.

## How it works

It speaks just enough HTTP/1.1, written by hand on a raw `TcpListener`. A framework would helpfully answer, time out or tidy up for me, which is exactly what I don't want. Here, `/hang` really hangs.

The interesting part is shutting it down. A test that leaves a hanging connection behind would leak it into the next test. So every connection runs as a task inside a `JoinSet` that the server task owns:

```rust
let mut tasks = JoinSet::new();
loop {
    match listener.accept().await {
        Ok((stream, _peer)) => {
            connections.fetch_add(1, Ordering::SeqCst);
            tasks.spawn(handle(stream));
        }
        Err(_) => tokio::time::sleep(Duration::from_millis(10)).await,
    }
    // ...
}
```

The chain of ownership does the rest:

- the test owns the `Fixture`;
- the `Fixture` owns the server task;
- the server task owns the `JoinSet`;
- the `JoinSet` owns every connection.

Drop the fixture and its `Drop` aborts the server task. That drops the `JoinSet`, and dropping a `JoinSet` aborts every task in it (I checked the tokio 1.53 source: `join_set.rs`, line 591). One value goes out of scope, and every connection closes. No shutdown flags, no bookkeeping.

The connection counter is an `Arc<AtomicUsize>`: the server task holds one handle and increments it, and the fixture holds another and only reads it. In the next checkpoint it proves that one check opens exactly **one** connection.

## Proof

12 of the tests talk to the server over real TCP and check the bytes *and* the timing:

- `/hang` sends nothing for 300 ms, and the connection is still open.
- `/stall-body` sends the promised `Content-Length: 1000`, then exactly 16 bytes, then silence.
- `/big-body` delivers exactly 1,048,576 bytes.
- Dropping the fixture ends a connection that was stuck on `/hang`.

And the demo, with plain `curl`:

```
/healthy       → 200
/error         → 500
/status/404    → 404
/close-early   → empty reply (curl exit 52)
/hang          → still nothing after 1 s (curl exit 28)
/big-body      → 1048576 bytes
```

Then I broke it on purpose, three times:

- Made `/hang` answer: **2 tests failed**.
- Made `/stall-body` promise only what it sends: **1 test failed**.
- Spawned connections with a detached `tokio::spawn` instead of the owned `JoinSet`: **the "dropping ends connections" test failed**. That's the proof that ownership is doing the shutting down.

## What went wrong

**A mutant that didn't count.** My first try at that last mutant didn't compile: with no `tasks.spawn` call left, Rust couldn't infer what the `JoinSet` holds. A compile error proves nothing about the tests. Naming the type (`JoinSet<()>`) gave a mutant that compiled, and the test caught it.

**A clippy surprise.** I had told clippy to allow `unwrap()` in tests. That covers `#[test]` functions, but not the plain helper functions in a test file, so I got nine warnings. The fix is one explicit, commented `#![allow]` at the top of that file.

## The honest part

- It answers every HTTP method the same way. There's no special case for `HEAD` yet.
- "A port nobody is listening on" is found by opening a free port and closing it again. Another program could grab it in between; on a dev machine, that's very unlikely.
- The "nothing happens" tests wait 300 ms. On a heavily loaded machine, that's the kind of number that can make a test flaky. I'll watch for it.

## Next

**Checkpoint 0.5: the probe itself.** One bounded HTTP check against this server, for the four M0 cases: 200, 500, a hang and a stopped server. Each must be classified correctly within its deadline, using exactly one connection.
