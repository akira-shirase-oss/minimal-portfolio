+++
title = "Why I'm learning how models learn"
description = "I started by asking about an 8B blog-writing model. Then I had to ask how training even starts."
date = 2026-11-06
updated = 2026-11-11

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

## Learning update — 9 November 2026

I want a clear understanding of the concepts, with the assistant implementing the experiments and handling the calculations. I want to see what the pieces do, why they are useful, and how they fail. We can explain the math needed for an example and come back to deeper derivations when they help.

The next five topics are how learning goes wrong, preparing useful data, building a tiny language model, inspecting and resuming training, and adapting an existing model. After that pass, we will return to expanding the assistant and the later topics. The [roadmap](@/learn/model-engineering/roadmap.md#what-comes-next-9-november-2026) records this sequence.

I also want the portfolio to stay useful for revision. As we cover a topic, its chapter should keep the explanation, a small example, the relevant code, actual results, and a quick recap. The blog will record the investigations and learning decisions. At this point, the five topics were planned; the next entry records the first experiment in topic 4.

### A perfect training score can hide a problem

The first overfitting comparison now runs locally. Two small mathematical models fit the same six synthetic delivery measurements. A flexible curve matches every training row, but its average error on five new rows is 3.90 minutes. A straight line misses some training measurements and averages 0.62 minutes of error on those new rows.

The example was deliberately constructed with noisy training observations and clean checking targets. It makes one distinction visible: fitting every recorded answer does not guarantee a useful prediction between them. It is not a language-model training run or a claim that simpler models always win.

[Chapter 4](@/learn/model-engineering/how-learning-goes-wrong.md) keeps the dataset, model explanations, code links, measured outputs, limitations, and revision notes. The following entries add underfitting and unstable updates.

### Learning too little of the pattern

The next model learns just one number from the same training data: an average delivery time of 20 minutes. It predicts that time for every distance. Its average error is 5.67 minutes on the training rows and 4.80 minutes on the five checking rows.

That is underfitting in this example. The constant model has no way to express that longer distances take longer. Training its one number correctly cannot give it that missing relationship. The earlier straight line has that capability and produces less error on both sets.

The [new chapter section](@/learn/model-engineering/how-learning-goes-wrong.md#underfitting-capturing-too-little-of-the-pattern) keeps the code and recorded comparison. It also explains how application needs define useful performance. The checking cases are reused teaching examples, not a fresh final test.

### A useful direction can still produce a harmful update

The next comparison returns to our original one-weight training loop. The model, input, target, starting weight, and three-update budget stay fixed. Only the learning rate changes.

At rate 0.1, the training loss falls from 4 to 0.000256. At 0.25, the weight alternates between 2 and 4 while loss stays at 4. At 0.3, the corrections swing too far back and forth and the loss grows to about 30.118144.

The model can represent the target exactly at weight 3. Its difficulty here is how it updates. The comparison makes that separate from the fixed-time model's limited ability and the flexible curve's fit to noisy observations.

[The stability section](@/learn/model-engineering/how-learning-goes-wrong.md#unstable-training-updates-that-fail-to-settle) keeps the settings, code, traces, independent calculation checks, and revision notes. No new-example evaluation or model promotion ran. Preparing useful data is the next topic.

### Ten records are not necessarily ten useful examples

The first data exercise now inspects ten made-up support messages. Each pairs a message with its expected category. The audit retains five records, identifies one duplicate, and holds four for review: one missing text, one missing a label, and two versions of the same message with conflicting labels.

The program does not invent the missing answers or silently choose between the conflicting labels. Every record remains accounted for. This is preparation and inspection; no model was trained, and five retained examples do not establish a representative dataset.

[Chapter 5](@/learn/model-engineering/data-a-model-can-learn-from.md) keeps the input/label explanation, original fixture, code, measured counts, limitations, and revision notes. Reviewing the examples and separating training, validation, and test data are the next pieces.

## Learning update — 10 November 2026

Different IDs can make two records look separate while hiding the same message underneath. The next experiment keeps three training messages fixed and builds a lookup that remembers only those messages and their labels.

It answers all three validation copies correctly. On three different validation messages, it abstains every time. It also abstains on a separate three-message test partition. The program does not understand the messages; the copied validation view was rewarding answers it already had.

[The split lesson](@/learn/model-engineering/data-a-model-can-learn-from.md#training-validation-and-test-have-different-jobs) records the roles of training, validation, and test data, the fixed partitions, overlap checks, and actual lookup outputs. The leaky view fails the separation checks even with its perfect answer score. The tiny test fixture is an illustration, not an independent real-world benchmark.

Turning text into tokens is next, as we begin the separate tiny language-model build. The original data audit and its review records remain available unchanged.

### First, turn text into IDs

The first text-model piece now encodes `cat sat.` as `[4, 3, 7, 1, 6, 3, 7, 2]` and decodes it back exactly. Our toy tokenizer treats characters, spaces, and punctuation as pieces. The IDs are entries in a dictionary; assigning those numbers does not teach the model what the sentence means.

The next-token targets come from the text itself. After `ca`, this example supplies `t`; after `cat`, it supplies a space. The second training sentence, `cat ate.`, provides another valid continuation after `cat `. We will need predictions over possible next pieces, not a rule that every prefix has only one valid answer.

[Chapter 6](@/learn/model-engineering/from-text-to-a-tiny-language-model.md) records the fixed vocabulary, shifted input/target arrays, round trips, document boundaries, and explicit failure on the unseen `?` character. This run prepares inputs and targets. No predictive model or new-text generation has run yet.

### A first distribution over what follows

The next run fits a tiny count-based predictor. After `cat `, it gives `a` and `s` 50% each: each follows that prefix once in the training fixture. After `cat s`, it gives `a` 100% from a single matching observation. That confidence describes this tiny table, not language generally.

I can now inspect the difference between a prediction and a choice. Greedy selection picks a highest-probability token; our explicit tie rule chooses `a`. Two fixed draws illustrate how sampling can choose either `a` or `s` from the same distribution. The fitted counts stay unchanged.

The limit is visible too. The tokenizer can encode `tea`, but the predictor has no matching prefix and abstains. A separate calculated example shows two equally wrong top guesses receiving different losses because they assign 40% versus 1% probability to the observed token.

[The probability lesson](@/learn/model-engineering/from-text-to-a-tiny-language-model.md#probabilities-from-observed-continuations) records the counts, distributions, selection rules, loss calculations, and raw results. Neural weights and a full generation loop remain ahead. Adjustable scores are the next small piece.

### The probabilities can now move

I now have one recorded gradient update for the next-token task. Eight adjustable scores start at zero for the fixed prefix `cat `, giving every vocabulary token 12.5% probability. The training batch contains both observed continuations, `a` and `s`.

After one update, each of those two tokens receives about 17.73%. The mean training loss falls from 2.079442 to 1.729739. The token dictionary stays fixed; it is the scores that change. Softmax converts those scores into the new probabilities.

[The score-update lesson](@/learn/model-engineering/from-text-to-a-tiny-language-model.md#adjustable-scores-and-softmax) preserves the exact scores, gradients, probability vectors, and an independent numerical-gradient check. This is one free score vector for one context, not a complete neural text model. Learned input representations are next; unfamiliar-text quality and a full generation loop remain unmeasured.

### An ID now points to a learned vector

The next run keeps the token IDs fixed and learns two-number input vectors. After one update, `s` has vector `[0.5, 0]` and `a` has `[0, 0.5]`. A deliberately simple frozen output head turns them into different next-token scores. The target probabilities for `cat s` → `a` and `cat a` → `t` each rise from 12.5% to about 19.67%.

The limit is visible: this predictor reads only the last character. It gives `tea` and `cat a` identical predictions because both end in `a`. The vector lookup is working, but earlier context cannot help until the model consumes it.

[The embedding lesson](@/learn/model-engineering/from-text-to-a-tiny-language-model.md#token-ids-and-learned-embeddings) records the learned vectors, unchanged head, gradients, mean training loss, and an independent check of all sixteen parameter gradients. Positions and the use of more than the last token are next. The run does not establish semantic understanding or unfamiliar-text quality.

### The tool-using assistant met its first failures

I asked my local Qwen assistant about a project with no saved note. It answered fluently, confidently, and wrongly: the tool's schema only allowed "portfolio", so the model looked up *portfolio* anyway and presented its deploy command as the answer for `blog-api`. Every check inside the program passed.

Fixing it did not need a smarter model. The tool now accepts any project name and returns an honest not-found error. Then a port question exposed a different failure: the note records no port, so the model filled the gap from memory — "Zola's default, 1111." A system-prompt clause telling it to report missing facts fixed that, and quietly broke a different case, which only re-running all the recorded cases caught.

We now keep a small case suite and re-run every case after any change. [The updated harness chapter](@/learn/model-engineering/the-harness-around-the-model.md#the-first-failures-11-november) records each failure, where each fix lived, and the honest limits. Fourteen traces, one manifest, no weight updates — prompt and tool-contract work only.

### A run I can stop, and a fix I can take back

Two more firsts today. A tiny 8-step training run learned to checkpoint itself: it stopped at step 4, wrote its whole state to a JSON file, exited, and a different process picked it up and finished — landing on exactly the same final weight as a run that never stopped. Resume isn't something you hope for; on a deterministic run it's something you can prove bit-for-bit.

Then my old failed validation candidate got three second chances: frozen (still fails), full fine-tune (works, but the old weight is gone), and a small adapter delta trained while the base weight stayed frozen (works, and removing it puts the baseline back exactly). That revert property is the whole reason adapters exist at real scale — it's LoRA's idea with one number instead of billions.

[Chapter 7](@/learn/model-engineering/training-runs-we-can-inspect-and-resume.md) and [chapter 8](@/learn/model-engineering/adapting-an-existing-model.md) have the recordings and the honest limits. Both are toy-scale: no LLM checkpointing or adapter training has run yet.

### The model looked back — and wrote its first text

Two pieces I had been circling finally ran inside chapter 6. First, attention: the last token's vector now queries every earlier position, softmax turns the similarity scores into weights, and a weighted blend becomes the context. In `cat sa` the two `a` positions tied for the top weight — the mechanism found the matching tokens by itself. And `cat a` versus `tea`, which the last-token predictor could not tell apart, now produce different predictions.

Then the surprise the mechanism was hiding: `cat ` and `tac ` — same characters, different order — produced identical context. Attention reads a bag of tokens, not a sequence. Order only became visible after adding declared position vectors, which is why every real transformer carries them.

Second, the generation loop: predict, select, append, repeat. Greedy wrote `cat ate.`, sampled wrote `cat sat.` — and both are verbatim training sentences, because a count model can only recite what it memorized. The honest limit is the lesson: generation is a loop over knowledge, not new knowledge. [Chapter 6](@/learn/model-engineering/from-text-to-a-tiny-language-model.md) records both runs and their limits; training attention weights is next.
