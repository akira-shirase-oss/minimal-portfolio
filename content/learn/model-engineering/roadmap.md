+++
title = "The model-engineering learning roadmap"
description = "The path from one prediction to training, data pipelines, harnesses, evaluation, and better model versions."
date = 2026-11-06
updated = 2026-11-13
weight = 0

[extra]
kind = "roadmap"
status = "plan; changes as I learn"
+++

I want to understand how to build and improve models. Blog writing and personalized email are possible exercises. The concepts need to carry over to other problems too.

The route is now **learn by building**: make a small working piece, run it, inspect the result, understand a failure, then improve it. Mathematics comes in when it helps explain the behavior; repeated arithmetic and pass/fail recall questions are not prerequisites for practical work.

## Current practical focus — 13 November 2026

One local browser chat will grow from **todo CRUD to CRM tasks and compound
workflows**, with the model/harness/database boundary visible. The
[first create/list implementation](@/learn/model-engineering/the-harness-around-the-model.md#one-local-chat-from-todos-to-crm-13-november)
now runs through local MLX with pinned Hugging Face files, without Ollama.
Twenty-five scripted checks and four real development cases passed. The local
dashboard shows actual tasks, saved runs, runtime status and per-query prompts,
responses, validation, database effects and timings. [The dated step record](@/learn/model-engineering/the-harness-around-the-model.md#a-running-dashboard-and-query-breakdown-13-november)
preserves the initial setup failures and subsequent recovery. Update/delete,
CRM, adapter training, held-out quality and measured savings remain planned.

Keep the earlier lookup, saved-build and tiny-model experiments as references.
Preserve old task cases when adding tools or training adapters, and evaluate old
and new behavior with each workflow's intended tools. Saved records, conversation
context and learned weights are different mechanisms. Measure task quality,
recovery, time, memory and total cost before claiming stability or savings.
Record every step, including failures, in chapters and dated experiment records;
use blog reflections for larger lessons. The public portfolio stays text/code;
the interactive lab runs separately on the local computer.

## What comes next — 9 November 2026

This dated section records the earlier route. The 13 November focus above now
guides the next practical work; the original heading remains so existing links
continue to work.

The sequence agreed then was topics **4 through 8**: how learning goes wrong, data a model can learn from, a tiny language model, training we can inspect and resume, and adapting an existing model. [Topic 4 has failure-mode comparisons](@/learn/model-engineering/how-learning-goes-wrong.md), and [topic 5 has a data audit and duplicate-leakage split demonstration](@/learn/model-engineering/data-a-model-can-learn-from.md). [Topic 6 now includes a last-token embedding predictor after the tokenizer, count model, and score update, plus an attention mechanism with position vectors, a generation loop, and trained attention weights](@/learn/model-engineering/from-text-to-a-tiny-language-model.md). The attention run used declared vectors — order blindness without positions was demonstrated directly — and the generator recites verbatim training text. A three-arm training run then taught attention weights on same-last-token prefixes: the fully trained arm converged to all three targets with 85% of weight on the discriminative space position. Broader model training remains ahead; these first teaching examples do not establish mastery or replace broader data-quality work.

For each topic, the lesson starts with a plain explanation and a small example. The assistant implements the experiment and handles the calculations. We inspect the code, outputs, and failures together to understand what each part does, why it matters, and what a change actually helped. Deep mathematical derivations are optional; the numbers needed to explain an observation still get explained.

The [first Qwen tool-use example](@/learn/model-engineering/the-harness-around-the-model.md) stays available as a reference, and on 11 November it gained its first failure-hunting pass: two silent-answer failures found and repaired, with a small recorded case suite re-run after every change. Topics 4–8 remain the main sequence; the assistant keeps expanding alongside them, toward deeper evaluation, efficiency, and learning from preferences. Basic validation remains part of the earlier experiments.

The portfolio will follow the lessons: chapter explanations, small examples, relevant code, recorded results, and a quick revision summary. Blog updates will describe actual investigations and learning decisions. Planned work, completed runs, and demonstrated understanding stay distinct.

## Two related builds

1. **A local Qwen tool-using assistant.** Start with a read-only project-note lookup, then introduce missing information, tool errors, more tools, and recorded comparisons. The [first working slice, trace, and failure-repair suite are available](@/learn/model-engineering/the-harness-around-the-model.md).
2. **A separate tiny text model.** Prepare text, turn it into tokens, train a small next-token predictor, generate text, inspect poor outputs, and save/resume the training run. This is planned and can start without finishing a large assistant application.

Later improvements to these builds will teach adapting model weights, reviewing training examples, evaluating candidate versions, memory and speed, and learning from preferred answers. The installed Ollama model is the inference baseline; training an existing model will need compatible model files and a measured memory budget.

## The path

| Chapter | Question | Planned exercise |
| --- | --- | --- |
| [1. Weights, predictions, and loss](@/learn/model-engineering/weights-predictions-and-loss.md) | What changes when a model learns? | Work through one adjustable weight and its errors, then inspect them in chapter 3's lab. |
| [2. Gradients and weight updates](@/learn/model-engineering/gradients-and-weight-updates.md) | How does the program choose a direction and size for an update? | Direction, overshooting, numerical gradients, and learning-rate updates are worked through. Direct derivatives remain ahead. |
| [3. Our first training loop](@/learn/model-engineering/our-first-training-loop.md) | How do repeated updates become training? | Run a tiny local program, inspect its weights and loss, then measure a fixed candidate against a declared two-case validation rule. Saving and resuming a learned model remain ahead. |
| [4. How learning goes wrong](@/learn/model-engineering/how-learning-goes-wrong.md) | Did it capture too little, fit accidental details, or fail to settle during updates? | Overfitting and underfitting examples run on fixed synthetic delivery data; a separate one-weight loop compares steady updates, repeated bouncing, and growing error by changing only learning rate. Broader evaluation remains ahead. |
| [5. Data a model can learn from](@/learn/model-engineering/data-a-model-can-learn-from.md) | How do raw records become useful examples and separate checks? | Synthetic data audit and fixed split-leakage comparison run. A lookup answers training-message copies but abstains on different validation/test messages. Broader human review, representative coverage, and real-model evaluation remain ahead. |
| [6. From text to a tiny language model](@/learn/model-engineering/from-text-to-a-tiny-language-model.md) | How do text pieces become predictions? | Tokenizer, count probabilities, score update, last-token embedding update, attention mechanism with position vectors, a generation loop, and trained attention weights run. The fully trained arm solved all three same-last-token cases; broader model training remains ahead. |
| [7. Training runs we can inspect and resume](@/learn/model-engineering/training-runs-we-can-inspect-and-resume.md) | Can we explain and recover a run? | First resumable run: 8-step run interrupted at 4, resumed to 8 with bit-identical finals. Real-model checkpoints with optimizer state remain ahead. |
| [8. Adapting an existing model](@/learn/model-engineering/adapting-an-existing-model.md) | What does fine-tuning change? | First contrast on the preserved failed gate: frozen base vs full fine-tune vs removable adapter — both fixes pass, adapter reverts exactly. Real LLM adaptation ahead. |
| [9. The harness around the model](@/learn/model-engineering/the-harness-around-the-model.md) | What does the surrounding program contribute? | First lookup cycle ran 7 November; first failure cases were recorded and repaired 11 November, with a small case suite re-run after each change. Expand the same assistant one tool or failure case at a time. |
| 10. Evaluation and model promotion | Does this candidate deserve to replace the previous version? | Define acceptance criteria, compare outputs, investigate regressions, and preserve the previous accepted version. |
| 11. Memory, speed, and scale | What do efficiency changes cost in quality? | Measure numerical precision, quantization, batching, latency, and memory tradeoffs. |
| 12. Learning from preferences | Can examples of preferred answers improve behavior? | Build reviewed answer pairs and test whether preference training helps. |

Notes for chapters 1, 2, 3, 4, 5, 6, and 9 are available. The earlier one-weight examples remain references. The practical route can revisit topics in a different order; planned chapters get pages when there is real work to explain. A successful run and the learner's understanding remain separate claims.

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
