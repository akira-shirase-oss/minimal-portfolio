+++
title = "The bug hiding in the \"nothing to do\" path"
description = "Colophon's crash-resume test caught a bulk job stuck 'running' forever — only when every item had finished before the crash. The empty path was the one path that never checkpointed."
date = 2026-11-05T10:00:00Z
+++

Crash bugs usually hide in the messy middle — half-done batches, partial writes.

This one hid in the cleanest possible state: everything already finished.

## The setup

Colophon's bulk jobs are resumable. A job is a manifest of exact item IDs; each item's outcome lives in Postgres; a worker claims pending items under leases. Kill the worker and another sweep picks the job up — finished items get skipped by their outcome rows, so nothing ever duplicates.

The drive loop, roughly:

```
loop {
    items = due_items(job)          // what still needs doing
    if items.is_empty() { break }   // nothing to do — leave
    process(items)
    checkpoint(job)                 // record progress / terminal state
}
```

Read it and it looks right. `break` on empty is obviously correct — there's nothing to checkpoint when there's nothing to do.

Except "nothing to do" is itself a state that has to be recorded.

## The failure

Watch the sequence:

1. Job runs; every item resolves.
2. Worker crashes *after* the last item commits but *before* the checkpoint that marks the job `done`.
3. On restart, `due_items` returns empty — correctly. Everything did finish.
4. The loop `break`s without checkpointing.
5. The job sits `running` **forever**.

It's finished, it will never change, and no sweep will ever close it — every future scan hits the same empty set and leaves.

The bug only fires when a job is *completely* done at crash time. Any unfinished item keeps the loop alive and the checkpoint lands. Which is exactly why nobody saw it: you don't mentally trace the path where nothing happens.

## The fix

One line: `checkpoint(job)` before the `break` — what the migration drive already did on the same shape of loop.

No new logic needed. The job's own checkpoint already knows "no pending items + all terminal = done." The fix was calling it on the path that skipped it.

The test (F06) kills a real worker process at a named fault point mid-job, restarts it, and waits for a terminal state. Before the fix, the job sat `running` past the deadline. After: it closes cleanly, nothing duplicated.

## The pattern

The dangerous branch in any loop is the one that exits.

Happy paths get traced because they do things. Exit paths get skimmed because they don't. But an exit that skips a state transition doesn't just leave early — it leaves *wrong*, permanently.

Whatever your loop writes at the end of work, check that the "no work" exit writes it too.
