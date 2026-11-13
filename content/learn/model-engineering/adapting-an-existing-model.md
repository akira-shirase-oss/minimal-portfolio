+++
title = "Adapting an existing model"
description = "Fix a model's failure three ways — freeze, retrain the base, or train a small removable adapter — and compare what each one costs."
date = 2026-11-11
updated = 2026-11-13
weight = 8

[extra]
kind = "chapter"
chapter = 8
status = "first adapter-vs-fine-tune contrast executed on the preserved failed gate; Qwen's weight file inspected; real LLM adapter training still ahead"
+++

A model that fails a check has options: change nothing, retrain its own weights, or leave the weights frozen and teach a small add-on the fix. This chapter runs all three on the **same preserved failure** and compares what each one costs — because the interesting difference is not the answer, it is the mechanics.

## The patient

From the earlier [validation gate](@/learn/model-engineering/our-first-training-loop.md), we kept a failed candidate: weight **2.992**, trained only on input 2 → target 6. Under the declared rule (every required case within absolute error 0.05):

| Input → target | Prediction | Abs. error | Pass? |
|---|---|---|---|
| 1 → 3 | 2.992 | 0.008 | yes |
| 2 → 6 | 5.984 | 0.016 | yes |
| 10 → 30 | 29.92 | **0.08** | **no** |

One failure, honestly preserved. Now fix it three ways.

## Three fixes, one failure

**Frozen baseline** — change nothing. Still fails, as expected.

**Full fine-tune** — train the base weight itself on the new case (one step, learning rate 0.005): `w` moves 2.992 → **3.0**. All three cases now pass. But the old weight is gone — revert only if you saved a copy first.

**Adapter** — freeze the base weight, add a new parameter `δ` starting at 0, and train *only δ* on the new case. It learns δ = **0.008**, making the effective weight 2.992 + 0.008 = 3.0. Same gate result.

| Approach | What changed | Gate | Way back to baseline |
|---|---|---|---|
| Frozen baseline | — | fails | — |
| Full fine-tune | base weight → 3.0 | passes | need a saved backup |
| Adapter (w frozen + δ) | new param δ → 0.008 | passes | **remove δ → exact baseline** |

The adapter's special property, verified in the recording: switching it off reproduces the baseline's predictions *exactly* — no backup needed, because the base never moved.

## What this teaches

- **Same destination, different mechanics.** Both trained fixes pass; they differ in *what gets edited*. Full fine-tune writes into the model's own weights. An adapter writes into a small add-on sitting next to frozen weights.
- **Freezing buys reversibility.** The failed/adapted/baseline versions can coexist — you can compare, roll back, or swap adapters per task without retraining anything.
- **Smaller trained surface, cheaper training.** One new parameter vs editing the base. At real scale that is the difference between a small add-on file and another multi-gigabyte model copy.
- **Honest limit:** our δ still changes the answer for *every* input — adapters are **modular, not task-selective**. And this is a one-parameter toy: real adaptation has many more moving parts.

## Where LoRA fits

This is the idea behind **LoRA** (Low-Rank Adaptation), the standard way people adapt large models: keep the base model's billions of weights frozen, train a tiny add-on for each big layer, and merge or swap it at use time. Less memory and compute than full fine-tuning, base model preserved — same mechanics as our δ, just much bigger numbers.

## Evidence and limits

The recorded run is [`perf/results/adapter-demo-2026-11-11.json`](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/adapter-demo-2026-11-11.json) with the [lab source snapshot](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/adapter-demo-2026-11-11-sources). It is a one-parameter teaching contrast — **no LLM adapter training has run**. Adapting Qwen locally would need a suitable framework and a measured memory check; neither has been done here yet.

## Qwen's real weight file, 13 November

Could we just edit Qwen's weights to make it better? To answer that, we read the
headers of the local weight file (the [saved inspection](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/qwen-weights-header-2026-11-13.json)).
No numbers were loaded or changed.

- One file of **4,607,835,174 bytes**, holding **907 tensors**. A tensor is a
  named block of numbers: 254 hold packed 4-bit weights, 653 hold 16-bit values.
- One example, the first layer's `mlp.gate_proj`, is a grid of
  **12,288 × 4,096 = 50,331,648** weights.
- Each weight is stored as a whole number from 0 to 15 (4 bits), with eight
  packed into each 32-bit slot: 512 slots × 8 = 4,096 columns. Each group of 64
  weights shares one scale and one offset, so
  **real value ≈ stored number × scale + offset**.

**Why hand-editing fails.** No single number means "use the right tool." A
skill is spread across millions of weights, and only the training loop from
chapters [2](@/learn/model-engineering/gradients-and-weight-updates.md) and
[3](@/learn/model-engineering/our-first-training-loop.md) says which ones to move,
and which way. It measures the loss, follows the gradient and makes small
updates, here across millions of weights at once.

**Why the 4-bit file stays frozen.** Sixteen possible levels per weight are too
coarse to hold the small nudges training makes. Overwriting the file would also
destroy the baseline every comparison needs.

**What LoRA adds instead.** For that one grid, a rank-8 LoRA trains two thin
matrices: 12,288 × 8 + 8 × 4,096 = **131,072 new values**, about **0.26%** of
the grid's 50.3 million. They live in a separate adapter file. Removing it
restores the original exactly, as our one-parameter δ did above. "Rank 8" is
the width of the thin matrices: the size of the bottleneck the change has to
pass through.

The installed MLX-LM has a LoRA trainer (`mlx_lm lora`), which reads training,
validation and test files and can resume from a saved adapter. We have only
read its help text. No training has run, and whether training fits in this
Mac's memory is still unmeasured. A real adapter also needs reviewed examples,
separate test cases and an unchanged baseline to compare against. The
[harness chapter](@/learn/model-engineering/the-harness-around-the-model.md#reading-one-request-then-making-it-faster-13-november)
is now collecting real failures that can become those examples.
