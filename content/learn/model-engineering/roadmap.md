+++
title = "The model-engineering learning roadmap"
description = "The path from one prediction to training, data pipelines, harnesses, evaluation, and better model versions."
date = 2026-11-06
updated = 2026-11-06
weight = 0

[extra]
kind = "roadmap"
status = "plan; changes as I learn"
+++

I want to understand how to build and improve models. Blog writing and personalized email are possible exercises. The concepts need to carry over to other problems too.

The plan has two practical parts. First, build tiny models whose calculations I can follow. Then adapt an existing model and learn how to handle realistic data, training runs, and evaluation. The tiny teaching model and the existing model are separate exercises.

## The path

| Chapter | Question | Planned exercise |
| --- | --- | --- |
| [1. Weights, predictions, and loss](@/learn/model-engineering/weights-predictions-and-loss.md) | What changes when a model learns? | Work through one adjustable weight and its errors, then inspect them in chapter 3's lab. |
| [2. Gradients and weight updates](@/learn/model-engineering/gradients-and-weight-updates.md) | How does the program choose a direction and size for an update? | Direction, overshooting, numerical gradients, and learning-rate updates are worked through. Direct derivatives remain ahead. |
| [3. Our first training loop](@/learn/model-engineering/our-first-training-loop.md) | How do repeated updates become training? | Run a tiny local program, inspect its weights and loss, then measure a fixed candidate against a declared two-case validation rule. Saving and resuming a learned model remain ahead. |
| 4. How learning goes wrong | Did it learn a useful pattern or memorize examples? | Deliberately cause underfitting, overfitting, and unstable updates. |
| 5. Data a model can learn from | How do raw records become trustworthy examples? | Clean and deduplicate a small dataset; separate training, validation, and test data before tuning. |
| 6. From text to a tiny language model | How do text pieces become predictions? | Learn tokens, arrays of numbers, embeddings, attention, and a small transformer through code. |
| 7. Training runs we can inspect and resume | Can we explain and recover a run? | Record settings, data versions, memory use, and checkpoints; interrupt and resume a run. |
| 8. Adapting an existing model | What does fine-tuning change? | Compare an unchanged model with a trained candidate using the same inputs and settings. |
| 9. The harness around the model | What does the surrounding program contribute? | Prepare inputs, retrieve relevant context, validate outputs, and record failures. |
| 10. Evaluation and model promotion | Does this candidate deserve to replace the previous version? | Define acceptance criteria, compare outputs, investigate regressions, and preserve the previous accepted version. |
| 11. Memory, speed, and scale | What do efficiency changes cost in quality? | Measure numerical precision, quantization, batching, latency, and memory tradeoffs. |
| 12. Learning from preferences | Can examples of preferred answers improve behavior? | Build reviewed answer pairs and test whether preference training helps. |

The first three chapter notes are available for revision, including a runnable one-weight example in chapter 3. Program behavior, learning on one training pair, and learner understanding are separate claims. The calculations still ahead are labelled; chapters 4–12 will get pages as we work through them.

## Math alongside the code

We will introduce the math when it becomes useful: multiplication for a prediction, derivatives for an update, arrays and matrix multiplication for layers, and probabilities for language-model output.

Each explanation should define its symbols, use small numbers, show the intermediate steps, and say what the result means. A short prediction before running the code gives me something to compare with the outcome.

## Testing starts with the first experiment

Training data is used to update the model. Validation data helps choose settings and candidate versions. Test data is held back for a final assessment, so repeatedly checking it does not become another way to tune the model.

A successful program run, lower training loss, and a better model are separate things to check. The program might save its files correctly while the model gets worse on unfamiliar examples.

For every experiment, keep the question, starting model, dataset version, settings, code revision, outputs, and failures. If a comparison is uncertain, write that down too.

## Improving a model version

A **checkpoint** is a saved state of training. A resumable checkpoint also needs the state used to continue training, such as the optimizer, training step, and relevant random-number state.

For the main experiment, a candidate version has to earn promotion through evaluation. More training can help one ability and hurt another. The previous accepted version stays available for rollback.

An improved 8B model still has roughly eight billion parameters. Moving to a larger architecture is a separate project; the data pipeline and evaluation methods can carry over.

## References we will work through

- [PyTorch: learn the basics](https://docs.pytorch.org/tutorials/beginner/basics/intro.html): tensors, models, differentiation, optimization, and saving work.
- [Hugging Face: fine-tuning a pretrained model](https://huggingface.co/learn/llm-course/en/chapter3/1): data preparation and training loops.
- [Hugging Face: training a causal language model](https://huggingface.co/learn/llm-course/en/chapter7/6): the path from text data to a small language model.
- [Hugging Face: supervised fine-tuning](https://huggingface.co/docs/trl/sft_trainer): training on example inputs and expected outputs.

The personal starting point is in [why I am learning how models learn](@/posts/why-im-learning-how-models-learn.md).
