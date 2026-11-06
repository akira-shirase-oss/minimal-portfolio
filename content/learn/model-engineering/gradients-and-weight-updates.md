+++
title = "Gradients and weight updates"
description = "Why the weight can rise while loss falls, which direction to move, and how a useful direction can still lead to an oversized update."
date = 2026-11-06
updated = 2026-11-06
weight = 2

[extra]
kind = "chapter"
chapter = 2
status = "direction and overshooting explained; gradient and learning-rate calculations planned"
+++

This chapter follows [weights, predictions, and loss](@/learn/model-engineering/weights-predictions-and-loss.md). We are still using small worked examples. No training program has been run for this lesson.

## Quick revision

| Idea | Plain meaning |
| --- | --- |
| Loss | A number measuring how wrong the prediction is. |
| Loss falls | The error score gets smaller. |
| Loss rises | The error score gets bigger. |
| Negative gradient | Increasing the weight a little makes loss fall nearby. |
| Positive gradient | Increasing the weight a little makes loss rise nearby. |
| Update direction | To reduce loss, a basic gradient-descent step moves opposite the gradient's sign. |
| Overshooting | An update takes the prediction beyond the target. |
| Learning rate | A setting that helps control update size. Its calculation is still ahead. |

The question behind the sign is always: **what happens to loss if the weight increases a little from its current value?**

## Keep three things separate

Our toy model still uses:

**prediction = input × weight**

The input is **2**, the target is **6**, and the starting weight is **2**. Its prediction is **4**.

Using squared-error loss:

**loss = (prediction − target)²**

The starting loss is **(4 − 6)² = 4**. Now try increasing the weight to 2.5:

| Weight | Prediction: 2 × weight | Loss |
| ---: | ---: | ---: |
| 2 | 4 | 4 |
| 2.5 | 5 | 1 |

The weight rose. The prediction also rose. **The loss fell**, because 5 is closer to the target, 6.

An increasing prediction does not automatically mean an increasing mistake. Keep the weight, prediction, and loss separate when reading a training result.

## What the gradient's sign tells us

A **gradient** describes how loss changes as a trainable parameter changes. For now, focus on its sign. We will calculate its numerical value later.

At weight 2, increasing the weight a little moves the prediction toward 6 and makes loss fall. This is the **negative-gradient case**.

Now start on the other side, at weight 4. The prediction is 8. Increasing that weight to 4.5 gives a prediction of 9:

| Weight | Prediction | Loss |
| ---: | ---: | ---: |
| 4 | 8 | (8 − 6)² = 4 |
| 4.5 | 9 | (9 − 6)² = 9 |

Here, increasing the weight makes loss rise. This is the **positive-gradient case**. The sign depends on where we currently are.

A positive loss value can have a negative gradient. In our first example, the loss is 4, but a small weight increase makes it fall. The sign describes the change, not whether the loss number itself is positive.

## Turn that information into a direction

For a basic gradient-descent update, we want to reduce loss by moving opposite the gradient's sign:

| Gradient sign | What a small weight increase does to loss | Direction to try to reduce loss |
| --- | --- | --- |
| Negative | Makes it fall | Increase the weight a little |
| Positive | Makes it rise | Decrease the weight a little |

The word **negative** is not an instruction to decrease the weight. It says the loss heads downward when the weight is nudged upward. The size of the nudge also matters.

## A useful direction can still produce too large a jump

Return to weight **2**, input **2**, and target **6**. Increasing the weight is locally helpful, but compare these possible new values:

| Trial weight | Prediction | Loss |
| ---: | ---: | ---: |
| 2.1 | 4.2 | (4.2 − 6)² = 3.24 |
| 2.5 | 5 | (5 − 6)² = 1 |
| 3 | 6 | 0 |
| 5 | 10 | (10 − 6)² = 16 |

Weight **3** hits the target exactly. Weight **5** sends the prediction to 10, beyond the target. That is **overshooting**; this particular jump also makes loss worse than the starting loss of 4.

These are hand-picked trial weights, not the output of a training run. They separate two decisions: **which direction to move**, and **how far to move**.

Smaller updates can reduce the chance of a large overshoot. The **learning rate** helps control update size. It works with the gradient's numerical value; we have introduced the idea, but have not calculated that connection yet.

## Check your understanding

Try these before opening the answers:

1. Our target is 6. The prediction moves from 4 to 5. Does squared-error loss rise or fall?
2. A small weight increase makes loss fall. Is the gradient positive or negative?
3. With that negative gradient, which direction should a small weight update try?
4. With input 2 and target 6, does weight 3 hit the target exactly or go beyond it? What about weight 5?
5. Why do we need to control update size as well as direction?

<details>
<summary>Check the answers</summary>

<ol>
<li>It falls. Prediction 5 is closer to 6; squared-error loss goes from 4 to 1.</li>
<li>Negative: increasing the weight makes loss decrease nearby.</li>
<li>Increase the weight a little. The update moves opposite the gradient's sign to reduce loss.</li>
<li>Weight 3 gives 2 × 3 = 6, an exact match. Weight 5 gives 2 × 5 = 10, beyond the target.</li>
<li>A move in a helpful direction can go too far. The weight-5 example produces a larger loss than we started with.</li>
</ol>
</details>

## Still to work through

Next, we will calculate the gradient's numerical value, then use a learning rate to calculate one update. Derivatives, the update formula, and an executable training loop are planned material. This page will grow as those lessons happen.

The [learning roadmap](@/learn/model-engineering/roadmap.md) keeps the wider plan. [PyTorch's optimization tutorial](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html) is a reference for the training loop we will eventually write.
