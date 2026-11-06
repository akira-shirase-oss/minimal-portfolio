+++
title = "Our first training loop"
description = "A tiny program repeats prediction, loss, gradient, and weight updates, with every result written out."
date = 2026-11-06
updated = 2026-11-06
weight = 3

[extra]
kind = "chapter"
chapter = 3
status = "first one-weight loop run locally; unseen-data evaluation still ahead"
+++

We have worked through [one weight update](@/learn/model-engineering/gradients-and-weight-updates.md). Now a tiny JavaScript program repeats that calculation. This chapter keeps the explanation, code, and results as plain revision notes.

The first run uses input **2**, target **6**, starting weight **2**, and learning rate **0.1**. Follow one turn before reading the whole program.

## What is actually being trained?

Our entire model is one rule:

**prediction = input × weight**

The training data contains one example: **input 2 should produce target 6**. The weight starts at **2**. Input, target, and learning rate stay fixed during a run; the weight changes.

This is a real, deliberately tiny parameter-training example. It does not train Qwen or a language model. Each program run starts fresh; saving a learned model and resuming training are later exercises.

## Read one turn of the loop

The program repeats four jobs:

1. **Predict.** Multiply input by the current weight.
2. **Measure loss.** Subtract the target from the prediction, then square that difference.
3. **Estimate a fresh gradient.** Compare loss at a weight a little above and a little below the current one.
4. **Update.** Subtract learning rate × gradient from the weight, then carry the new weight forward.

For the numerical estimate, we check **0.5 above and 0.5 below** the current weight. That distance is a probe for measuring slope; the learning rate controls the actual update. They serve different purposes.

At weight 2, those checks use 1.5 and 2.5. Their losses are 9 and 1, so the estimated gradient is **(1 − 9) ÷ (2.5 − 1.5) = −8**. This centered estimate equals the exact gradient for our particular quadratic loss. That equality does not hold for every possible loss function.

The repeating part of the program is:

```javascript
for (let step = 0; step <= updates; step += 1) {
  const prediction = input * weight;
  const loss = lossAt(weight);
  const gradient = (lossAt(weight + probe) - lossAt(weight - probe)) / (2 * probe);
  history.push({ step, weight, prediction, loss, gradient });

  if (step < updates) weight = weight - learningRate * gradient;
}
```

`updates` is the number of weight changes requested. `step` counts how many have happened. `step += 1` adds one to that counter. `history.push` records the current result in a list. `lossAt` calculates squared-error loss at the weight supplied to it.

The final line carries the new weight into the next turn. The condition `step < updates` prevents an extra update after we record the final result. Three updates produce **four rows**: the starting point and three results.

The full runnable example is below. The excerpt above shows the loop; its settings and helper are defined in the complete program.

## Our first three updates

The local run with starting weight **2** and learning rate **0.1** produced this trace, rounded for readability:

| Updates completed | Weight | Prediction | Loss |
| ---: | ---: | ---: | ---: |
| 0 · starting point | 2 | 4 | 4 |
| 1 | 2.8 | 5.6 | 0.16 |
| 2 | 2.96 | 5.92 | 0.0064 |
| 3 | 2.992 | 5.984 | 0.000256 |

For the second update, the fresh gradient is **−1.6**:

```text
Learning rate × gradient = 0.1 × (−1.6) = −0.16
New weight              = 2.8 − (−0.16) = 2.96
New prediction          = 2 × 2.96 = 5.92
New loss                = (5.92 − 6)²
                        = (−0.08) × (−0.08)
                        = 0.0064
```

The first increase was **0.8**, and the second was **0.16**. The learning rate stayed at 0.1; the gradient's size became smaller. A fixed learning rate can still produce different update sizes.

The program uses ordinary floating-point numbers. Raw output can contain a tiny representation difference, such as 0.16000000000000028 instead of 0.16. The table uses readable rounded values; numerical checks allow a small tolerance. That is different from pretending a small nonzero loss is zero.

## Compare one change at a time

- **Start at weight 4, with rate 0.1.** The first update decreases the weight to 3.2, moving its prediction toward 6.
- **Start at weight 3.** Prediction is already 6. Loss and gradient are zero; our simple update rule leaves the weight unchanged, because **0.1 × 0 = 0**. The learning rate is still 0.1.
- **Return to weight 2 and choose rate 0.01.** The first update reaches 2.08 instead of 2.8. It is a smaller change.
- **Try rate 0.3 from weight 2.** The first update reaches 4.4, producing prediction 8.8 and loss 7.84, above the starting loss of 4. A helpful local direction can still produce a harmful large update.

Keep each run's starting values and history separate. That lets us attribute a difference to the setting we changed.

## What counts as passing?

There are separate questions:

1. **Did the program calculate and record the intended updates?** Check the trace against independently calculated values and verify the gradient and update rules.
2. **Did training loss improve?** Compare the initial and final loss on this training example.
3. **Does the model work on unseen examples?** This experiment does not answer that. We have used only one training pair and have not designed a held-out evaluation.

Loss falling is evidence about this example. A zero gradient alone is not a general guarantee of a good model. Data splits, broader evaluation, and promotion decisions are later lessons.

## Keep the experiment inspectable

Save this complete example as `one-weight.mjs`:

```javascript
function train(startingWeight = 2, learningRate = 0.1, updates = 3) {
  const input = 2;
  const target = 6;
  const probe = 0.5;
  const lossAt = (weight) => (input * weight - target) ** 2;
  let weight = startingWeight;
  const history = [];

  for (let step = 0; step <= updates; step += 1) {
    const prediction = input * weight;
    const loss = lossAt(weight);
    const gradient = (lossAt(weight + probe) - lossAt(weight - probe)) / (2 * probe);
    history.push({ step, weight, prediction, loss, gradient });
    if (step < updates) weight = weight - learningRate * gradient;
  }
  return history;
}

console.table(train(2, 0.1, 3));
```

Run it with `node one-weight.mjs`. In `train(2, 0.1, 3)`, `2` is the starting weight, `0.1` the learning rate, and `3` the number of updates. `console.table` prints the recorded rows. `return history` hands that list back to the caller.

The [saved experiment record](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-training-loop-experiment.json) contains the settings, source hashes, raw output, and nine passed checks, including the deliberately oversized update that makes loss rise. The [check script](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/check-training-loop.mjs) checks the runnable code printed in this chapter against independently calculated values. These checks establish specific numerical and program behavior; they do not establish production capacity or learner mastery.

## Check your understanding

After two updates, the weight is 2.96. Should the third update start from 2 or 2.96?

<details>
<summary>Check the answer</summary>
<p>2.96. The next turn carries the latest weight forward. Starting over from 2 would discard the earlier changes.</p>
</details>

Next we will inspect failures more closely and learn how to judge a model beyond one training example. The [roadmap](@/learn/model-engineering/roadmap.md) keeps that wider plan.
