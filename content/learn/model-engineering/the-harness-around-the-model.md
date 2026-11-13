+++
title = "The harness around the model"
description = "Our first practical Qwen build: request a tool, run a bounded lookup, return its result, inspect the answer, and repair the failures it reveals."
date = 2026-11-07
updated = 2026-11-13
weight = 9

[extra]
kind = "chapter"
chapter = 9
status = "local MLX dashboard running; 25 scripted checks and four live development cases passed; update/delete and tuning planned"
+++

We are moving to learning by building useful pieces and investigating their behavior. The earlier numerical chapters remain references. This is the first practical slice of a local assistant we can improve together.

**Current build, 13 November:** Qwen now runs directly through local MLX. The
browser dashboard has Chat, Tasks, Run history, Local model and Overview screens.
[The latest step record](#a-running-dashboard-and-query-breakdown-13-november)
includes the setup recovery, real tool calls, timings and limitations. The older
Ollama lookup below remains a dated baseline.

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

## One local chat, from todos to CRM, 13 November

The chosen build is now one local browser interface whose tools grow with the
lessons: **todo CRUD → CRM tasks → compound workflows**. CRUD means create,
read, update and delete. CRM means customer relationship management: contacts,
companies, opportunities and follow-up work. The earlier lookup and saved-build
experiments stay available; the local todo interface is the next practical step.

### Step 1: expose the whole path

The first small slice implements **create and list only**:

```text
Browser message → local server → Qwen tool request → argument checks
                → SQLite action → tool result → Qwen answer + visible trace
```

The browser shows conversation, actual database records and the latest trace.
The model requests a function; our code performs the write. An answer saying
"saved" is not proof of a saved record. The database view is a separate check.
Update/delete and CRM tools are planned, not implemented in this slice.

### Step 2: bound the first actions

`create_todo` accepts one title; `list_todos` reads up to ten rows and reports
whether more exist. The program validates arguments and permits one distinct
creation per request ID. A SQLite transaction stores the todo and its creation
receipt together. Repeating the same creation with that ID returns its original
result, including after reopening the database. A new ID is a new action; this
does not promise general exactly-once execution for future workflows.

The harness allows one in-flight chat, four model responses and five tool calls
per run. It uses a 20-second timeout per model request and a 60-second deadline.
No inference retry runs automatically. The app stores its traces locally, with
source hashes, settings, tool results and reported token counts. These limits
are development choices; their quality/speed tradeoffs have not been measured.

### Step 3: test our code with scripted responses

Thirteen in-process checks passed, including handler → harness → SQLite, rejected
arguments, duplicate creation calls, persistence across database reopen, request
replay, empty/truncated replies, model/tool limits and partial failure.

One case creates a task successfully and then fails the follow-up model request.
The task remains saved, while the run reports an error and preserves the tool
result. A failed final answer does not undo a committed action. The interface
refreshes its database view even after an error, so that distinction is visible.

A prompt review also made freshness explicit: an older chat result may not
represent the current database. The thirteen checks passed again after that
source change; no model-level benefit has been measured.

These checks use **scripted model responses**, not Qwen. They test program
behavior. Six JavaScript syntax checks also passed; no rendered UI or actual
model behavior is established by those checks.

### Step 4: preserve the launch failure

The real server attempt failed with `listen EPERM` on `127.0.0.1:3210`. This
session could not bind the loopback socket. No browser HTTP request or Qwen
inference followed. The app therefore has no end-to-end verification yet.

The [source, development cases and recorded checks](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-todo-chat-2026-11-13)
exclude private application data. When local server access is available, start
the app and inspect one actual create/list trace before expanding:

```sh
node labs/qwen-todo-chat/server.mjs
```

### Step 5: keep old abilities measurable

Saved tasks are application data. Recent chat messages are temporary context.
Fine-tuning changes trainable weights. Adding a tool does not train the model,
and a new adapter does not guarantee that old tasks still work.

Keep the original task cases and their expected database effects. After adding
CRM tools or training an adapter, compare old and new cases using each workflow's
intended tools. Version expectations when a capability changes: v1 must explain
that delete is unavailable; an implemented delete will have a new expected result.
Preserve the original result rather than silently changing its goal.

The four manual development cases are declared before real model runs. Separate
held-out cases, actual adapter training, memory/latency benchmarks and cost
comparisons remain ahead. An 8B model's suitability and savings must be earned
through those measurements. The public portfolio stays text/code; this
interactive application is a separate local learning lab.

## Direct Qwen files from Hugging Face, 13 November

The current requirement is to run Qwen locally **without Ollama**. Hugging Face
supplies model/tokenizer files; MLX-LM executes them on this Apple Silicon Mac.
The todo tools and SQLite remain in our harness. No hosted inference provider
or cloud-generation API is involved in this implementation.

### Step 1: choose and identify the new baseline

The selected candidate is
[`mlx-community/Qwen3-8B-4bit`](https://huggingface.co/mlx-community/Qwen3-8B-4bit),
a community-converted 4-bit model, pinned to revision
`545dc4251c05440727734bcd94334791f6ab0192`. MLX-LM is pinned to `0.32.2`.
Four-bit storage lowers weight precision, not the model's parameter count.
The approximately 4.62 GB download is not the full runtime memory requirement.

This differs from the old Ollama/GGUF setup in runtime and quantization. It is a
new baseline, not a training update or proof of better speed, quality or cost.
The old 4096-token backend cap is not configured in MLX; the harness's short
history limit remains. Context/memory comparisons need actual measurements.

### Step 2: make the runtime boundary explicit

The active app now calls the local MLX endpoint. Its adapter converts stringified
JSON function arguments into data, preserves the model's tool-call IDs in tool
results, and normalizes usage. Malformed call JSON is rejected before execution.
There is no fallback to Ollama or a hosted model.

Nineteen scripted checks passed: the earlier thirteen handler/harness/SQLite
checks plus six MLX wire-format checks. Seven JavaScript syntax checks passed.
These test our adapter and program; they do not establish that an installed
MLX/Qwen combination actually generates correct tool calls.

### Step 3: preserve the setup limit

The isolated Python environment was created, but its package lookup could not
resolve MLX-LM. The release exists on official PyPI; that lookup message alone
does not prove why installation failed or that Python 3.14 is incompatible.
No model files were downloaded, Metal execution was not checked, and no direct
inference or training occurred. Earlier local socket restrictions also remain.

### Step 4: run one direct generation before the app

The setup helper can download the pinned snapshot and record file hashes/package
versions. Its `smoke` command then uses `mlx_lm.load` and `generate` directly in
Python, with no HTTP server, to request a short reply. The helper's syntax was
checked; this smoke command has not actually run against weights.

After installation and download, the planned first model check is:

```sh
labs/qwen-todo-chat/.venv/bin/python labs/qwen-todo-chat/setup_mlx.py smoke
```

Only after that should we start local MLX serving and inspect a real todo tool
trace. Downloading, generating, selecting a correct tool, and training an adapter
are distinct milestones. The [source, setup guide and exact records](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-direct-mlx-2026-11-13)
preserve what exists and what remains untested. See also the
[MLX-LM project](https://github.com/ml-explore/mlx-lm) for its local inference and
fine-tuning support; training feasibility here has not been established.

## What we will build next

First inspect a real todo create/list trace, then add update/delete by exact ID and grow the recorded cases before CRM actions. The earlier lookup and troubleshooting tools remain available as comparison material. An automated model-answer checker remains ahead.

The current focus is a few useful 8B workflows, with the tiny-model labs available to explain the mechanisms. Some problems may motivate better examples or later weight adaptation, and we will compare those changes separately so we know what helped. The [practical roadmap](@/learn/model-engineering/roadmap.md) connects the builds.

## A running dashboard and query breakdown, 13 November

These steps continue the earlier failed attempts; they do not erase them. The
[exact source, checks and synthetic query records](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-dashboard-2026-11-13)
are available separately from private chat history and downloaded weights.

### Step 1: diagnose access before changing the model

The earlier install could not resolve its package. Later direct HTTPS probes
failed name resolution for both PyPI and Hugging Face. No suitable offline
cache was found. Requesting network-enabled execution was rejected by the
then-active execution policy before installation ran. Those observations do
not show an incompatible Python version or a model failure.

Starting Node on port 3210 failed with `listen EPERM`. Trying 3211 produced the
same permission denial. A new port did not solve an execution-permission issue.
The [setup-access receipts](https://github.com/akira-shirase-oss/minimal-portfolio/tree/main/perf/results/qwen-direct-mlx-2026-11-13/setup-access)
retain the individual attempts. After workspace permissions changed, HTTPS
access and loopback binding succeeded; no model setting was changed to fix them.

A supplied screenshot in macOS TemporaryItems was also unreadable because the
OS denied access. We did not infer its contents or change system privacy settings.

### Step 2: separate download, generation and serving

The setup launcher installed MLX-LM 0.32.2 in an isolated Python 3.14.6 environment.
Actual accompanying packages were MLX 0.32.4, huggingface-hub 2.4.0 and transformers
5.23.0. The pinned revision downloaded 11 files totaling **4,623,784,971 bytes**.
The manifest records each file's SHA256 hash, a fingerprint of its bytes.

The direct library smoke received `Reply with just READY.` and produced `READY.`.
Its observed 4.629 seconds included model loading. This is one successful text
generation, not a tool evaluation or speed benchmark. We then launched the local
MLX endpoint on 8080 and the Node dashboard on 3210. Hugging Face supplied files;
MLX executed them locally. No Ollama or hosted inference fallback was used.

### Step 3: build screens around actual records

The initial chat became five screens: Overview, Qwen chat, Tasks, Run history and
Local model. Counts come from the SQLite database and saved JSON records. Task
search matches literal title text and pages through 20 records. The model's
`list_todos` tool still returns at most ten; a browser list is not automatically
extra context sent to the model.

The first visual pass used green accents and small labels. After feedback, the
local interface changed to a black sidebar, white surfaces, neutral grays and
Arial/Helvetica sans-serif fonts. Every application text size, including labels,
timestamps and trace JSON, is at least 14px. The public learning site remains
text/code; this dashboard is a separate local application.

### Step 4: repair an observed status-probe failure

MLX's `/v1/models` endpoint returned HTTP 200 with an empty body here. HTTP 200
alone was not sufficient evidence of a valid JSON response. The installed handler
scans the default Hugging Face cache before listing its configured local path;
a missing cache can fail that scan. This is a source-based explanation, not a
separately isolated reproduction of the underlying exception.

The dedicated `/health` endpoint returned `{"status":"ok"}`. The dashboard now
uses that for runtime health and shows the pinned download manifest separately.
A healthy endpoint does not attest which weights it loaded. Our launcher names
the recorded local directory, and actual completion traces establish generation.

### Step 5: make every new query inspectable

Trace version 2 records these stages, with elapsed times and matching call IDs:

1. User input and retained conversation context: character count, messages sent,
   available tools and history limits.
2. Each exact model prompt, tool schema and runtime wire request.
3. Each actual model reply, raw runtime response, reported token usage and request
   duration. A **token** is one unit of text the model processes, not necessarily
   a whole word. Repeated prompts across model calls count again in the totals.
4. Tool validation: accepted arguments or the exact rejection.
5. Database operation: actual returned rows, replay/rejection result, changed-row
   count and duration. A repeated creation receipt can return a saved row while
   changing zero rows.
6. Tool result returned to Qwen, then the final reply or stopping error.

For the new create example, Qwen requested `create_todo` with the title
`Inspect query breakdown`. Validation passed, SQLite saved row #2, and the final
answer agreed with that ID and title. The observed total was 3.776 seconds;
model work occupied about 3.775 seconds and the database operation about 0.87 ms.
One second is 1,000 milliseconds: `0.87 / 1,000 = 0.00087` seconds. This helps
locate the waiting in this particular run; it does not establish average latency.

The Processing panel and Run history show expandable stages. Downloading the
JSON preserves inputs, outputs, settings and source fingerprints. Older records
retain their original evidence and explicitly lack the newer stage timings.
Tool totals include validation/database work, so adding those totals again would
double-count time. Internal model activations, first-token latency, peak memory
and monetary cost were not measured.

### Step 6: verify program behavior and actual model behavior separately

Twenty-five scripted checks passed. The new cases cover the dashboard's real
record routes, file-path bounds, literal search/pagination, offline and wrong-
manifest status, and timed validation/database events. A rejected title records
validation failure without claiming database work. Earlier duplicate-write,
partial-failure, protocol and timeout-budget cases remain available.

Four real local Qwen development cases then ran with criteria declared before
requests. These are examples used during development, not held-out evaluation.

| Input | Observed result | Database effect | Observed time |
| --- | --- | --- | --- |
| `Add a todo: Inspect query breakdown` | One create call; answer names ID 2 and the requested title | Count 1 → 2 | 3.776 s |
| `List my saved todos` | Fresh list call; answer lists both actual titles and IDs | Count stays 2 | 3.697 s |
| `Create a todo` | Asked for a title; no tool call | Count stays 2 | 1.964 s |
| `Delete todo #1` | Explained that deletion is unavailable; no tool call | Count stays 2 | 1.124 s |

The responses above agree with these narrow expectations. A completed run,
correct behavior on these examples, and reliable behavior on unseen requests
remain different claims. No adapter training or measured savings occurred.

Chrome inspection confirmed the white overview/black sidebar, actual task rows,
searching `Inspect` returning only row #2, saved processing stages, and model
status/budgets. An earlier browser message also completed a real list round trip.
A stale native-window binding caused `cgWindowNotFound`; reconnecting the browser
session restored inspection. A final extra message was not submitted when the
user changed the active window. Mobile rendering was not visually checked.

### Revision notes and next small step

Qwen proposes a function call. The harness checks it. SQLite performs the saved
change. Qwen receives that result before producing the final reply. A fluent
answer alone establishes none of those database facts.

Saved records, conversation context and trained weights are still three separate
things. This app has changed its harness and observability; its weights have not
been tuned. Next, read the real create trace together, add update/delete using
exact IDs, and keep these cases as regression evidence. CRM, held-out quality,
peak memory and comparative operating costs remain planned.
