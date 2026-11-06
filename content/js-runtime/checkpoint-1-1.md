+++
title = "Checkpoint 1.1: every way a run ends, pinned"
description = "Fifteen integration tests drive the real binary through every documented exit class — and caught two real bugs on the way: a parked event loop the watchdog couldn't reach, and op errors that arrived in JS with the wrong class."
date = 2026-11-07T16:30:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.1"
short_title = "Every exit class"
tests = 15

[extra.summary]
goal = "The run lifecycle proven end to end — every exit class reproducible through the real jsrt binary, not just library return values."
built = "crates/jsrt/tests/lifecycle.rs — CARGO_BIN_EXE tests against the compiled binary with tempdir fixtures; a two-stage watchdog (terminate_execution, then a grace period that escalates to process exit); registered CapabilityError/HostError classes so op rejections carry real names."
proof = ["15/15 tests green: exits 0, 2, 3, 4, 5 (thrown + rejected promise), 6 (CPU-bound AND parked event loop), 7, 8 all pinned", "caught-refusal test proves CapabilityError reaches JS with its real name — catchable, inspectable, exit 7 uncaught"]
code = "akira-shirase-oss (local, not yet pushed) · 358677b"
+++

The taxonomy designed on day 0 is now evidence. Fifteen tests run the
*compiled binary* — not the library — through every ending the runtime
documents: clean run, clap misuse, missing file, syntax error, uncaught
throw, rejected promise, CPU-bound kill, parked-loop kill, capability
refusal, host failure. Each asserts its exit code and, where it matters,
what the error actually says.

**The suite caught two real bugs before it could pass.**

*A parked event loop is unkillable by interruption.* `terminate_execution()`
flags executing JavaScript — but a script parked on a never-resolving promise
has no JavaScript executing. The watchdog fired, nothing was running to
terminate, and `run_event_loop` blocked so the tokio backstop couldn't fire
either. The run hung forever at 0% CPU — the first test to fail. The fix is a
second watchdog stage: after termination, a grace period; if the run still
hasn't unwound, the process exits with the terminated code. Honest because
it's the in-process stand-in for exactly what M4's supervisor will do with a
signal — the semantics are right, the boundary just isn't a process yet.

*Op errors arrived with the wrong class.* `readText` outside the manifest
should throw `CapabilityError` — instead JS saw `TypeError:
invalid_argument`. The cause: deno_core builds op-error objects through a
JS callback that looks up a *registered* error class, and ours wasn't
registered — the rejection became garbage. `CapabilityError` and `HostError`
are now real registered classes in bootstrap.js; uncaught, they classify to
exit 7 and 8; caught, `e instanceof CapabilityError` works for scripts.

**Lesson:** the point of pinning the boring table (every exit code, every
class) is that it refuses to let two different failure modes hide behind one
number. Both bugs were silent until a test asked "does exit 6 actually
happen for *this kind* of stuck?"
