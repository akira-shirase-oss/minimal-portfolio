+++
title = "Checkpoint 2.3: nothing outlives the run"
description = "A PendingCounts snapshot taken the moment before the isolate drops — abandoned timers, in-flight ops and open resources are counted, reported, and then destroyed with the runtime. Leaks are seen, never silently dropped."
date = 2026-11-07T21:00:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.3"
short_title = "Retained resources"
tests = 34

[extra.summary]
goal = "Teardown that is complete and provable — what a script leaves open is enumerated before the isolate dies, and nothing runs afterward."
built = "run_file_report/run_source_report return a RunReport { result, pending } — PendingCounts captured from deno_core's activity tracker (timers/intervals/ops/resources) just before drop; rt.pendingTimers() gives scripts the same view."
proof = ["host tests: two abandoned unref'd timers → pending.timers=2 (a cleared one isn't counted); pending interval → still named on a Terminated report; second run in the same process → unaffected", "script-side: pendingTimers() counts 1 after scheduling, 0 after clearing"]
code = "akira-shirase-oss (local, not yet pushed) · afbbef4"
+++

The last M2 step is the one that makes teardown a *property* instead of a
hope. Three questions: can the host see what a script left open, does that
leftover die with the runtime, and could it interfere with the next run?

**Seeing comes first.** deno_core tracks activity — timers, intervals,
in-flight ops, open resources — for its own test sanitizer. `RunReport`
captures a snapshot of that tracker the moment before the isolate drops:
`run_file_report`/`run_source_report` return the outcome plus a
`PendingCounts`. Scripts get their own view through `rt.pendingTimers()`,
counting the ids they still own. A leak is *seen* — that's the whole
contract; silent leaks are how runtimes slowly die in production.

**Then dying.** An unref'd timer abandoned at 60s shows `pending.timers=2`
alongside its sibling (and a *cleared* one correctly counts for nothing —
cancellation is real, not cosmetic). A pending interval that holds the loop
dies to the watchdog — and the `Terminated` report still names the interval
that was in flight when it died, so the evidence survives the kill. Then
the isolate drops everything: the pending timers can't fire into nothing,
because their reactor died with the runtime.

**And the proof of completeness:** a second `run_source` in the same
process, same tokio runtime, runs clean. Zombie work — a timer task that
outlived its isolate, a fetch that kept polling — would show up there as
interference or a hang. It doesn't.

**Lesson:** teardown has two failure modes — work that keeps running after
the runtime's gone (a zombie), and work nobody ever counted (a leak).
`PendingCounts` handles the second; the isolate-drop handles the first. You
need both, and each is cheap precisely because the tracking was built in
from the start.
