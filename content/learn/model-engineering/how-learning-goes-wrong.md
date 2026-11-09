+++
title = "How learning goes wrong"
description = "Models can capture too little, fit accidental details too closely, or make updates that fail to settle. Small recorded examples show the differences."
date = 2026-11-09
updated = 2026-11-09
weight = 4

[extra]
kind = "chapter"
chapter = 4
status = "synthetic overfitting, underfitting, and training-stability comparisons run; broader evaluation remains ahead"
+++

A model can get every training example right and still struggle with a new example. Our first experiment in this chapter shows one way that happens: **overfitting**.

We first fitted two small mathematical models to the same six made-up measurements, then added a third model to investigate underfitting. These are local teaching experiments, using no neural network or language model. No Qwen weights changed.

The third comparison returns to our earlier one-weight training loop. It holds the model and data fixed while changing update size, making steady learning, repeated bouncing, and growing error visible.

## Learning a pattern we can use again

Suppose we want to predict delivery time from distance. We want useful estimates for distances that were not in the training examples.

That ability is called **generalization**: using what was learned to handle unfamiliar examples. Reproducing the recorded answers alone does not establish it.

**Overfitting** happens when a model fits details of the training examples, including accidental variation, in a way that hurts its performance on new examples. A model can behave as though it memorized the examples without storing a literal list of answers.

## The deliberately small dataset

For this experiment, we made up the underlying rule:

```text
Delivery time in minutes = 10 + 2 × distance in kilometres
```

The 10 is a starting time. Each kilometre adds 2 minutes. A distance of 1 kilometre therefore has a target of 12 minutes.

The six training distances are **0, 2, 4, 6, 8, and 10 kilometres**. We deliberately moved their recorded times alternately 3 minutes above and below the rule. Those deviations stand in for **noise**: variation that distance alone does not explain.

| Distance, km | Recorded training time, minutes |
| ---: | ---: |
| 0 | 13 |
| 2 | 11 |
| 4 | 21 |
| 6 | 19 |
| 8 | 29 |
| 10 | 27 |

The new checking distances are **1, 3, 5, 7, and 9 kilometres**. Their targets come from the original rule, without added noise. None of these five rows is used to fit either model.

These are **validation examples**: examples kept out of fitting so we can inspect the result. They are not an independent final test. Both sets were deliberately constructed to reveal a failure mode. Real checking measurements can be noisy too; the clean targets here let us isolate whether a model follows the underlying rule.

## Two ways to fit those measurements

**Model A fits a straight line.** It adjusts two numbers: the starting time and the extra time per kilometre. It has to follow a broad trend because a line cannot bend through all six noisy observations.

**Model B fits a flexible curve.** Specifically, it uses a degree-5 polynomial, a curve flexible enough to pass through these six observations exactly. The program constructs that curve from the training rows.

Both models use the same training data. We change the model's flexibility. Neither fit uses the validation answers. The implementations calculate their fitted models directly; there is no repeated gradient-descent loop in this experiment.

## What actually happened

We measure **mean absolute error**: take each prediction's distance from its target, then average those distances. The unit remains minutes. Lower is better for this measurement.

| Model | Average error on training rows | Average error on new rows |
| --- | ---: | ---: |
| A: straight line | 2.74 minutes | 0.62 minutes |
| B: flexible curve | 0.00 minutes | 3.90 minutes |

The flexible curve fits the training measurements perfectly. It does worse on the new examples. It bends to follow the artificial ups and downs instead of following the underlying trend well between them.

At **1 kilometre**, the target is **12 minutes**. The straight line predicts about **13.03 minutes**. The flexible curve predicts **4.50 minutes**. Neither prediction is a copied training answer: both models calculate it at a distance kept out of fitting.

This is the overfitting behavior we wanted to inspect. The smaller training error did not identify the better model on these validation cases.

The straight line's validation error is smaller than its training error partly because the validation targets are clean while the training measurements are noisy. Validation error does not have to be larger than training error on every dataset.

## What this result establishes

The [comparison program](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/compare-overfitting.mjs), [fixed dataset](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/fixtures/overfitting-v1.json), and [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-overfitting-comparison.json) preserve the exact inputs, source hashes, model definitions, per-row predictions, and machine details.

Run it from the portfolio checkout with:

```sh
node tools/compare-overfitting.mjs
```

The program protects the first result from being overwritten. A later experiment must use a separate result path. It uses Node's built-in libraries and needs no package installation.

Program checks confirmed disjoint fitting/checking inputs, finite predictions, the straight-line fit's residual conditions, and the flexible curve's exact fit to its training rows. A separate exact-fraction calculation checked every prediction and both averages for each model.

There is no application acceptance threshold or model-promotion decision here. This constructed example does not show that flexible models always do worse, or that simplicity always wins. It shows why training accuracy alone is insufficient evidence.

## Underfitting: capturing too little of the pattern

Now imagine a delivery model that always predicts the same time, whatever the distance. It has one adjustable number. Fitting chooses that number from the training measurements, but the model has no way to make its prediction increase with distance.

We implemented exactly that model. It takes the average of the same six training times and learns **20 minutes**. This is a fitted model: the number comes from the training data. Choosing the average minimizes squared training error among constant predictions. We still report average absolute error to keep the comparison with the earlier models consistent.

Its predictions on new distances are:

| Distance | Target time | Fixed-time model's prediction |
| ---: | ---: | ---: |
| 1 km | 12 minutes | 20 minutes |
| 5 km | 20 minutes | 20 minutes |
| 9 km | 28 minutes | 20 minutes |

It gets the middle example right but misses the distance-dependent pattern. Even a correctly calculated training result cannot give this model a slope: its definition always returns one fixed time.

**Underfitting** means the fitted model captures too little of the useful structure in the data. Here, its limited form prevents it from expressing a relationship that the straight line can represent.

The measured comparison is:

| Model | Average training error | Average error on new rows |
| --- | ---: | ---: |
| Fixed 20-minute prediction | 5.67 minutes | 4.80 minutes |
| Straight line | 2.74 minutes | 0.62 minutes |
| Flexible curve | 0.00 minutes | 3.90 minutes |

The constant model has more error than the straight line on both sets. The flexible curve fits the training rows perfectly and has more error on the new rows than the line. These illustrate two different problems: capturing too little of the trend, and following the training-specific variations too closely.

The [underfitting program](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/compare-underfitting.mjs) fitted the new constant model and preserved its [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-underfitting-comparison.json). The line and curve numbers are reused from the unchanged earlier evidence, not new runs. Source and dataset hashes were checked before comparing them.

To run the new example from the portfolio checkout:

```sh
node tools/compare-underfitting.mjs
```

The saved first result is protected from overwriting. To repeat it from a checkout that already contains that record, give a fresh result path:

```sh
node tools/compare-underfitting.mjs perf/results/another-underfitting-run.json
```

Adding more training updates cannot make a constant model express a distance effect. We would need to change the model so it can use that relationship. The earlier straight line demonstrates that capability on this dataset. We have not run an iterative training repair here.

In other setups, insufficient training or overly strong restrictions can also lead to underfitting. Large errors alone do not diagnose the cause: poor data, a bug, or a mismatch between the task and available inputs could also need investigation.

## The use case defines useful performance

A training score alone does not tell us whether a model is useful. The application determines which mistakes matter and how much error is acceptable. We then evaluate examples resembling the inputs that application will receive.

For a rough delivery estimate, an application might allow a few minutes of error. A different scheduling task might need a tighter limit. These are illustrative requirements; this experiment has no application acceptance threshold.

Perfect training performance alone does not establish overfitting either. Our evidence is the comparison on fixed new cases and the known construction of the example. The same five validation cases have now been inspected twice; they remain development examples, not a fresh final test or a broad real-world benchmark.

## Unstable training: updates that fail to settle

Our delivery examples changed the model's flexibility. This experiment instead uses the [earlier one-weight model](@/learn/model-engineering/our-first-training-loop.md): multiply input **2** by a weight to predict target **6**. A weight of **3** can produce the target exactly, so the model can represent this particular answer.

All three runs start at weight **2**, with prediction **4** and squared-error loss **4**. Each takes three updates using a freshly calculated gradient. The only changed setting is the **learning rate**, the multiplier that helps determine how large each update is.

We compare learning rates **0.1**, **0.25**, and **0.3**. These values are specific to this tiny model, data scale, and update rule; they are not universal settings for other models.

### The recorded loss after each update

Loss is the squared mismatch from the target, so it has no minutes unit here. Lower loss means a closer prediction on this one training example. These are different scores from the delivery-time errors above.

| Learning rate | Starting loss | After 1 update | After 2 updates | After 3 updates |
| ---: | ---: | ---: | ---: | ---: |
| 0.1 | 4 | 0.16 | 0.0064 | 0.000256 |
| 0.25 | 4 | 4 | 4 | 4 |
| 0.3 | 4 | 7.84 | 15.3664 | 30.118144 |

Values are rounded for readability. The saved result keeps the raw floating-point values.

**Rate 0.1 makes shrinking corrections.** The weights move **2 → 2.8 → 2.96 → 2.992**. In these three updates, each prediction moves closer to 6.

**Rate 0.25 keeps bouncing.** The weights go **2 → 4 → 2 → 4**. Predictions alternate between **4 and 8**, equally far from target 6. The model changes, but the loss does not improve. A flat loss does not necessarily mean the weights are unchanged.

**Rate 0.3 makes growing swings.** The weights go approximately **2 → 4.4 → 1.04 → 5.744**. At the first step, increasing the weight is the useful direction, but the update jumps past weight 3. The next correction jumps back too far. Over the recorded updates, the swings grow and the loss increases. This growth in error as updates move farther from the solution is called **divergence**.

An update can point in a useful direction and still be too large. More updates with a harmful update size do not automatically improve training. Bouncing alone is not enough to diagnose failure either: in other runs, swings can shrink. Inspect whether the errors settle, stay large, or grow.

### What this comparison establishes

This is an update problem on a model that can represent the target. In the underfitting example, the fixed-time model lacked a way to express the distance trend. In the overfitting example, a model followed training-specific variation too closely. These are different mechanisms and can need different changes.

The [stability runner](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/compare-training-stability.mjs) uses an [unchanged snapshot of our original trainer](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/fixtures/one-weight-training-v1.mjs). The [raw comparison](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-training-stability-comparison.json) records all settings, weights, predictions, losses, gradients, source hashes, and machine details. The rate-0.1 trace matches the earlier experiment, and eight program checks passed.

A [separate exact-rational calculation](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-training-stability-independent-check.json) checked all three traces and source identities: 51 checks passed. This verifies the recorded toy calculations. It is not evidence about a trained language model or generalization.

Run the example from the portfolio checkout with:

```sh
node tools/compare-training-stability.mjs
```

The first result is protected from overwriting. To repeat the comparison after that record exists, supply a fresh result path:

```sh
node tools/compare-training-stability.mjs perf/results/another-stability-run.json
```

No validation examples were used in this experiment, and no candidate was promoted. The earlier failed validation gate and its criteria remain unchanged. Real training can have loss spikes for several reasons, including batch variation, bad data, numerical problems, or code errors. Here, holding everything else fixed makes the learning-rate comparison interpretable.

## What we could change next

We could collect more representative examples, constrain how flexible the model is, or penalize unnecessary complexity. That last idea is called **regularization**. These are possible responses to investigate, not fixes already tested in this run.

For models trained through repeated updates, deciding when to stop can also matter. The delivery fits were calculated directly; the separate update-loop comparison changes the learning rate, not the stopping rule. Early-stopping experiments remain ahead.

Next is **Data a model can learn from** in the [roadmap](@/learn/model-engineering/roadmap.md): preparing useful examples and understanding how duplicates, misleading labels, and information leaking into evaluation can give false confidence. These three teaching examples are a first pass through failure modes, not a complete evaluation of a real application.

## Quick revision

- **Training examples** are used to fit the model. Validation examples check it without changing the fitted model.
- **Generalization** means handling unfamiliar examples usefully.
- **Underfitting** means capturing too little of the useful structure. Our fitted constant predicts 20 minutes at every distance and misses the trend.
- **Overfitting** means fitting training-specific details in a way that hurts performance on new examples.
- **Unstable updates** can bounce without improvement or move farther from a useful solution. Our same one-weight model showed both when we changed only its learning rate.
- A useful update direction still needs an appropriate size. Good learning rates depend on the model, data scale, and update rule.
- A perfect fit on six training rows was worse on our five new rows. The recorded comparison, rather than the training score alone, supports that conclusion.
- The use case sets the requirements. Representative evaluation checks whether a model meets them; a score alone does not supply those requirements.

The earlier [training-loop chapter](@/learn/model-engineering/our-first-training-loop.md) showed that improvement and meeting a requirement are different claims. This example adds another distinction: fitting the training observations and capturing a useful pattern are different claims too.
