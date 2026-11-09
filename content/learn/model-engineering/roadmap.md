+++
title = "The model-engineering learning roadmap"
description = "The path from one prediction to training, data pipelines, harnesses, evaluation, and better model versions."
date = 2026-11-06
updated = 2026-11-09
weight = 0

[extra]
kind = "roadmap"
status = "plan; changes as I learn"
+++

I want to understand how to build and improve models. Blog writing and personalized email are possible exercises. The concepts need to carry over to other problems too.

The route is now **learn by building**: make a small working piece, run it, inspect the result, understand a failure, then improve it. Mathematics comes in when it helps explain the behavior; repeated arithmetic and pass/fail recall questions are not prerequisites for practical work.

## What comes next — 9 November 2026

The next sequence is topics **4 through 8**: how learning goes wrong, data a model can learn from, a tiny language model, training we can inspect and resume, and adapting an existing model. These remain planned; choosing the sequence does not mean the experiments have run.

For each topic, the lesson starts with a plain explanation and a small example. The assistant implements the experiment and handles the calculations. We inspect the code, outputs, and failures together to understand what each part does, why it matters, and what a change actually helped. Deep mathematical derivations are optional; the numbers needed to explain an observation still get explained.

The [first Qwen tool-use example](@/learn/model-engineering/the-harness-around-the-model.md) stays available as a reference. Expanding that assistant comes after this pass through topics 4–8, alongside deeper evaluation, efficiency, and learning from preferences. Basic validation remains part of the earlier experiments.

The portfolio will follow the lessons: chapter explanations, small examples, relevant code, recorded results, and a quick revision summary. Blog updates will describe actual investigations and learning decisions. Planned work, completed runs, and demonstrated understanding stay distinct.

## Two related builds

1. **A local Qwen tool-using assistant.** Start with a read-only project-note lookup, then introduce missing information, tool errors, more tools, and recorded comparisons. The [first working slice and trace are available](@/learn/model-engineering/the-harness-around-the-model.md).
2. **A separate tiny text model.** Prepare text, turn it into tokens, train a small next-token predictor, generate text, inspect poor outputs, and save/resume the training run. This is planned and can start without finishing a large assistant application.

Later improvements to these builds will teach adapting model weights, reviewing training examples, evaluating candidate versions, memory and speed, and learning from preferred answers. The installed Ollama model is the inference baseline; training an existing model will need compatible model files and a measured memory budget.

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
| [9. The harness around the model](@/learn/model-engineering/the-harness-around-the-model.md) | What does the surrounding program contribute? | The first local Qwen lookup cycle has run. Expand the same assistant one tool or failure case at a time. |
| 10. Evaluation and model promotion | Does this candidate deserve to replace the previous version? | Define acceptance criteria, compare outputs, investigate regressions, and preserve the previous accepted version. |
| 11. Memory, speed, and scale | What do efficiency changes cost in quality? | Measure numerical precision, quantization, batching, latency, and memory tradeoffs. |
| 12. Learning from preferences | Can examples of preferred answers improve behavior? | Build reviewed answer pairs and test whether preference training helps. |

Notes for chapters 1, 2, 3, and 9 are available. The earlier one-weight examples remain references. The practical route can revisit topics in a different order; planned chapters get pages when there is real work to explain. A successful run and the learner's understanding remain separate claims.

## Math alongside the code

We will explain the math when it helps make an observation clear: multiplication for a prediction, what a gradient tells an update, arrays of numbers for layers, and probabilities for language-model output. Deeper derivations can follow when wanted.

Each explanation should define its symbols, show the needed steps, and connect them to the code or result being inspected. The program handles calculations. The focus is understanding the mechanism, its uses, and its limits through building, observing, and discussing changes together.

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
