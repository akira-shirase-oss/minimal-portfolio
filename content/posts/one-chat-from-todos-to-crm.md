+++
title = "One chat, starting with a todo"
description = "A local Qwen dashboard, its first real database actions, and a record of the failures before they worked."
date = 2026-11-13
updated = 2026-11-13

[extra]
kind = "experiment"
+++

A row either exists in the database or it does not. That makes “add a todo” a
useful first job for a local model. A confident answer cannot substitute for
the row.

## What I built

A local Qwen dashboard with chat, a task list, saved runs and a model screen.
It starts with creating and reading todos. Customer-management tasks and more
complex workflows can follow, while the old cases stay available to rerun.

The interface now has a black sidebar, white screens, sans-serif fonts and no
application text smaller than 14px. Each new query has an expandable processing
record, including the actual prompt, model responses, validation, database work,
token counts and timings.

## How it works (the short version)

Hugging Face supplies the pinned Qwen3-8B files. MLX runs the 4-bit conversion on
this Mac, without Ollama or a hosted inference API. The model proposes a function
call; our code checks its arguments and uses SQLite to save the task. Qwen then
receives the saved result before writing its answer.

The surrounding code is the **harness**. It supplies context, defines the tools,
limits calls and records what happened. This is application work around the
model. No weights were fine-tuned in this build.

## Does it actually work?

Twenty-five automated checks passed with scripted model responses. Those test
the program, including duplicate writes, malformed arguments and an answer
failing after a task has already been saved.

The real model also ran. A direct Python smoke answered `READY.`. Four actual
development queries then created `Inspect query breakdown` as row #2, listed the
two saved tasks, asked for a missing title, and refused an unsupported delete.
Only the create changed the database. The recorded answers agreed with those
narrow expectations.

The create took about 3.776 seconds in this observed run. Almost all the elapsed
time was in the model calls; SQLite's operation took about 0.87 milliseconds.
That is a useful place to start investigating waiting. It is one example, not
an average-latency benchmark or proof of savings.

## Where I messed up

The first server launches failed with a permission error. Trying another port
produced the same error. The install also failed while the execution environment
could not resolve PyPI or Hugging Face. Changing model settings would not have
fixed either boundary. After workspace access changed, installation, download
and local serving succeeded.

A later status probe hit another small trap: MLX returned HTTP 200 with an empty
body from its model-list endpoint. The dashboard now uses the health endpoint
and shows the pinned download manifest separately. A healthy endpoint does not
prove which weights it loaded.

The first dashboard pass also had small labels and green accents. Feedback made
the next change straightforward: black, white, and readable text throughout.
These intermediate failures and changes are preserved in the step record.

## What it doesn't do yet

Update, delete and CRM tools are not implemented. The four real queries are
known development cases, not unseen evaluation. No adapter training, peak-memory
measurement, first-token timing or total-cost comparison has run. A saved task,
recent conversation context and a trained weight are different kinds of memory.

## Up next

Read one real query trace together, then add update/delete using exact task IDs.
Keep the existing create/list checks when the tools grow. If deletion becomes
available, preserve the original refusal result and add a new expectation for
the new capability.

The [chapter's dated record](@/learn/model-engineering/the-harness-around-the-model.md#a-running-dashboard-and-query-breakdown-13-november)
contains each step, the actual outputs, limitations and revision notes. The
[source and synthetic run records](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-dashboard-2026-11-13)
exclude personal chat history and downloaded model weights.
