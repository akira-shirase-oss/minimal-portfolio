+++
title = "Why I'm learning how models learn"
description = "I started by asking about an 8B blog-writing model. Then I had to ask how training even starts."
date = 2026-11-06
updated = 2026-11-06

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

Right now, this is the start of the learning. I have a worked numerical example and a plan. A training program, a fine-tuned model, and measured results are still ahead.

The first chapter is [weights, predictions, and loss](@/learn/model-engineering/weights-predictions-and-loss.md). One adjustable number is enough to begin.

## Learning update — 6 November 2026

We have now worked through loss rising and falling, the sign of a gradient, the direction of a small weight update, and overshooting. Weight and prediction can increase while loss decreases, because the prediction is getting closer to the target. Keeping those three quantities separate is part of the explanation we practised.

Those examples are in [chapter 2: gradients and weight updates](@/learn/model-engineering/gradients-and-weight-updates.md), with a quick revision table and questions whose answers can be opened after trying them. The learning rate has been introduced as a way to help control update size; its calculation, the gradient's numerical value, and a training program are still ahead.
