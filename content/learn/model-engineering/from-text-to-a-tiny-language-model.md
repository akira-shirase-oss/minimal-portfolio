+++
title = "From text to a tiny language model"
description = "Text becomes tokens, targets, and probabilities. After a count predictor, one gradient update now changes eight adjustable next-token scores."
date = 2026-11-10
updated = 2026-11-10
weight = 6

[extra]
kind = "chapter"
chapter = 6
status = "tokenizer, count predictor, and one fixed-context score update run; a full neural text model remains ahead"
+++

We are starting a separate tiny text model. The first piece prepares its inputs: text becomes token IDs, and the text itself supplies the expected next pieces.

The first run built a character tokenizer and prepared targets. A second run fitted a count-based predictor and selected individual next tokens. A third run now updates eight adjustable scores for one fixed prefix. Neural context processing, learned token representations, and a full text-generation loop remain ahead. Qwen's weights are unchanged.

## Tokens are pieces of text

A **token** is a piece of text that a tokenizer represents as one item. Our small tokenizer uses one character per token for these ASCII examples. Spaces, punctuation, and newlines count too.

Other tokenizers can use different pieces, including parts of words or bytes. A token does not always mean a whole word. Our character choice makes each step easy to inspect.

The two training documents are:

```text
cat sat.
cat ate.
```

Each document includes its own ending newline. They are two separate records, not one joined training string. The separate validation record is `tea.` followed by a newline. It does not contribute to fitting the tokenizer.

## A vocabulary gives each piece an ID

The **vocabulary** is our fixed list of tokens. We collect characters from training documents only, sort them by character code, and assign IDs beginning at zero:

| Token | ID |
| --- | ---: |
| Newline (`\n`) | 0 |
| Space | 1 |
| `.` | 2 |
| `a` | 3 |
| `c` | 4 |
| `e` | 5 |
| `s` | 6 |
| `t` | 7 |

These IDs identify entries in this particular dictionary. They are not amounts of meaning, model weights, or learned representations. A larger ID does not mean a more important token. A different tokenizer can assign different IDs and use different pieces.

The model will later learn numerical representations and predictions using these IDs. Assigning the IDs alone does not perform that learning.

## Encode text, then decode it

**Encoding** turns text into token IDs. Our recorded example is:

```text
Text:    c  a  t  [space]  s  a  t  .
IDs:     4  3  7     1     6  3  7  2
```

The full ID array for `cat sat.` is **`[4, 3, 7, 1, 6, 3, 7, 2]`**.

**Decoding** uses the same dictionary in reverse. Those IDs reconstruct exactly `cat sat.`, including its space and full stop. This reconstructs text we supplied; it is not a model inventing a new sentence.

A token ID also has a different job from the record IDs in [chapter 5](@/learn/model-engineering/data-a-model-can-learn-from.md). A record ID tracks one example. A token ID consistently identifies one vocabulary item wherever it appears.

## Where do next-token targets come from?

For our earlier message-routing task, a label such as `billing` supplied the expected output. Here the text supplies its own next-token targets.

For the first sentence, the program prepares these examples:

| Text visible so far | Next piece in this recorded sentence |
| --- | --- |
| `c` | `a` |
| `ca` | `t` |
| `cat` | Space |
| `cat ` | `s` |
| `cat s` | `a` |
| `cat sa` | `t` |
| `cat sat` | `.` |

The model's job is to predict the next piece using the text available so far. At that position, it must not see later pieces as a hint. The first run prepared these examples; the count-based predictor later in this chapter uses an exact match on that visible prefix.

The same relationship appears as two arrays shifted by one position:

```text
Input IDs:   [4, 3, 7, 1, 6, 3, 7]
Target IDs:  [3, 7, 1, 6, 3, 7, 2]
```

At each position, the target is the next token. A model can use the prefix up to that position; these arrays do not mean that it must look only at the immediately previous character. We will control access to earlier and later positions when we implement the predictor.

This way of deriving targets from the data is a **self-supervised** setup. A person does not need to label every next character manually.

There can be several valid continuations. Our second training document contains `cat ate.`, so the prefix `cat ` is followed by `s` in one document and `a` in the other. That is normal for language continuation. The count model below turns those observations into probabilities.

## Preserve document boundaries and the dictionary

The two training records contain **18 tokens** in total and provide **16 next-token prediction positions**: eight within each nine-token document. The program does not make the last character of one document predict the first character of an unrelated document.

The newline is an ordinary character with ID 0. We have not added special beginning, ending, padding, or unknown tokens. The dictionary stays fixed while encoding validation text.

Our additional probe, `cat?`, was rejected because `?` is absent from the training vocabulary. The recorded error identifies it at index 3, the fourth character. The program did not silently drop it or enlarge the vocabulary from the probe.

That strict failure is a limitation of this small tokenizer. A larger design can use a different vocabulary or a defined fallback strategy. Whichever design we choose, the saved dictionary must keep the same ID-to-piece meaning when the model is used later.

## What ran for tokenization

The [text fixture](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/fixtures/tiny-text-tokens-v1.json), [tokenizer](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/character-tokenizer.mjs), and [inspection runner](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/inspect-text-tokens.mjs) use Node's built-in libraries. The [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-text-tokenization.json) preserves the vocabulary, document IDs, token arrays, visible prefixes, targets, unknown-character failure, source hashes, and machine details.

Ten program checks passed: text round trips, correct shifting and prefix boundaries, no targets across documents, preservation of ID 0, and explicit rejection of unknown characters and invalid IDs. A [separate check of hand-written expected IDs and targets](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-text-tokenization-independent-check.json) passed sixteen checks.

Run it from the portfolio checkout:

```sh
node tools/inspect-text-tokens.mjs
```

The first result is protected from overwriting. For a later run, choose a fresh result path:

```sh
node tools/inspect-text-tokens.mjs perf/results/another-tokenization-run.json
```

Validation encoding here checks whether text can be represented and reconstructed. It is not a model-quality score. No predictive-model training, generation, test-set evaluation, or promotion has run in this step.

## Probabilities from observed continuations

The next piece is an **exact-prefix count model**: it counts which tokens follow each whole prefix in the training documents. It fits its table using the same two training documents only. Each document starts a fresh prefix, preserving the earlier document boundaries.

For the prefix `cat `, it finds two observations:

| Next token | Times observed | Probability from this table |
| --- | ---: | ---: |
| `a` | 1 | 50% |
| `s` | 1 | 50% |
| Every other vocabulary token | 0 | 0% |

Each of the two observed continuations gets one out of two observations, or 50%. The complete list of probabilities is called a **distribution**. Its entries add to 100%.

More context changes the lookup. After `cat s`, the only recorded continuation is `a`, so the table gives `a` 100%. After `cat a`, it gives `t` 100%.

These are frequencies in two invented sentences. A 100% entry here does not establish certainty about language generally. A zero means that this table has no observation of that continuation; it does not prove the continuation is impossible. This first model has no smoothing, which would adjust the raw counts to give unobserved possibilities some probability.

The core calculation is small:

```js
const total = counts.reduce((sum, count) => sum + count, 0);
const probabilities = counts.map(count => count / total);
```

For a known prefix, each token's count is divided by the total number of observed continuations. When the whole prefix has never been observed, our implementation reports `UNSEEN_PREFIX` and supplies no probability vector.

The probe `tea` demonstrates that limit. Its characters all have IDs, but the model has never seen that prefix in training. It abstains. The tokenizer can represent the input while the predictor still cannot handle it. The probe does not add any counts or change the vocabulary.

This predictor stores exact prefixes. It has not learned general representations that connect different contexts. The adjustable-score example below introduces parameter updates; learned representations remain a later piece.

## A distribution and a selected token are different things

The model supplies probabilities. A **selection rule** chooses one token from them.

**Greedy selection** chooses a token with the highest probability. At `cat `, `a` and `s` tie. Our program resolves that tie by choosing the lower vocabulary ID, so it selects `a`. That is an implementation convention, not evidence that `a` is a better continuation.

**Sampling** uses a random draw to select according to the probabilities. To make this step inspectable, our run supplies two fixed draws instead of generating random ones:

| Supplied draw | Selected next token |
| ---: | --- |
| 0.25 | `a` |
| 0.75 | `s` |

The first half of the interval from zero to one belongs to `a`; the second half belongs to `s`. These two fixed examples illustrate the selection mechanism. They are not a sampling-frequency experiment, and a random sample would not guarantee an exact 50/50 split in a small number of draws.

Changing this selection rule leaves the fitted count table unchanged. We have selected individual next tokens, without implementing the repeated predict → select → append cycle needed for a full text-generation loop.

## Why top-guess accuracy does not tell the whole story

Suppose the observed target is `a`. The runner also calculates this separate, hand-specified example:

| Hypothetical prediction | Probability of `a` | Probability of `s` | Top guess correct? | Loss for observed `a` |
| --- | ---: | ---: | --- | ---: |
| First distribution | 40% | 60% | No | 0.916291 |
| Second distribution | 1% | 99% | No | 4.605170 |

Both choose `s` first, so top-guess accuracy marks both wrong on this target. The first distribution assigned much more probability to the token that appeared.

The recorded loss is **negative log likelihood**: a penalty calculated from the probability of the observed target. The runner uses the natural logarithm. Lower target probability produces a larger penalty; higher target probability produces a smaller one. In next-token neural training, this provides a signal for changing the probabilities even when the highest-ranked guess has not changed yet.

The numbers above are computed illustrations. They are not predictions from our count model, and no neural weights were trained to obtain them. Over many examples, the objective considers all the observed targets; one example alone does not establish the best distribution for language generally.

## What ran for the probability lesson

The [count model and selection rules](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/prefix-count-model.mjs) and [inspection runner](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/inspect-next-token-probabilities.mjs) fit **12 distinct prefix entries from 16 within-document observations**. They preserve the full count table, probability vectors, selection examples, hypothetical loss calculations, source hashes, and machine details in the [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-next-token-probabilities.json).

Twelve program checks passed. A [separate check](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-next-token-probabilities-independent-check.json) passed sixteen checks against a hand-written twelve-prefix table, expected probability vectors and selections, and an independent loss calculation.

```sh
node tools/inspect-next-token-probabilities.mjs
```

The first result is protected. Supply a fresh result path for a later run:

```sh
node tools/inspect-next-token-probabilities.mjs perf/results/another-probability-run.json
```

A count-based predictive model was fitted and queried in this step. No neural network, trainable-weight update, held-out quality measurement, test-set evaluation, or full text-generation loop has run. The original tokenization result remains unchanged.

## Adjustable scores and softmax

The next experiment replaces the direct frequency calculation with **eight adjustable scores**, one per vocabulary token, for the single fixed prefix `cat `. These scores are model parameters: the numbers that this training step can change. The token IDs and vocabulary stay fixed.

A raw score is also called a **logit**. It can be negative, and the scores do not need to add to one. A function called **softmax** converts the score vector into a probability distribution. Higher scores give higher probabilities relative to the other scores in that vector.

This example attaches a free score vector to one fixed context. A full neural language model computes context-dependent scores through learned weights and intermediate representations. We have not built that context-processing network yet; this is its output-and-update mechanism in isolation.

The conversion uses four short steps:

```js
const maximum = Math.max(...scores);
const positive = scores.map(score => Math.exp(score - maximum));
const total = positive.reduce((sum, value) => sum + value, 0);
const probabilities = positive.map(value => value / total);
```

First, subtract the largest score from every score. This keeps the exponential calculation numerically manageable while preserving the resulting probabilities. `Math.exp` converts each shifted score into an exponential value. Dividing each value by their total makes the probabilities add to one.

All eight scores start at zero. Their exponential values are all one, so each token receives one eighth of the probability: **12.5%**. These are initial probabilities from the new score model, rather than the earlier count model's fitted 50/50 result.

## One training update changes the distribution

We select exactly two training positions from the existing fixture:

| Prefix | Observed target | Training document |
| --- | --- | --- |
| `cat ` | `s` | `cat sat.` |
| `cat ` | `a` | `cat ate.` |

Both positions belong to training documents. The other fourteen available next-token positions are unused in this deliberately small update. Validation and test examples do not supply targets.

The program calculates the mean negative-log-likelihood loss over these two targets, then computes its gradient with respect to the eight scores. A **batch** means the examples considered together for this update. Here both valid observed continuations contribute equally.

The earlier training cycle now applies to next-token scores: **scores → probabilities → loss → gradient → updated scores**. The selected learning rate is 1 for this controlled example; it is not a general recommendation for other models.

Before the update, `a` and `s` each receive 12.5% predicted probability but each accounts for 50% of this training batch's targets. Their score gradients are −0.375. The other six tokens each receive 12.5% predicted probability and account for none of this batch's targets; their gradients are +0.125.

Subtracting learning rate times gradient increases the first two scores and decreases the other six:

```js
const nextScores = scores.map(
  (score, id) => score - learningRate * gradient[id]
);
```

`score` is the current parameter, `gradient[id]` is its loss gradient, and `learningRate` controls the update size. The program then recomputes probabilities from the updated scores. It does not set the new probabilities by hand.

| Token | Score before | Score after | Probability before | Probability after |
| --- | ---: | ---: | ---: | ---: |
| `a` | 0 | 0.375 | 12.50% | 17.73% |
| `s` | 0 | 0.375 | 12.50% | 17.73% |
| Each of the other six tokens | 0 | −0.125 | 12.50% | 10.76% |

Probabilities in the table are rounded. The full recorded vector sums to one. Both observed continuations gain probability, and the **mean training loss falls from 2.079442 to 1.729739**.

This is a measured parameter update on the same two training examples. It does not establish improved behavior on unseen text. One update also does not reproduce the earlier count model's 50/50 distribution; the score model has just begun learning from its equal-probability initialization.

## What ran for the score update

The [score functions](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/next-token-scores.mjs) and [runner](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/tools/inspect-score-update.mjs) execute exactly one full-batch gradient step on eight parameters. The [raw result](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-next-token-score-update.json) preserves the selected examples, initial and updated scores, probabilities, loss, fresh gradients, settings, source hashes, and machine details.

Twelve program checks passed. A [separate independent check](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/first-next-token-score-update-independent-check.json) passed sixteen checks, including hand-written expected scores, independent probability/loss calculations, and a numerical approximation of the gradient. The maximum difference between that approximation and the recorded analytic gradient was below 0.00000001.

```sh
node tools/inspect-score-update.mjs
```

The first result is protected. Use a fresh result path for a later run:

```sh
node tools/inspect-score-update.mjs perf/results/another-score-update.json
```

Trainable parameters changed in this run. A full neural language model, embeddings, attention, predictions for other contexts, held-out quality measurement, test-set evaluation, and text generation remain ahead. The earlier tokenizer and count-model results remain unchanged.

## Quick revision

- Tokens are the text pieces our tokenizer works with; this example uses characters.
- A vocabulary maps those pieces to fixed IDs. IDs themselves do not supply meaning or train weights.
- Encoding maps text to IDs; decoding maps IDs back to text with the same dictionary.
- For next-token learning, the following piece in the text supplies the target.
- Several continuations can be valid. A probability distribution assigns a probability to each possible next token.
- Our first predictor turns exact-prefix counts into probabilities; unseen prefixes cause abstention.
- Greedy selection and sampling choose tokens from a distribution. Changing the selection rule does not train the model.
- Probability-sensitive loss distinguishes predictions even when their top guesses have the same accuracy.
- Producing the distribution is the prediction step. Selection then chooses a token from it.
- Logits are raw scores; softmax turns them into probabilities that sum to one.
- Training can update scores through the loss gradient. Our one-step example increases probability for both observed continuations.
- Lower loss on the training examples is a different claim from improved predictions on unseen text.

Next we will connect different input contexts to numerical representations that can be learned, before building the context-processing model and attention. The eight-score update is a small working piece, not the completed text model.
