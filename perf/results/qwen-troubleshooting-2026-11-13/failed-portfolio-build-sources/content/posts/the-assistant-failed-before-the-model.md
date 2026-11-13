+++
title = "The assistant failed before the model got a turn"
description = "A small troubleshooting tool worked offline. The real assistant could not reach Ollama. Those are different results."
date = 2026-11-13

[extra]
kind = "failure"
+++

I wanted my local assistant to explain a failed build. It could not even reach
the model.

The old runner reported `TypeError: fetch failed`. That leaves several
possibilities open: an unavailable server, a timeout, or missing permission to
connect. This run stopped while checking Ollama's version, before a question
reached Qwen. Recording the underlying error made the boundary clearer:
`EPERM`, an access failure in this execution environment.

That gives me no evidence about how well the 8B model answers this question.

## The small piece that did run

I added one read-only tool beside the project-note lookup. It reads a saved
build result. The record is explicitly synthetic: a broken internal link stops
`zola build`, so deployment never starts. It is a teaching fixture, not a claim
about the live portfolio.

The reader can simulate being temporarily unavailable. Scripted test code read
the note, received that temporary error, then retried and obtained the
failed-build record. Ten local checks passed.

**Getting the record successfully does not mean the build in it succeeded.**
The assistant needs to preserve that distinction in its answer.

Qwen did not choose these test calls. The real inference attempt remained
blocked. The next run must show whether the model reads both records,
describes the failure accurately and handles the temporary error appropriately.

## What saving money will have to mean

The goal is an 8B model useful for specific jobs, with measured cost per
acceptable result. A fast error is no bargain if the job never gets done.
Retries, corrections, fallback calls, training and operating costs belong in
the comparison too.

For now, the result is a checked tool and an unresolved runtime boundary.
No weights changed and no savings were measured. The [chapter's dated step
record](@/learn/model-engineering/the-harness-around-the-model.md#use-case-1-saved-build-troubleshooting-13-november)
keeps the criteria, commands, evidence and next experiment together.
