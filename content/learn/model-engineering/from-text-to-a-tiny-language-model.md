+++
title = "From text to a tiny language model"
description = "Our first piece turns characters into token IDs, reconstructs the text, and prepares next-token targets. Prediction and model training come next."
date = 2026-11-10
updated = 2026-11-10
weight = 6

[extra]
kind = "chapter"
chapter = 6
status = "character tokenizer and next-token targets run; predictive model training has not started"
+++

We are starting a separate tiny text model. The first piece prepares its inputs: text becomes token IDs, and the text itself supplies the expected next pieces.

This run built a character tokenizer, reconstructed its inputs, and prepared training targets. It did not train a predictive model, generate new text, or change Qwen's weights.

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

The model's job will be to predict the next piece using the text available so far. At that position, it must not see later pieces as a hint. We have prepared the examples, not implemented that predictor yet.

The same relationship appears as two arrays shifted by one position:

```text
Input IDs:   [4, 3, 7, 1, 6, 3, 7]
Target IDs:  [3, 7, 1, 6, 3, 7, 2]
```

At each position, the target is the next token. A model can use the prefix up to that position; these arrays do not mean that it must look only at the immediately previous character. We will control access to earlier and later positions when we implement the predictor.

This way of deriving targets from the data is a **self-supervised** setup. A person does not need to label every next character manually.

There can be several valid continuations. Our second training document contains `cat ate.`, so the prefix `cat ` is followed by `s` in one document and `a` in the other. That is normal for language continuation. The next step will explain how a model assigns probabilities to possible next tokens.

## Preserve document boundaries and the dictionary

The two training records contain **18 tokens** in total and provide **16 next-token prediction positions**: eight within each nine-token document. The program does not make the last character of one document predict the first character of an unrelated document.

The newline is an ordinary character with ID 0. We have not added special beginning, ending, padding, or unknown tokens. The dictionary stays fixed while encoding validation text.

Our additional probe, `cat?`, was rejected because `?` is absent from the training vocabulary. The recorded error identifies it at index 3, the fourth character. The program did not silently drop it or enlarge the vocabulary from the probe.

That strict failure is a limitation of this small tokenizer. A larger design can use a different vocabulary or a defined fallback strategy. Whichever design we choose, the saved dictionary must keep the same ID-to-piece meaning when the model is used later.

## What actually ran

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

## Quick revision

- Tokens are the text pieces our tokenizer works with; this example uses characters.
- A vocabulary maps those pieces to fixed IDs. IDs themselves do not supply meaning or train weights.
- Encoding maps text to IDs; decoding maps IDs back to text with the same dictionary.
- For next-token learning, the following piece in the text supplies the target.
- Several continuations of a prefix can be valid. Prediction and probabilities are the next piece of the build.
