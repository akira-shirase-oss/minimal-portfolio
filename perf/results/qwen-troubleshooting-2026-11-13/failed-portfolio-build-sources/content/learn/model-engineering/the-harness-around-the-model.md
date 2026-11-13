+++
title = "The harness around the model"
description = "Our first practical Qwen build: request a tool, run a bounded lookup, return its result, inspect the answer, and repair the failures it reveals."
date = 2026-11-07
updated = 2026-11-13
weight = 9

[extra]
kind = "chapter"
chapter = 9
status = "lookup failure cases recorded; saved-build tool passes offline checks; new Qwen inference blocked by runtime access"
+++

We are moving to learning by building useful pieces and investigating their behavior. The earlier numerical chapters remain references. This is the first practical slice of a local assistant we can improve together.

The question was: **“What command publishes my portfolio, and does pushing to GitHub publish it? Use my saved project note.”**

## What ran

The existing local **Qwen3-8B** model received that question and a description of one available tool. It requested:

```json
{"name":"lookup_project","arguments":{"project_name":"portfolio"}}
```

Our program checked the requested name and arguments, then returned a saved note. That note included the build command, deployment command, and the fact that a Git push does not publish this site.

The program sent the tool's result back to Qwen. Its final answer included:

```sh
wrangler pages deploy public --project-name akira-shirase-oss --branch main
```

It also explained that the site needs to be built with `zola build` and that pushing source to GitHub does not automatically deploy it. The tool only read the note; it never executed that command.

## What the harness does

The **harness** is the surrounding program that prepares a request, decides which actions are available, runs allowed tools, returns their results, and records what happened.

```text
Question → model requests a tool → our code validates and runs it
         → tool result goes back to the model → answer
```

The model produces a request to call a function. Our program performs the actual lookup. This boundary is important: model-generated text does not become an arbitrary shell command or a file path.

The tool accepts a project name and returns its saved note, or a not-found error naming the available projects. Unknown tool names, missing arguments, and extra arguments are rejected. The runner limits model turns, tool requests, and request duration. (The first version only accepted `portfolio`; the failure story below explains why that changed.)

This follows [Ollama's tool-calling API](https://docs.ollama.com/capabilities/tool-calling): include tool descriptions, retain the assistant's tool request, and send the tool result in a follow-up message.

## Read one piece at a time

There are three small files in the local learning workspace:

- `project-notes.json`: the facts our lookup can return.
- `lookup-project.mjs`: the tool description, argument checks, and lookup function.
- `run.mjs`: the question → tool → answer cycle and saved trace.

The [baseline source snapshot](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-tool-use-baseline-sources) preserves those exact original files; the [2026-11-11 snapshot](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-tool-use-2026-11-11-sources) preserves the current ones. They use Node's built-in HTTP and filesystem support. No new website script or interactive section is added by this chapter.

To run the saved program from the private `model-engineering` workspace, with Ollama running and the model installed:

```sh
node labs/qwen-tool-use/run.mjs
```

We will read the lookup function and its actual trace together before adding more tools.

## What the first run establishes

The recorded run used one valid lookup and two model responses. It took about **8.8 seconds** in that single local run. That timing is one observation, not a throughput or latency benchmark.

The [saved trace](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/qwen-tool-use-baseline.json) contains the model identity, settings, source hashes, requests, tool arguments, returned note, final answer, and timing. The original source is preserved so later changes can be compared with it.

This shows that the first request/tool/result cycle ran and answered this particular question from the note. It does not establish broad tool-use reliability. It used existing weights: no fine-tuning or weight update happened.

## The first failures, 11 November

The first run answered one question correctly. That is a start, not reliability. On 11 November we ran a small set of harder questions on purpose, to find where the boundary breaks. Four kinds of trouble appeared in one afternoon — and none of them needed a smarter model to fix.

### The enum trap

Asking about a project with no saved note — `blog-api` — produced the most dangerous failure kind: a **silent confident wrong answer**. The tool's argument schema only allowed `"portfolio"`, so the model called `lookup_project("portfolio")` — the only legal call — received the portfolio note, and presented the portfolio deploy command as the answer for `blog-api`. Every check inside the program passed; the answer was still wrong.

The fix was in the tool contract, not the model: the tool now accepts any project name and returns a not-found error listing the available projects. On the same question the model then asked for `blog-api`, heard the truth, and answered honestly that no note exists.

### The gap-filler

Asked which port the portfolio runs on, the model looked up the note — which records no port — and answered anyway: "the default port for Zola, which is typically 1111." Plausible, and invented. When retrieved evidence has a gap, the model's instinct is to fill it from its own memory without saying so.

The fix this time was a system-prompt clause: if the saved note does not contain the fact, say the note does not record it — do not fill gaps from your own knowledge.

### The regression

That prompt fix taught the model the *shape* of an honest answer — and the next run of "How do I publish?" produced the shape without the substance: **"The note does not record how to publish,"** claimed without any lookup at all. Only re-running the earlier cases caught it. A second clause — ask which project when none is named, and never describe a note's contents without looking it up — restored honest behavior: it now asks which project you mean.

### The small recorded suite

We now keep these questions as a case set and re-run all of them after any change:

| Question | First result | After the repairs |
|---|---|---|
| Portfolio publish command | correct | correct |
| Deploy `blog-api` (no note saved) | silently wrong | honestly reports no note |
| `How do I publish?` (no project named) | clarified → regressed | asks which project |
| Portfolio's port (not recorded) | invented "port 1111" | reports the gap |

A fifth case — "what port does my *portfolio server* run on?" — showed the model grabbing the wrong span of text as the project name (`"portfolio server"`). The not-found error turned it into a polite clarification instead of a wrong answer. Recorded, not yet fixed.

### What this teaches

- **A green run is not a correct answer.** Status, valid tool calls, and fluent text can all pass while the answer is wrong.
- **Fix location matters.** Nothing touched the model's weights: the tool-contract fix let the model *express* the real request, and the prompt fixes told it what to do with uncomfortable truths. Deciding where a fix belongs — prompt, tool schema, harness logic, data, or later weights — is half of applied model engineering.
- **Prompts are whack-a-mole.** Every clause can open a new hole. A recorded case set re-run after every change is the beginning of an evaluation suite; bigger versions of this idea become the evaluation-and-promotion work later in the track.

The raw runs are saved in [`perf/results/qwen-tool-use-2026-11-11/`](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-tool-use-2026-11-11), with a [suite manifest](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/qwen-tool-use-2026-11-11-suite.json) and the [final source snapshot](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-tool-use-2026-11-11-sources). Each case ran once per harness version at temperature 0 on one local 8B model — a learning record, not a reliability proof. Verdicts were judged by reading answers; an automated checker does not exist yet.

## Use case 1: saved-build troubleshooting, 13 November

The next useful job is: **For the saved portfolio build example, why did
publication not happen, and what should I check next?** The assistant now has a
second read-only tool, `read_build_result`, alongside its project-note lookup.
This starts a practical track for making an 8B model reliable for specific tasks
and measuring cost per acceptable result. Harness changes, adapter training,
and serving settings will be compared separately. Every step stays recorded.

### Step 1: define the job before running it

The development criteria require reading both records, identifying the broken
internal link that stopped `zola build`, explaining that deployment did not
start, and suggesting checking the link and rebuilding. The assistant must
identify the build as a **synthetic teaching example**, rather than current
live site status, and must not claim to have changed or deployed anything.

The build reader can inject a labelled `TEMPORARY_UNAVAILABLE` error with
`retryable: true`. The prompt permits one retry. Invalid arguments and a missing
project are non-retryable errors. The harness caps the whole attempt at four
model turns and four tool calls, with a 45-second timeout per request. These
caps bound calls, not a measured end-to-end response-time target.

### Step 2: preserve the real runtime failure

The unchanged runner failed before any model response: `TypeError: fetch failed`.
The updated runner records the underlying `EPERM` code and failed endpoint,
`/api/version`. This session was not permitted to reach local Ollama. That does
not establish that Ollama is down or that the model chose the wrong tool.

The candidate attempt stopped at the same endpoint: zero tool executions, no
model response, and unknown token totals. The short failure duration is not
model latency or evidence of cheap inference.

### Step 3: exercise the tool independently

Ten offline checks passed, covering the saved records, explicit synthetic label,
invalid arguments, missing projects, inherited object names, data isolation,
temporary failure, retry result and separate failure state between runs.

The scripted trace reads the note, gets a temporary reader error, then reads a
record saying the build failed. **Recovering access to a record does not make
the build successful.** Test code chose these calls; Qwen did not generate them.

### Step 4: state what remains unknown

The tool passed its local checks. Qwen's diagnosis and recovery remain untested.
The runner now reports an exhausted turn limit or empty final answer as
incomplete, rather than completed; that stop behavior still needs a separate
protocol drill. A completed program run would still need answer review.

The [step records and source snapshots](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-troubleshooting-2026-11-13)
preserve the criteria, blocked attempts, tool checks, source hashes and original
baseline. No training, held-out evaluation, memory/speed benchmark, dollar-cost
comparison or measured savings occurred in this step.

When Ollama access is available, inspect a normal model trace, then try the
injected failure:

```sh
node labs/qwen-tool-use/run.mjs --troubleshoot
node labs/qwen-tool-use/run.mjs --troubleshoot --fail-build-once
```

Reported token counts come from Ollama's
[`prompt_eval_count` and `eval_count`](https://docs.ollama.com/api/chat).
Quality, time, memory, retries, fallback/review work, and training/operating costs
will determine whether the use case is economical. Fine-tuning alone does not
reduce the base model's size or establish savings.

## What we will build next

More single complications on this same assistant: a second tool to choose between, a tool that can fail mid-call, and cases where the honest answer is "the note does not say." The recorded suite grows with each one, and eventually a checker will grade the answers instead of a reader.

The current focus is a few useful 8B workflows, with the tiny-model labs available to explain the mechanisms. Some problems may motivate better examples or later weight adaptation, and we will compare those changes separately so we know what helped. The [practical roadmap](@/learn/model-engineering/roadmap.md) connects the builds.
