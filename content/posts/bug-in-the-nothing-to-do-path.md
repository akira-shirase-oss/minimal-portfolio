+++
title = "The bug hiding in the \"nothing to do\" path"
description = "Colophon's crash-resume test caught a bulk job stuck 'running' forever — only when every item had finished before the crash. The empty path was the one path that never checkpointed."
date = 2026-11-05T10:00:00Z
+++

Crash-resume bugs usually hide in the messy middle — half-done batches, partial writes. This one hid in the cleanest possible state: everything already finished.

## The setup

Bulk jobs in Colophon are resumable: a manifest of exact item IDs, per-item outcomes in Postgres, and a worker that claims pending items under leases. If the worker dies, another sweep picks the job up and continues — items already done are skipped by their outcome rows, so nothing duplicates.

The drive loop looks roughly like:

```
loop {
    items = due_items(job)          // what still needs doing
    if items.is_empty() { break }   // nothing to do — leave
    process(items)
    checkpoint(job)                 // record progress / terminal state
}
```

Review that and it reads fine. `break` on empty is obviously right — there's nothing to checkpoint when there's nothing to do.

Except "nothing to do" is itself a state that must be recorded.

## The failure

Sequence:

1. Job runs, all items resolve successfully.
2. Worker crashes *after* the last item commits but *before* the checkpoint that marks the job `done`.
3. On restart, `due_items` returns empty — correctly. Every item did finish.
4. The loop `break`s without checkpointing.
5. The job stays `running` **forever**. It's finished, it will never change, and no sweep will ever close it — every future scan hits the same empty set and leaves.

The bug only exists when a job is *completely* done at crash time. Any unfinished item keeps the loop alive and the checkpoint eventually lands. So the failure needs the best-case data to trigger — which is why it read correctly: the empty path is the one you don't trace mentally.

## The fix and the test

One change: on the empty-items path, `checkpoint(job)` before breaking — exactly what the migration drive already did on the same shape of loop. The job's own checkpoint logic decides "no pending items + all items terminal = done," so the fix is calling it, not teaching it.

The crash test (F06 in `tests/faults.rs`) kills a real worker process at a named fault point mid-job, restarts it, and asserts the job reaches a terminal state with no item duplicated. Before the fix: the job sat `running` past the test's deadline. After: it closes cleanly.

Two lines of difference, found only because the test uses a real crash on a real process — a mock "worker" would have happily skipped the path too.

## The pattern worth keeping

The dangerous branch in any loop is the one that exits. Happy paths get traced because they do things; exit paths get skimmed because they don't. But an exit that skips a state transition doesn't just leave early — it leaves *wrong*, permanently. Whatever your loop checkpoints at the end of work, check whether the "no work" exit takes the same turn.
