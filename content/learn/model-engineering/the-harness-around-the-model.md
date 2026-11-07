+++
title = "The harness around the model"
description = "Our first practical Qwen build: request a tool, run a bounded lookup, return its result, and inspect the answer."
date = 2026-11-07
updated = 2026-11-07
weight = 9

[extra]
kind = "chapter"
chapter = 9
status = "one local Qwen tool-use slice executed; broader reliability and weight adaptation still ahead"
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

The first tool accepts one project identifier, `portfolio`, and returns a saved public project note. Unknown tool names, missing arguments, and extra arguments are rejected. The runner limits model turns, tool requests, and request duration.

This follows [Ollama's tool-calling API](https://docs.ollama.com/capabilities/tool-calling): include tool descriptions, retain the assistant's tool request, and send the tool result in a follow-up message.

## Read one piece at a time

There are three small files in the local learning workspace:

- `project-notes.json`: the facts our lookup can return.
- `lookup-project.mjs`: the tool description, argument checks, and lookup function.
- `run.mjs`: the question → tool → answer cycle and saved trace.

The [baseline source snapshot](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-tool-use-baseline-sources) preserves those exact files. They use Node's built-in HTTP and filesystem support. No new website script or interactive section is added by this chapter.

To run the saved program from the private `model-engineering` workspace, with Ollama running and the model installed:

```sh
node labs/qwen-tool-use/run.mjs
```

We will read the lookup function and its actual trace together before adding more tools.

## What the first run establishes

The recorded run used one valid lookup and two model responses. It took about **8.8 seconds** in that single local run. That timing is one observation, not a throughput or latency benchmark.

The [saved trace](https://github.com/akira-shirase-oss/minimal-portfolio/blob/main/perf/results/qwen-tool-use-baseline.json) contains the model identity, settings, source hashes, requests, tool arguments, returned note, final answer, and timing. The original source is preserved so later changes can be compared with it.

This shows that the first request/tool/result cycle ran and answered this particular question from the note. It does not establish broad tool-use reliability. It used existing weights: no fine-tuning or weight update happened.

## What we will build next

We will introduce one realistic complication at a time: an unknown project, missing information, a tool error, an ambiguous request, or a choice between tools. Then we can inspect what went wrong and make one change.

Some problems may belong to the tool description or surrounding code. Others may motivate better examples or later weight adaptation. We will compare those changes separately so we know what helped.

Alongside this assistant, a separate tiny text model will let us inspect actual training, generated text, saved training state, and restart behavior. That work does not require finishing a large assistant application first. The [practical roadmap](@/learn/model-engineering/roadmap.md) connects the builds.
