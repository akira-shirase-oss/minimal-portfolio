+++
title = "Checkpoint 4.3: a flooded log limits itself and says so"
description = "Per-run JSONL diagnostics under a byte cap — when the next record would overflow, the file rotates and the fresh generation opens by naming how many records it displaced. Bounded output, visible drops."
date = 2026-11-08T00:55:00Z

[extra]
kind = "experiment"
milestone = "M4"
step = "4.3"
short_title = "Bounded diagnostics"
tests = 64

[extra.summary]
goal = "Structured run records that cannot flood the disk — and that never hide that they dropped."
built = "--report FILE appends one JSONL record per supervised run under --report-max-kb; rotation to <name>.1 writes a meta-record first carrying dropped_records."
proof = ["8 supervised runs under a 1 KiB cap → rotation happened, live file bounded, first record of the new generation is type:rotation with dropped_records > 0"]
code = "akira-shirase-oss (local, not yet pushed) · cfbd098"
+++

The supervise report already emits a structured record; M4.3 is the
property that makes it safe to leave on: a log that can grow forever is
a disk-failure scheduled for later, and a log that silently truncates is
a lie with good formatting.

The cap is enforced before each append — if the next record would
overflow, `runs.jsonl` becomes `runs.jsonl.1` and the fresh file's first
line is itself a record: `{"type":"rotation","dropped_records":N,...}`.
The displaced count is *data in the log*, not a convention the reader
has to guess. One generation is kept — this is diagnostics, not an
archive — and a single record larger than the cap is written whole to a
fresh file: boundedness never eats a run's only evidence.

The flood test is the whole claim, stated plainly: 8 supervised runs
under a 1 KiB cap, and the file rotated, stayed bounded, and the new
generation's first record says exactly how many records it displaced.

Also worth stating, because the roadmap demands it: this is a diagnostic
log, not a workflow journal. It answers "how did that run end" for the
operator; it does not promise replayability, ordering guarantees across
crashes, or durable state a script could build logic on. Project 04 owns
that idea when it gets there.

**Lesson:** unbounded observability is a failure mode disguised as a
feature. The correct bound isn't "keep less" — it's "drop visibly, so
the reader always knows the log is a window and not the whole wall."
