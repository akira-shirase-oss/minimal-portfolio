+++
title = "Data a model can learn from"
description = "Inspect examples and separate their roles. Small support-message experiments show data problems and how duplicate leakage can produce a misleading validation score."
date = 2026-11-09
updated = 2026-11-10
weight = 5

[extra]
kind = "chapter"
chapter = 5
status = "synthetic data audit and split-leakage comparison run; broader data review and neural-model training remain ahead"
+++

[Chapter 4](@/learn/model-engineering/how-learning-goes-wrong.md) showed that the model and its updates can go wrong. The examples we give it can also be incomplete, repetitive, or misleading. A training program can run correctly while learning from poor instructions.

This first data lesson uses ten made-up support messages. We inspected them with a small program before training any model. No real customer records, model calls, or weight updates were involved.

The later split lesson reuses the retained examples in a separate fixture and builds a simple exact-message lookup baseline. It shows why evaluation needs messages that are sufficiently separate from training.

## Start with the task

Our task is to put a support message into one category: **billing**, **account access**, or **bug report**.

One example is:

```json
{
  "id": "s08",
  "text": "I was charged twice for one order.",
  "label": "billing"
}
```

The **input** is the message text. The **label** is its expected category. The ID lets us track the example through inspection and later changes.

A **dataset** is a collection of examples. In this **supervised-learning** task, each training example includes an input and an expected output. During training, the program compares the model's prediction with that output. The label is not included in the message as a hint when making the prediction.

This dataset is designed for routing messages. If the task were writing replies, the desired outputs would be replies, rather than category names. For our later next-token text model, targets will come from the text itself; a person does not need to write a separate answer for every token. The task determines what an example needs to contain.

## Inspect the records before using them

The fixture deliberately includes problems:

| Record or records | What the audit found | What the program did |
| --- | --- | --- |
| `s01` and `s04` | Same invoice request and label, with different capitalization and outer spaces | Kept `s01`; recorded `s04` as its duplicate |
| `s02` and `s05` | Identical sign-in message labeled both `account_access` and `billing` | Held both for review |
| `s06` | A label with no message text | Held for review |
| `s07` | A password-reset message with no label | Held for review |

For this teaching task, the duplicate comparison ignores capitalization and repeated whitespace. It preserves the original text of the retained row. That is a chosen policy for these short messages, not a universal rule: capitalization can carry meaning, and this simple comparison does not recognize paraphrases.

Repeating an example gives it more influence during training. Repetition can be intentional, but this fixture treats the extra invoice row as an accidental duplicate.

The conflicting labels need a different response. The program does not guess a replacement label or choose whichever one appears first. It holds every conflicting version for review. For this single-category task, we need to investigate why identical observed input has different targets. Other tasks can legitimately have several valid outputs; variety alone is not an error.

Missing fields also remain visible. We do not invent the missing message or silently fill in a label.

## What actually ran

The [fixed dataset](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/fixtures/support-intent-v1.json) and [audit program](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/audit-training-data.mjs) produced this partition:

| Outcome | Records |
| --- | ---: |
| Input records | 10 |
| Retained under the declared checks | 5 |
| Duplicate recorded separately | 1 |
| Held for review | 4 |

The four review records are two conflicting-label versions, one missing-text record, and one missing-label record. Every input ID is accounted for exactly once. The [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-training-data-audit.json) preserves the original fixture, each retained row, duplicate relationships, review reasons, policies, source hashes, and machine details.

Eight program checks passed, including record accounting, disjoint output groups, duplicate relationships, and preservation of retained text. A [separate check against hand-reviewed expected IDs and counts](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-training-data-independent-check.json) passed all twelve checks.

Run it from the portfolio checkout with:

```sh
node tools/audit-training-data.mjs
```

The first audit result is protected from overwriting. If the record already exists, use a fresh path for another run:

```sh
node tools/audit-training-data.mjs perf/results/another-data-audit.json
```

## What a successful audit does not establish

These checks show that the program applied its declared rules to these ten records. They do not prove that every retained label is correct, that the examples cover real requests, or that a model trained on them would perform well.

The retained subset has **two billing messages, two bug reports, and one account-access message**. Five short messages are too few and too narrow to establish useful model performance. A clean-looking file can still have poor coverage.

At that initial audit stage, no training, validation, or test split had been created, and no model had been trained. It prepared a small subset for further inspection. The following experiment adds a split comparison; it does not turn five short messages into a representative dataset.

## Training, validation, and test have different jobs

We separate examples by how they may influence development:

| Partition | Its job |
| --- | --- |
| **Training** | Fit the model from examples; in a neural model, this includes weight updates. |
| **Validation** | Check candidate versions and help choose settings during development. |
| **Test** | Assess the chosen version after those development decisions. |

The model stays fixed while we score validation or test examples. Validation scores can guide a later change, but the scoring step itself does not train on those answers. If we repeatedly change the model based on test results, that set becomes part of development too.

The partitions need more than different file names or record IDs. Copies of a training message can make a validation example appear new while giving the model an answer it already remembers. This is one form of **data leakage**: information crosses a boundary that was meant to keep evaluation separate.

## A fixed demonstration of duplicate leakage

The [new split fixture](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/fixtures/support-split-demo-v1.json) reuses all five retained messages and the invoice duplicate from the audit, then adds four distinct messages and two duplicate variants. The original audit and its missing or conflicting records remain unchanged. We have not silently repaired them.

There are **12 records containing 9 distinct normalized messages**. For the version with separate groups, we remove the three duplicate rows and assign the nine remaining messages to declared groups before fitting or scoring:

- Three training messages: one for each category.
- Three different validation messages: one for each category.
- Three different test messages: one for each category.

The **group** identifies a message and its copies, not its category. Billing examples can belong in every partition; copies of the same invoice request should not cross from training into validation. In real datasets, records from the same conversation, document, or other shared source can also need to stay together even when their wording differs.

These three-example partitions are deliberately small so we can inspect every row. They are not recommended dataset sizes or split ratios.

### Use one model for both validation views

Our baseline remembers the normalized text and label of the **three training messages only**. Given that same text again, it returns the stored label. Given different text, it abstains: it has no stored answer and performs no semantic inference. This is a lookup demonstration, not a neural network or language model.

We fit that lookup once, then keep it unchanged. We compare two predefined validation views:

1. **A deliberately leaky view:** three copies of training messages with different IDs and superficial changes in capitalization or whitespace.
2. **A view with separate groups:** three different messages absent from training.

For example:

```text
Training s01:    Please send my invoice.
Leaky check s04:   PLEASE send my invoice.
```

The IDs differ, but our normalization treats the messages as identical. An ID-only overlap check misses this problem. The program's message and group checks reject the leaky view.

### What the program recorded

| Evaluation view | Correct answers | Abstentions |
| --- | ---: | ---: |
| Leaky validation: copies of training messages | 3 out of 3 | 0 |
| Validation: different messages | 0 out of 3 | 3 |
| Test: another separate set of messages | 0 out of 3 | 3 |

An abstention counts as not correct when calculating the fraction of all cases answered correctly. It is reported separately from a wrong category prediction. The baseline did not invent three wrong labels on the new cases; it had no answer for them.

The training messages and lookup stayed fixed. The perfect score came from the contaminated validation view, not an improvement in the baseline's ability to handle unfamiliar messages. This example demonstrates how leakage can reward memorization. It does not predict how well a real trained classifier would perform.

The separate test partition was evaluated once after the lookup and validation views were fixed. We did not select a candidate version or change a setting from its answers. Because the author deliberately constructed and inspected this tiny fixture, its test result is an illustration of the role, not an independent real-world final benchmark.

The [split runner](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/compare-data-splits.mjs) and [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-data-split-comparison.json) preserve all records, exact partition membership, excluded duplicates, overlap diagnostics, lookup contents, and per-case outputs. Ten program checks passed. The deliberate leaky view remains rejected even though its answer score is perfect.

A [separate check against hand-reviewed expected IDs and outputs](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-data-split-independent-check.json) passed 22 checks. These establish the recorded fixture behavior and separation checks, not broad model quality.

Run it from the portfolio checkout with:

```sh
node tools/compare-data-splits.mjs
```

The first result is protected from overwriting. For another run, give a fresh result path:

```sh
node tools/compare-data-splits.mjs perf/results/another-split-comparison.json
```

## Carry these checks into the next build

This first pass has inspected records and made a separation failure visible. Broader coverage, questionable-label review, detection of less obvious duplicates, and evaluation on representative data remain important work.

Next is **From text to a tiny language model** in the [roadmap](@/learn/model-engineering/roadmap.md). We will begin by turning text into tokens, then prepare examples for predicting what comes next. Dataset versioning and the separation principles from this chapter will carry into that build.

## Quick revision

- Start with what the model should do; that determines the required inputs and outputs.
- A label is an expected answer supplied for a labeled task, not a model prediction.
- Keep missing and conflicting information visible for review.
- Duplicate handling is a policy choice that can affect example weighting and evaluation.
- Training examples fit the model; validation guides development; test data is reserved for assessing the chosen version.
- Different IDs do not guarantee independent messages. Check copies and related source groups across partitions.
- A lookup got all three copied validation cases right and abstained on all different messages. The score alone concealed the leak.
- Successful data checks and useful model performance are separate claims. This chapter ran an audit and a small lookup demonstration, not neural-model training.
