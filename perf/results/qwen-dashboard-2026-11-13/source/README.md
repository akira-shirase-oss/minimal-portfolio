# Local Qwen dashboard — first slice

The learner's chosen progression is one local chat/harness: todo CRUD, CRM tasks,
then more complex workflows. Keep old cases when adding new tools or training
adapters. This first small slice implements **create and list** only. Update,
completion, deletion and CRM actions are planned, not implemented.

## Run

Requires Node 24+ with `node:sqlite`, Python, MLX-LM and a local Hugging Face
Qwen snapshot. **Ollama is not used by this app.** There are no npm dependencies
or hosted inference calls in this implementation. Follow
[DIRECT_MODEL.md](DIRECT_MODEL.md) to install the isolated runtime, download the
pinned model and start MLX in one terminal. Then start the chat app in another:

```sh
cd labs/qwen-todo-chat
npm start
```

Open the printed URL, normally `http://127.0.0.1:3210`. `TODO_PORT` can change the
local port. The server binds only to loopback. The model setup/launcher is a
separate explicit step; starting the chat server does not download weights.
Stop either local process with Ctrl+C in its terminal.

Try one message: **Add a todo: Read Qwen notes**. Then **List my saved todos**.
The right panel reads actual SQLite records; expand the trace to inspect the
model's request, validated tool result and final response. There is no mock
model in the app. A runtime failure is displayed as a failure.

## Follow the pieces

1. `public/`: Overview, Qwen chat, searchable Tasks, Run history and Local model screens. No database operations run in
   the browser and it never receives arbitrary SQL or shell tools.
2. `server.mjs` / `app.mjs`: same-origin HTTP boundary, one in-flight chat, short
   session history, request IDs and saved run records.
3. `agent.mjs`: question → Qwen → tool request → validated execution → Qwen.
4. `tools.mjs`: two function descriptions and actual argument validation.
5. `store.mjs`: SQLite writes/reads and atomic creation receipts.

The browser calls our local harness; `model.mjs` calls MLX's local API with
matching tool-call IDs and JSON argument conversion. MLX loads the Hugging Face
files on this Mac. That keeps tool execution in one place and makes the actual
state change visible.

## Small, explicit boundaries

- One distinct todo creation per request; titles are 1–160 characters. A repeated
  identical creation for the same request ID returns the saved result, even
  after reopening the database. A new request ID represents a new action.
- The model tool reads the first ten todos plus total/has_more. The Tasks screen has separate literal-title search and 20-row pagination.
- One chat at a time. Four model responses and five tool calls maximum, 20-second
  timeout per inference request, and a 60-second run deadline. No automatic
  inference retries. Timeouts can leave already committed tool actions in place;
  the trace and database show them rather than claiming rollback.
- Completed means the program received a nonempty final reply, not that its
  claims are correct. Empty/truncated replies and budget stops are incomplete.
- Qwen requests non-thinking output, 256 output tokens, temperature 0 and seed 42.
  The history character limit remains, but the old Ollama 4096-token backend
  context cap is not configured for MLX. This is a new runtime/quantization
  baseline, with tradeoffs to measure; no optimality or parity claim is made.
- The last two completed exchanges may supply context, with a 3000-character
  history limit preserving whole exchanges. This is conversation context, not
  weight training. New chat or a server restart clears it; saved todos persist.
- Request-result replay is cached for the last 100 request IDs while the server
  is running. Creation receipts persist. This does not promise exactly-once
  execution for arbitrary future workflows or new IDs with the same intent.

`data/todos.sqlite` stores tasks. `data/runs/` stores local traces and source
hashes, including user text and tool data. Do not publish real personal/CRM data
as learning examples. Tests use disposable databases and scripted transports.

## Development criteria before real model runs

For the create case, the model must call `create_todo` with the requested title,
one row must exist, and the final answer must agree with the tool result. The
subsequent list must read that row via `list_todos`. Asking to delete must not
mutate data in this slice. Invalid tool arguments must be rejected; a repeated
creation call for one request must not duplicate the row. An unavailable runtime
must not produce a fabricated successful answer. These are development cases,
not a held-out benchmark or proof of production stability.

Run `npm test` for twenty-five in-process handler → harness → SQLite and MLX wire
checks with **scripted model responses**. They verify program behavior, not
Qwen's judgment. Actual selection, answer quality, latency, memory and cost need
separate runs. The repository/revision/runtime version are pinned in
`model-config.json`; expected identity is not proof of loaded files. The download
helper writes a manifest of actual packages and file hashes when it succeeds.
On 13 November, access was restored: MLX-LM installed, the pinned snapshot downloaded and hashed, and direct generation returned `READY.`. Four live development cases then passed their declared program criteria: one create, a fresh list, a missing-title clarification and a refused unsupported delete. These are smoke cases, not a held-out quality benchmark.
Local execution does not prove it is cheaper than a hosted alternative.

Next lesson: inspect one real create/list trace, add update/delete with exact
IDs, then grow a regression set before adding CRM tools. Compare base weights, harness changes and trained adapters separately; keep cases out of training for
independent evaluation. Record every step in the portfolio; its public learning
chapters stay text/code even though this separate local lab has an interface.

## Dashboard and query breakdown — 13 November 2026

Open http://127.0.0.1:3210/#/chat. The interface uses a black sidebar, white screens,
black/gray controls and Arial/Helvetica sans-serif fonts. All application text,
including trace JSON, labels and timestamps, is at least 14px.

Each new query saves trace version 2: input/context metadata; exact prompts and
tool schemas; actual HTTP wire request and raw model response; per-response
reported input/output tokens; model-call timing; tool-call IDs, validation,
database outcome, changed-row count and tool result; final status and aggregate
stage timings. The Processing panel and Run history both show expandable stages.
Download JSON preserves the report, including source hashes. Earlier reports
remain unchanged and say when stage timings were not recorded.

Timings measure the non-streaming application boundary. Internal activations,
first generated-token latency, peak inference memory and monetary cost are not
measured. Tool totals include validation/database work and must not be added a
second time. The model screen checks `/health`; its pinned identity comes from
the download manifest. A health response does not attest loaded model identity.

The initial `/v1/models` status probe returned HTTP 200 with an empty body on this
installation. The installed MLX handler scans the default Hub cache before
listing the explicitly loaded local path. That scan can fail when that cache is
absent. We preserved the observation and use the dedicated health endpoint.
