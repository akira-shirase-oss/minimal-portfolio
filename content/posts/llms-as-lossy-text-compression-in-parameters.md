+++
title = "How LLMs compress text into parameters"
description = "Training an LLM squeezes trillions of tokens into a fixed weight file. Seeing parameters as lossy compression explains hallucinations and tool use."
date = 2026-11-26T09:55:00-05:00

[taxonomies]
tags = ["ai", "architecture"]
+++

A `.zip` file shrinks a folder of text and gives you back every single byte unchanged. A JPEG shrinks a photo by throwing away tiny details you usually won't miss—and when you zoom in too far, sharp edges turn into blurry guesses.

An LLM weight file is closer to a JPEG than a `.zip`.

When I inspected the local Qwen 8B model sitting on my Mac for [Chapter 8 of the model-engineering track](@/learn/model-engineering/adapting-an-existing-model.md#qwen-s-real-weight-file-13-november), the entire model was one file: **4,607,835,174 bytes** (~4.6 GB), holding 907 tensors. There is no hidden database inside that file and no internet connection behind it. Everything the model learned from trillions of tokens of training text lives inside those 4.6 gigabytes of numbers.

Once you see parameters as **lossy text compression**, half the mysteries around LLMs—why they generalize, why they hallucinate, why quantization works, and why you still need databases and tools—fall into place at once.

## Why predicting the next token *is* compression

Compression and prediction are the same math viewed from two sides.

Suppose you want to transmit a sentence using as few bits as possible, and both sender and receiver share a predictor that guesses the probability `p` of each next token:

| Predictor's confidence (`p`) | Bits needed (`-log2(p)`) | What it means |
|---|---|---|
| 99% (`0.99`) | **0.014 bits** | Practically free—the model already expected this word |
| 50% (`0.50`) | **1.00 bit** | A coin flip |
| 1% (`0.01`) | **6.64 bits** | Surprise—costs lots of bits to encode |

With arithmetic coding, any next-token predictor turns directly into a compressor whose output size is the sum of `-log2(p)` across every token. That sum is **cross-entropy loss**—the exact number the training loop tries to shrink (covered step by step in [weights, predictions, and loss](@/learn/model-engineering/weights-predictions-and-loss.md) and [gradients and weight updates](@/learn/model-engineering/gradients-and-weight-updates.md)).

DeepMind's 2023 paper *Language Modeling Is Compression* (Delétang et al.) made this literal: hook an LLM's token probabilities to an arithmetic coder and it compresses raw text better than `gzip`. A model that gets better at predicting text is, mathematically, a better compressor of text.

## Why the file forces the model to learn rules

Here is the constraint that makes training interesting: **the training corpus is vastly larger than the weight file.**

A modern base model sees trillions of tokens—tens of terabytes of raw text—and has to pack what it learns into a few gigabytes of parameters. It physically cannot memorize the dataset verbatim.

To keep shrinking the loss inside a fixed byte budget, the weights have to discover **shared structure**:

- Memorizing every English sentence separately is impossible. Learning grammar lets a small set of weights predict millions of sentences you've never seen before.
- Memorizing every `for` loop in GitHub is impossible. Learning how Rust ownership or SQL joins work lets the same weights predict code in brand-new repositories.
- Memorizing every arithmetic problem fails. Learning place value and carry rules compresses infinite problems into a tiny circuit.

Generalization isn't magic bolted onto the side of training—it's what happens when a compressor runs out of room for brute-force memorization.

## The capacity ceiling—and why hallucinations happen

Lossy compression has a hard budget. Research measuring factual storage capacity (*Physics of Language Models: Part 3.3*, Allen-Zhu & Li, 2024) found that standard transformer models hold roughly **~2 bits of arbitrary factual knowledge per parameter** across sizes and architectures.

Do the rough math on an 8-billion-parameter model:

```text
8,000,000,000 parameters × ~2 bits/parameter ≈ 16 billion bits ≈ 2 GB of raw facts
```

That's enough to absorb broad world knowledge, syntax, idioms, and common libraries cleanly. It is nowhere near enough to store every obscure API flag, every private database row, or every minor historical footnote without collisions.

When you ask a lossy compressor to decompress a rare fact that got squeezed out during training, it doesn't throw a `404 Not Found`. Just like a heavily compressed JPEG fills in a blurry brick wall with plausible brick texture, the model outputs the highest-probability **plausible continuation**—a fluent, confident hallucination.

## Layer two: compressing the parameters themselves (quantization)

On a laptop, there is a *second* layer of lossy compression on top of training.

During training, weights are usually stored in 16-bit floating point (2 bytes per parameter—an 8B model would take ~16 GB). In the local 4-bit Qwen file I inspected (`model.safetensors`), the weights were compressed again:

- A single matrix like layer 0's `mlp.gate_proj` has **12,288 × 4,096 = 50,331,648 weights**.
- Instead of 16 bits each, every weight is quantized to a whole number from **0 to 15 (4 bits)**, with eight weights packed into one 32-bit integer.
- Each group of 64 weights shares one 16-bit `scale` and one `offset`, so the runtime reconstructs `real value ≈ stored number × scale + offset`.

That shrinks the file down to **4.6 GB**—small enough to run locally on a Mac—while keeping most of the model's language and reasoning structure intact, because the broad patterns spread across millions of weights survive coarse rounding far better than isolated memorized details do.

## The engineering rule this gives you

Treating model parameters as a lossy compressor immediately clarifies how to design real software around an LLM:

| What you need | Put it in weights? | Why |
|---|---|---|
| Language, summarization, code patterns, tool selection | **Yes** | Shared structure compresses well and survives quantization |
| Exact IDs, current inventory, live row counts, user permissions | **No — use tools / DB** | Arbitrary, changing facts waste parameter capacity and blur on recall |
| Domain docs that change every week | **No — use retrieval (RAG)** | Re-compressing weights for every edit is slow and irreversible |

That's the exact split we follow in [the harness around the model](@/learn/model-engineering/the-harness-around-the-model.md) and why bugs like [The model never called my function](@/posts/the-model-never-called-my-function.md) matter so much: the model's job is to understand intent and propose structured actions; your database and code stay the lossless source of truth.

## Frequently asked questions

**Does an LLM literally contain compressed copies of its training text?**
No—there is no lookup table or zip archive inside a `.safetensors` file. The training text is distilled into billions of numeric weights adjusted by gradient descent so the model assigns high probability to likely continuations. Very frequent passages can still be recalled nearly verbatim, while rare details blur or vanish.

**If smaller quantization compresses weights further, why doesn't a 4-bit model immediately break?**
Skills like grammar and syntax are distributed across millions of weights working together, so rounding each individual weight to 16 levels (with per-group scales) adds small noise that largely averages out. The first things to degrade are usually exact rare-fact recall and delicate multi-step formatting.
