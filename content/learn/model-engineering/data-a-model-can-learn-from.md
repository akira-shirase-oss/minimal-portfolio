+++
title = "Data a model can learn from"
description = "Start with the task, then inspect the examples. A small support-message dataset shows missing fields, duplicate messages, and conflicting labels."
date = 2026-11-09
updated = 2026-11-09
weight = 5

[extra]
kind = "chapter"
chapter = 5
status = "first synthetic labeled-data audit run; data splits and model training remain ahead"
+++

[Chapter 4](@/learn/model-engineering/how-learning-goes-wrong.md) showed that the model and its updates can go wrong. The examples we give it can also be incomplete, repetitive, or misleading. A training program can run correctly while learning from poor instructions.

This first data lesson uses ten made-up support messages. We inspected them with a small program before training any model. No real customer records, model calls, or weight updates were involved.

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

No training, validation, or test split has been created yet, and no model has been trained. We have prepared a small subset for further inspection, not demonstrated a better model.

## The next small step

We will review questionable examples, expand the small fixture, and separate examples by their roles before tuning a model:

- **Training:** examples used to change the model.
- **Validation:** examples used to check candidate versions and guide development.
- **Test:** examples reserved for a final assessment after development choices.

Duplicates or closely related records can make an apparently new example look easier because the model has already seen its counterpart. The upcoming split exercise will make that problem visible. It has not run yet.

## Quick revision

- Start with what the model should do; that determines the required inputs and outputs.
- A label is an expected answer supplied for a labeled task, not a model prediction.
- Keep missing and conflicting information visible for review.
- Duplicate handling is a policy choice that can affect example weighting and evaluation.
- Successful data checks and useful model performance are separate claims. This lesson ran a data audit only.
