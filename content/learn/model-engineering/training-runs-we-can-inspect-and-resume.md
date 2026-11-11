+++
title = "Training runs we can inspect and resume"
description = "What a training run is made of, what goes into a checkpoint, and a proof that a resumed run is identical to an uninterrupted one."
date = 2026-11-11
updated = 2026-11-11
weight = 7

[extra]
kind = "chapter"
chapter = 7
status = "first resumable-run lab executed; interrupt/resume parity proven on a tiny deterministic run; real-model checkpointing ahead"
+++

A training run is not magic. It is a **state** that advances one step at a time — and if you can write that state down, you can stop a run, come back later, and continue exactly where it left off. This chapter makes that visible on the smallest possible run and then *proves* the resume is real.

## What a training run is made of

Our run is the same toy example as before: **prediction = input × weight**, training on input 2 → target 6 with the centered numerical gradient. An 8-step run has a state that is just:

- **step** — how far through the run we are,
- **weight** — the number being learned,
- **settings** — learning rate and gradient probe size,
- **data** — the example being learned from,
- **code identity** — which program produced this state.

A **checkpoint** is a file holding everything the next step needs. Ours is one JSON object containing all of the above plus a hash of the program itself — so a checkpoint refuses to resume under different code or settings instead of silently producing wrong state.

One detail worth noticing: our checkpoint is small *because our update rule is stateless* — each step recomputes its gradient from the current weight alone. Real optimizers like Adam remember past gradients (momentum), so real checkpoints must also save the optimizer's memory. What goes in a checkpoint depends on what your algorithm remembers.

## The experiment

Four separate program invocations in `model-engineering/labs/`:

```sh
node labs/resumable-trainer.mjs full     # all 8 steps, uninterrupted
node labs/resumable-trainer.mjs part1    # steps 1–4, save checkpoint, exit
node labs/resumable-trainer.mjs part2    # load checkpoint, run steps 5–8
node labs/resumable-trainer.mjs verify   # compare the two final states
```

The "interrupt" is honest: `part1` and `part2` are different processes. The only thing that survives between them is the checkpoint file on disk.

## What the recording shows

| Run | Stopped at | Final weight | Final loss |
|---|---|---|---|
| `full` | step 8 | 2.99999744 | ~2.6 × 10⁻¹¹ |
| `part1` (interrupted) | step 4 | 2.9984 | — |
| `part2` (resumed) | step 8 | **2.99999744** | ~2.6 × 10⁻¹¹ |

The resumed run's final weight and loss are **bit-identical** to the uninterrupted run — not approximately equal, exactly equal. All five checks pass: checkpoint saved at step 4, resume continued from 4, identical final weight, identical final loss, and the checkpoint recorded the code hash.

That is the lesson: when a run is deterministic, resumption is *provable*. Same state + same steps = same result, every time. If the finals had differed, the checkpoint would have been missing something — and that is exactly how real resume bugs get caught.

## What this teaches

- **Inspectability means the state is readable.** We can open `checkpoint.json` and see step, weight, settings, and code hash — no hidden state.
- **A checkpoint is a contract.** It must contain whatever the next step needs, and it should refuse to resume when the world around it changed (our code-hash check). Real training stacks save model weights *and* optimizer state *and* random-number state for the same reason.
- **Determinism turns "it looks like it resumed" into a checkable claim.** Production runs add checkpoint schedules, atomic writes, and integrity checks because a corrupt checkpoint discovered after three days is a three-day loss.

## Evidence and limits

The raw run files, checkpoint, and verification are in [`perf/results/resumable-run-2026-11-11/`](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/resumable-run-2026-11-11), with the [lab source snapshot](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/resumable-run-2026-11-11-sources).

Honest limits: this is a deterministic one-weight run with a stateless update rule. Real training checkpoints are bigger (optimizer memory, RNG state, data-loader position), interrupts are crashes rather than polite stops, and resuming a real model is a later experiment — this lab proves the *mechanism*, not production readiness.
