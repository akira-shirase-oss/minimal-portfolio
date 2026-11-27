+++
title = "Why LLMs see tokens instead of letters"
description = "Language models never read raw characters. Understanding Byte-Pair Encoding (BPE) explains counting bugs, weird math failures, and surprise API bills."
date = 2026-11-27T12:20:00-05:00

[taxonomies]
tags = ["ai", "architecture"]
+++

Ask a frontier LLM to explain Rust lifetimes and it writes a clean, accurate essay. Ask the same model how many `r`s are in `strawberry`—or to reverse a random string—and it can stumble like a first-grader.

That isn't because the model is "bad at logic." It's because **the model never sees the letters in the first place.**

Before a single neural-network layer runs, a separate deterministic program—the **tokenizer**—chops your text into integer IDs. In [Chapter 6 of the model-engineering track](@/learn/model-engineering/from-text-to-a-tiny-language-model.md#tokens-are-pieces-of-text), we started with a character-level tokenizer so we could see every piece clearly. Real LLMs almost never use characters. They use subword chunks built with **Byte-Pair Encoding (BPE)**.

## Why not characters—and why not whole words?

You have three ways to turn text into integer IDs for a neural network:

| Approach | Vocabulary size | Sequence length | What goes wrong |
|---|---|---|---|
| **Characters** (`a`, `b`, `c`) | Tiny (~100) | Very long | Attention cost grows quadratically with length; models waste capacity just spelling common words |
| **Whole words** (`apple`, `running`) | Huge (millions) | Short | Every typo, compound word, or new identifier becomes `<UNK>` (unknown) |
| **Subword BPE** (`straw`, `berry`) | Sweet spot (~50k–150k) | Compact | Common words are 1 token; rare words split cleanly into pieces with zero `<UNK>` |

BPE starts from individual bytes (256 base symbols, so it can represent *any* UTF-8 text without failing) and repeatedly merges the most frequent adjacent pair in a training corpus until the vocabulary hits a target size (for example ~100k–150k tokens).

Common English words like ` the` or ` function` become a single integer ID. Uncommon words split into reusable chunks (`un` + `believ` + `able`).

## Four strange LLM behaviours that BPE explains immediately

Once you picture the model receiving `[301, 4821, 912]` instead of `"s-t-r-a-w-b-e-r-r-y"`, four famous quirks stop being mysterious:

### 1. Counting letters and spelling puzzles
If `strawberry` is tokenized as `["str", "aw", "berry"]` (three opaque integer IDs), the model cannot simply scan characters one by one. To count the `r`s, it has to recall from its compressed weights how each integer ID is spelled and add them up in its head. Put spaces between the letters (`s t r a w b e r r y`) so each letter becomes its own token, and the exact same model answers reliably.

### 2. Weird arithmetic failures (`9.11` vs `9.9`, big numbers)
Depending on the tokenizer, `380` might be one token (`380`) while `381` splits into two (`38` + `1`)—or `2026` is a single token while `2027` splits into `20` + `27`. Newer tokenizers force single-digit or 3-digit splits specifically so numbers align more consistently, because arbitrary digit chunking makes column-by-column addition much harder for the weights to learn.

### 3. Trailing spaces break completions
In BPE, leading spaces are usually glued to the *start* of the next word (`" apple"` is one token, distinct from `"apple"`). If your prompt ends with a dangling trailing space (`"Color: "`), you force the tokenizer to emit a standalone space token and then ask the model to predict `"red"` without its usual leading-space token—pushing it off the distribution it saw during training.

### 4. Non-English text and JSON cost more tokens
Because BPE merges frequent pairs from its training mix, common English prose averages ~3.5–4 characters per token. Languages with less representation in the tokenizer's training data—or verbose JSON full of quotes, colons, braces, and indentation—can take **2× to 4× more tokens** for the same meaning. More tokens means higher API cost, smaller effective context windows, and slower generation.

## How this connects to parameters as compression

In [How LLMs compress text into parameters](@/posts/llms-as-lossy-text-compression-in-parameters.md), we saw that training compresses trillions of tokens into a fixed weight file. Tokenization is **stage zero** of that compression pipeline: a lossless, deterministic compressor that shrinks raw UTF-8 bytes by ~3–4× before the neural network ever touches them.

Better tokenizers pack more meaning into fewer tokens, letting the same context window hold far more code or documents—at the cost of hiding character-level detail inside opaque integer IDs.

## Practical habits for engineers

- **Never rely on an LLM to count characters, validate regexes, or sum columns**—run a 3-line function or tool call instead.
- **Trim trailing whitespace** on prompt templates, especially before structured prefixes.
- **Measure real token counts** with your model's actual tokenizer when budgeting prompts (don't assume `chars / 4` holds for minified JSON, UUIDs, or non-English text).

## Frequently asked questions

**Why do newer LLMs solve "how many r's in strawberry" now?**
Partly because reasoning models spell the word out across separate tokens in their scratchpad before counting, and partly because high-profile benchmark examples show up in post-training data. Give the same model a made-up 18-letter string without scratchpad steps, and the underlying tokenizer blind spot still shows up.

**Does a larger vocabulary always make a model better?**
Not for free. Every extra token adds a row to both the input embedding matrix and the final output projection matrix (which has to run a softmax over the entire vocabulary on every generated token). Vocabulary size is a trade-off between shorter sequences and bigger embedding/output layers.
