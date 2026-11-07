+++
title = "Why I'm learning how models learn"
description = "I started by asking about an 8B blog-writing model. Then I had to ask how training even starts."
date = 2026-11-06
updated = 2026-11-07

[extra]
kind = "experiment"
+++

I got as far as asking whether we could train an 8B model to write blogs before admitting I didn't know how training starts.

Eight billion adjustable numbers sounded interesting. What happens to even one of them? I couldn't explain it.

So that's where this learning track starts.

## The question got smaller

The first conversation was about a model for UpliftAI. We talked about collecting articles, using existing datasets, and running a small model locally. I want to explore that in a separate learning project.

Then I kept pulling the question back. I want to understand the training itself: what changes, how data reaches the model, how we test it, and how we decide whether a candidate is better.

Personalized email came up as another possible use case. The concepts are what I want to carry between projects: training, data handling, evaluation, and the harness — the program that prepares inputs, runs the model, and handles the result.

## The math is coming with me

I'm weak at math. I still want a basic understanding of it.

An assistant can calculate the numbers. I want to know what each number means and why the calculation is there. Otherwise, a training chart is just a line I hope goes down.

The first example uses one rule: **prediction = input × weight**. With input 2 and weight 2, the prediction is 4. The example's expected answer is 6.

I thought the weight would need to increase. That works here: weight 3 gives a prediction of 6. Increase it to 4, though, and the prediction becomes 8. Now the adjustment has gone too far.

We also worked through **loss**, a number measuring the mismatch. For this example, squaring the difference gives a loss of 4 when the prediction is 4, then 1 when the prediction is 5, then 0 when it is 6.

The next question is how the program chooses an update for itself. That is where gradients and optimizers enter. I still need to work through them.

## Finishing a run and passing a test

One distinction I want to keep visible throughout this project: a training program can finish successfully while the resulting model performs worse on unfamiliar examples.

Saving a file, reducing training loss, and producing useful answers each need their own checks. That is part of what I want to learn to test, including the cases where the result is uncertain.

## Two places to write this down

The [Learning section](@/learn/_index.md) will hold ordered chapters: explanations, small calculations, code as we write it, and exercises. The [model-engineering roadmap](@/learn/model-engineering/roadmap.md) shows what is ahead.

The blog will hold the experience of doing it. When something fails, I want to write down what I expected, what actually happened, how we investigated it, and what the evidence supports.

At that starting point, I had a worked numerical example and a plan. A training program, a fine-tuned model, and measured results were still ahead. The updates below record the next steps as they happened.

The first chapter is [weights, predictions, and loss](@/learn/model-engineering/weights-predictions-and-loss.md). One adjustable number is enough to begin.

## Learning update — 6 November 2026

We have now worked through loss rising and falling, the sign of a gradient, the direction of a small weight update, and overshooting. Weight and prediction can increase while loss decreases, because the prediction is getting closer to the target. Keeping those three quantities separate is part of the explanation we practised.

Those examples are in [chapter 2: gradients and weight updates](@/learn/model-engineering/gradients-and-weight-updates.md), with a quick revision table and questions whose answers can be opened after trying them. The learning rate has been introduced as a way to help control update size; its calculation, the gradient's numerical value, and a training program are still ahead.

### Later in the same lesson: one worked update

We have now estimated a gradient around weight 2 and used it in the update rule. With gradient −8 and learning rate 0.1, the calculation changes the weight from 2 to 2.8. The prediction moves from 4 to 5.6, and squared-error loss falls from 4 to 0.16.

The subtraction is worth writing out: **2 − (0.1 × −8) = 2 − (−0.8) = 2 + 0.8**. The negative gradient leads to a weight increase in this example. The learning rate scales the amount of the change.

This is a worked calculation, not a completed training program. [The expanded chapter](@/learn/model-engineering/gradients-and-weight-updates.md#calculate-one-update) keeps the intermediate steps and the distinction between an estimated slope and a derivative. Repeating the process in a training loop is next.

### The first small program

The loop now runs locally. It uses the same input 2, target 6, starting weight 2, and learning rate 0.1. After three updates, the recorded weights are 2, 2.8, 2.96, and 2.992, counting the starting point. Loss falls from 4 to about 0.000256 on that one example.

The useful part is seeing each result become the next starting point. The learning rate stays fixed while the fresh gradient gets smaller, so the updates shrink too. It is a small enough program to read from top to bottom.

[Chapter 3](@/learn/model-engineering/our-first-training-loop.md) keeps the code, intermediate results, and the difference between a program check and evidence of a better model. The portfolio stays focused on text and learning notes. Broader evaluation and training Qwen are still ahead.

### The first check that says FAIL

The next exercise holds the learned weight fixed and tries new inputs. Calculating a loss measures an error. A weight update is a separate instruction, and the validation code does not run it.

After an initial exploratory measurement, we declared a rule for a new two-case check: each prediction must be within 0.05 of its target, and every required case must pass. With weight 2.992, input 1 has an error of 0.008 and passes. Input 10 has an error of 0.08 and fails.

The untrained baseline does worse on both inputs. The candidate still fails the declared rule. That is the distinction I wanted to see: a model can improve and still miss a requirement.

The failure is saved with its criteria and scores in [the chapter's evidence](@/learn/model-engineering/our-first-training-loop.md#one-case-passes-and-another-fails). This is a deliberately small teaching exercise, not a claim about broad generalization or overfitting. No extra training or model promotion has happened yet.

## Learning update — 7 November 2026

I want the next part to happen through building. The concepts stick better when there is a working piece, an output to inspect, or an error to investigate. The numerical examples remain useful references, and the math can come in when it explains the thing we are making.

The first practical slice now uses my local Qwen3-8B model. It asks a tool for a saved portfolio note, our code returns the note, and the model explains the deployment command from that information. The tool reads a note; it does not deploy anything.

[The harness chapter](@/learn/model-engineering/the-harness-around-the-model.md) records this first cycle and its actual trace. Existing weights were used. Training a tiny text model, saving and resuming runs, adapting weights, and investigating real tool-use failures are the next pieces of the practical route.
