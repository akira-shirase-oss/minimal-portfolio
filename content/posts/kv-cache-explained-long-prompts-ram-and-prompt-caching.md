+++
title = "KV cache explained: why long prompts eat RAM"
description = "Every new token an LLM generates has to attend to every previous token. The KV cache saves compute by trading RAM—and explains how prompt caching works."
date = 2026-11-27T12:25:00-05:00

[taxonomies]
tags = ["ai", "architecture", "reliability"]
+++

When you run a local 4.6 GB Qwen model on a Mac—like we do in [the harness around the model](@/learn/model-engineering/the-harness-around-the-model.md)—the weight file size stays constant. Yet feed the model a 32,000-token conversation and suddenly memory climbs by gigabytes and every reply slows down.

The weights didn't grow. What grew is the **KV cache**.

Understanding what the KV cache stores explains three things every engineer runs into: why long context windows blow up RAM, why "time to first token" feels different from streaming speed, and why **prompt caching** cuts both latency and API bills dramatically.

## The problem: generating one token at a time

An autoregressive transformer writes one token per forward pass:

1. Read tokens `1..100` → predict token `101`.
2. Read tokens `1..101` → predict token `102`.
3. Read tokens `1..102` → predict token `103`.

Inside every attention layer, each new token computes a **Query (Q)** vector and compares it against the **Key (K)** and **Value (V)** vectors of *every earlier token* (we built the tiny one-layer version of this in [Chapter 6](@/learn/model-engineering/from-text-to-a-tiny-language-model.md#reading-the-whole-prefix-attention)).

Notice what doesn't change between step 1 and step 2: the **K** and **V** vectors for tokens `1..100` are **identical**. Recomputing them from scratch on every single output token would turn generating `N` tokens into `O(N^2)` wasted matrix multiplications.

## The trade-off: cache K and V in RAM

Instead of recomputing past tokens, the inference engine stores every token's **K** and **V** vectors for every layer in memory. That buffer is the **KV cache**.

Now generation splits into two very different phases:

| Phase | What happens | Bottleneck | What you feel |
|---|---|---|---|
| **Prefill** | Process all prompt tokens in parallel, filling the KV cache | **Compute** (GPU/NPU FLOPs) | Time to first token (TTFT) |
| **Decode** | Generate 1 new token at a time, reading the entire model + KV cache | **Memory bandwidth** | Tokens per second (streaming speed) |

That explains why a 50,000-token prompt pauses for seconds before printing a single word (prefill compute), and why even after it starts streaming, a huge context streams slower than a short one (every generated token has to read the whole KV cache out of RAM).

## Why KV cache eats memory so fast

Every single token in your context adds K and V vectors across **every layer** of the model:

```text
KV bytes per token = 2 (K and V) × num_layers × num_kv_heads × head_dim × bytes_per_value
```

Modern models shrink this heavily using **Grouped-Query Attention (GQA)**—sharing fewer KV heads across many query heads—and **Multi-Head Latent Attention (MLA)** or sliding windows. Even with GQA, a long context adds up quickly:

- At 16-bit precision with ~32 layers, 8 KV heads, and 128 head dim, one token takes `2 × 32 × 8 × 128 × 2` = **131 KB per token**.
- At 1,000 tokens: ~**131 MB**.
- At 32,000 tokens: **~4.2 GB**—almost as large as our entire 4-bit quantized 8B weight file (`4.6 GB`)!
- Serve 10 concurrent users with 32k contexts on one server, and your KV cache alone wants **~42 GB** of VRAM.

## Why prompt caching works (and how you accidentally break it)

When you run a multi-turn chat or tool-calling loop, the first 90% of your prompt is usually identical on every turn: the system prompt, tool schemas, and earlier conversation turns.

In our own local Qwen trace ([My test said PASS](@/posts/my-test-said-pass.md)), the system prompt and just two tool schemas made up most of the 922 input tokens resent on every call. **Prefix / prompt caching** simply keeps the computed KV cache for that shared prefix in memory across requests so the engine skips prefill for everything that didn't change.

There is one strict rule because attention is causal (every token depends on *everything before it*):

**Prefix caching only matches from byte 0 up to the first changed token.**

If you put a changing timestamp (`Current time: 12:04:31`), a random request ID, or a dynamically sorted list of tools at the *top* of your system prompt, you invalidate the entire KV cache on every single turn and pay full prefill latency and cost every time.

## Three practical rules for your own apps

1. **Keep the static prefix strictly at the top:** system instructions → stable tool definitions (in deterministic order) → long reference docs → changing user turn / timestamp at the very end.
2. **Don't stuff unused context into every turn:** extra tokens aren't free—they inflate prefill time, KV RAM, and decode bandwidth on every single output token.
3. **Skip unnecessary model turns altogether:** when deterministic code already knows the answer (like confirming a single DB write), skipping the second LLM call beats even a 100% cache hit.

Pair this with [How LLMs compress text into parameters](@/posts/llms-as-lossy-text-compression-in-parameters.md) and [Why LLMs see tokens instead of letters](@/posts/why-llms-see-tokens-instead-of-letters-bpe.md) for the full mental model from raw text → tokens → weights → KV cache.

## Frequently asked questions

**Is the KV cache shared between two different users?**
Only for identical prefix tokens—such as a shared static system prompt or shared tool definitions—and only if the serving engine explicitly supports cross-request prefix caching (like vLLM Automatic Prefix Caching or provider prompt caching). User-specific turns diverge immediately and have their own KV entries.

**Does quantizing the KV cache hurt quality?**
Quantizing the KV cache from FP16 down to FP8 or INT8 often cuts memory nearly in half with minimal accuracy loss on standard tasks, though aggressive 4-bit KV quantization can degrade exact needle-in-a-haystack retrieval on very long contexts.
