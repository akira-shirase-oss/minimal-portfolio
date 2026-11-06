+++
title = "Weights, predictions, and loss"
description = "One adjustable number, an expected answer, and a way to measure the mistake. The first step toward understanding training."
date = 2026-11-06
updated = 2026-11-06
weight = 1

[extra]
kind = "chapter"
chapter = 1
status = "worked example; code lab planned"
+++

I needed to start smaller than an eight-billion-parameter model. One adjustable number is enough to ask the first useful question: **what changes when a model learns?**

This chapter uses a tiny mathematical model. It is a worked example, with no training run or model benchmark behind it yet.

## A model with one weight

Our model follows one rule:

**prediction = input × weight**

The **input** is a number we give the model. The **weight** is a number that training can adjust. The **prediction** is the answer the model calculates using its current weight.

In this model the weight is its only **parameter**: an adjustable value inside the model. Large models have many parameters, organized into layers of calculations.

Start with an input of **2** and a weight of **2**:

```text
prediction = 2 × 2 = 4
```

Suppose our training example says the expected answer is **6**. We now have a prediction, 4, and a target, 6, that we can compare.

| Item | Value |
| --- | ---: |
| Input | 2 |
| Current weight | 2 |
| Prediction | 4 |
| Expected answer, also called the target | 6 |

The target comes from the example we prepared. Checking whether training data is correct will matter when we build a dataset.

## Which direction helps?

**Before reading on:** with the input fixed at 2, should the weight increase or decrease to bring the prediction closer to 6?

<details>
<summary>Work through the answer</summary>

<p>The weight should increase. A weight of 2.5 gives <strong>2 × 2.5 = 5</strong>. A weight of 3 gives <strong>2 × 3 = 6</strong>.</p>

<p>If it increases to 4, the prediction becomes <strong>2 × 4 = 8</strong>. We have gone past the target. The direction that helps depends on where the current weight puts us.</p>
</details>

Here are several possible weights. These are candidate values for comparison; we have not run an optimizer to produce this sequence.

| Weight | Prediction: 2 × weight | Distance from the target, 6 |
| ---: | ---: | ---: |
| 2 | 4 | 2 |
| 2.5 | 5 | 1 |
| 3 | 6 | 0 |
| 4 | 8 | 2 |

## Put a number on the mistake

Training needs a numerical measure of the mismatch. That measure is called **loss**.

For this exercise, choose **squared-error loss**:

**loss = (prediction − target)²**

The brackets mean we subtract first. The small **²** means multiply the result by itself.

For a prediction of 4 and target of 6:

```text
prediction − target = 4 − 6 = −2
loss = (−2) × (−2) = 4
```

For a prediction of 5:

```text
prediction − target = 5 − 6 = −1
loss = (−1) × (−1) = 1
```

For a prediction of 6:

```text
prediction − target = 6 − 6 = 0
loss = 0 × 0 = 0
```

Squaring makes errors on either side of the target positive. A prediction of 8 also gives a loss of **(8 − 6)² = 4**. Larger mistakes get a larger penalty.

| Weight | Prediction | Target | Squared-error loss |
| ---: | ---: | ---: | ---: |
| 2 | 4 | 6 | 4 |
| 2.5 | 5 | 6 | 1 |
| 3 | 6 | 6 | 0 |
| 4 | 8 | 6 | 4 |

Lower loss means a closer prediction **on this example**. Language models normally use a different loss based on the probabilities assigned to expected tokens. We will work through that once probabilities and tokens have an explanation of their own.

## Where training enters the picture

We supplied candidate weights by hand above. A training program calculates a prediction and loss, then uses **gradients** to guide an update. A gradient describes how the loss changes as a trainable parameter changes.

An **optimizer** uses that information to update the trainable parameters. A setting called the **learning rate** helps control the size of the update. The next chapter will calculate this step with small numbers.

Using the current weight to calculate an answer is **inference**. Updating trainable parameters from examples is the learning part of **training**.

## What zero loss tells us here

At weight 3, this model matches our one training example exactly. That is a statement about one example.

To check whether it learned a useful relationship, we need other examples. We could also add an example whose target conflicts with the first one, or ask it to learn a relationship its multiplication rule cannot represent. Those are experiments still to come.

## Check your understanding

1. With input 2 and weight 4, what does the model predict?
2. With target 6, what is the squared-error loss for that prediction?
3. Should the next small adjustment increase or decrease the weight?
4. Does matching one training example prove the model works on unfamiliar examples?

<details>
<summary>Check the answers</summary>

<ol>
<li>The prediction is <strong>2 × 4 = 8</strong>.</li>
<li>The loss is <strong>(8 − 6)² = 2 × 2 = 4</strong>.</li>
<li>A small decrease moves this prediction closer to 6. The size matters: an adjustment can go too far.</li>
<li>No. We need examples the model did not train on and a clear account of what those tests measure.</li>
</ol>
</details>

## Sources and what comes next

- [PyTorch: optimizing model parameters](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html) explains the prediction, loss, gradient, and update loop in code.
- [Hugging Face: supervised fine-tuning](https://huggingface.co/docs/trl/sft_trainer) explains the token-prediction objective we will reach later.

Continue with [gradients and weight updates](@/learn/model-engineering/gradients-and-weight-updates.md), including a quick revision table and practice questions. The [roadmap](@/learn/model-engineering/roadmap.md) shows the rest of the track. The [introductory blog post](@/posts/why-im-learning-how-models-learn.md) explains why I started here.
