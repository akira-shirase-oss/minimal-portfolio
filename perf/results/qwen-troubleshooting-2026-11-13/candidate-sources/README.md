# First practical slice: Qwen uses one tool

## Current slice — saved-build troubleshooting, 2026-11-13

The next use case combines the existing note lookup with one new read-only tool,
`read_build_result`. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for the job,
predeclared criteria, budget, commands and measurement limits. The original
lookup remains the default; `--troubleshoot` enables the two-tool task and
`--fail-build-once` injects one clearly labelled temporary reader failure.

`check-build-result.mjs` exercises our tool code without a model. Passing those
checks does not prove that Qwen chooses the tool, diagnoses the build, or retries
correctly. Real inference must have its own recorded trace. An exhausted model
turn limit is now reported as incomplete rather than completed; token totals
remain unknown when the runtime returns no model response.

Question: “What command publishes my portfolio, and does pushing to GitHub
publish it? Use my saved project note.”

The model requests a project lookup. Our code validates the tool name and its
arguments, reads the bounded fixture, and sends the result back. Qwen then writes
the answer. This is a small harness/inference example, not weight training.

## Run

With the existing Ollama server and `qwen3:8b` installed, from `model-engineering`:

```sh
node labs/qwen-tool-use/run.mjs
```

Pass a different question as an argument to probe other cases, e.g. a
project that has no saved note:

```sh
node labs/qwen-tool-use/run.mjs "What command deploys my blog-api project? Use my saved project note."
```

Node's built-in HTTP and filesystem support are enough; there are no package
dependencies. The only network destination is the local Ollama API. The lookup
returns saved public portfolio facts; no tool can deploy, run shell commands,
read arbitrary paths, or send messages.

## Read the pieces together

1. `project-notes.json`: the facts the tool can return.
2. `lookup-project.mjs`: the tool description and the actual validated function.
3. `run.mjs`: send a question, receive a tool request, execute the allowed tool,
   return its result, and receive an answer. Turn/call/time limits bound a run.
4. `../../evidence/qwen-tool-use/`: actual requests, responses, tool arguments,
   results, model identity/settings, source hashes, and timing.

The first recorded run is `2026-11-07T12-13-24-122Z.json`: Qwen requested
`lookup_project({project_name: "portfolio"})`, the tool returned the note, and
Qwen correctly included the saved Wrangler command and explained that Git push
does not publish. It used one tool request and two model responses, taking about
8.8 seconds in this one local smoke run. It did not execute the command or change
model weights. The `.sources` folder preserves the baseline code and note.

Unknown tool names, missing arguments, and extra arguments were checked locally
against the dispatcher. Broader model behavior, tool reliability, retries,
timeouts, and recovery have not yet been evaluated as a suite.

## Build next

Inspect this trace together first. Then add one realistic complication at a
time: a missing project, a tool error, more than one tool, ambiguous requests, or
unsupported facts. Explain the observed failure and make one measured change.
Keep changes to prompts/tool code/data separate from later weight adaptation.
Do not expand into a full app before the learner has seen the first cycle.

API reference checked for this slice:
https://docs.ollama.com/capabilities/tool-calling
