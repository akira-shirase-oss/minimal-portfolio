+++
title = "Adapting an existing model"
description = "Fix a model's failure three ways — freeze, retrain the base, or train a small removable adapter — and compare what each one costs."
date = 2026-11-11
updated = 2026-11-11
weight = 8

[extra]
kind = "chapter"
chapter = 8
status = "first adapter-vs-fine-tune contrast executed on the preserved failed gate; real LLM adapter training still ahead"
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
