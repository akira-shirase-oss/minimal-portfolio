# Local Qwen todo chat — first slice

The learner's chosen progression is one local chat/harness: todo CRUD, CRM tasks,
then more complex workflows. Keep old cases when adding new tools or training
adapters. This first small slice implements **create and list** only. Update,
completion, deletion and CRM actions are planned, not implemented.

## Run

Requires Node 24+ with `node:sqlite`, Ollama, and an installed `qwen3:8b` model.
There are no npm dependencies or paid API calls in this implementation.

```sh
cd labs/qwen-todo-chat
npm start
```

Open the printed URL, normally `http://127.0.0.1:3210`. `TODO_PORT` can change the
local port. The server binds only to loopback. It does not download models or
start Ollama. Stop it with Ctrl+C.

Try one message: **Add a todo: Read Qwen notes**. Then **List my saved todos**.
The right panel reads actual SQLite records; expand the trace to inspect the
model's request, validated tool result and final response. There is no mock
model in the app. A runtime failure is displayed as a failure.

## Follow the pieces

1. `public/`: browser chat, database view and trace. No database operations run in
   the browser and it never receives arbitrary SQL or shell tools.
2. `server.mjs` / `app.mjs`: same-origin HTTP boundary, one in-flight chat, short
   session history, request IDs and saved run records.
3. `agent.mjs`: question → Qwen → tool request → validated execution → Qwen.
4. `tools.mjs`: two function descriptions and actual argument validation.
5. `store.mjs`: SQLite writes/reads and atomic creation receipts.

The browser calls our local harness; the harness calls Ollama. That keeps tool
execution in one place and makes the actual state change visible.

## Small, explicit boundaries

- One distinct todo creation per request; titles are 1–160 characters. A repeated
  identical creation for the same request ID returns the saved result, even
  after reopening the database. A new request ID represents a new action.
- Lists return the first ten todos plus total/has_more. Pagination is later.
- One chat at a time. Four model responses and five tool calls maximum, 20-second
  timeout per inference request, and a 60-second run deadline. No automatic
  inference retries. Timeouts can leave already committed tool actions in place;
  the trace and database show them rather than claiming rollback.
- Completed means the program received a nonempty final reply, not that its
  claims are correct. Empty/truncated replies and budget stops are incomplete.
- Qwen uses the existing non-thinking settings (4096 context, 256 output tokens,
  temperature 0, seed 42). These are experiment settings, not an optimality claim.
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

Run `npm test` for in-process handler → harness → SQLite checks with **scripted
model responses**. They verify program behavior, not Qwen's judgment. Real Qwen
selection, answer quality, latency, memory and cost need separate recorded runs.
Capture the installed model digest before treating a run as a comparable model
benchmark; this first implementation logs the model tag and has not verified its
digest. Local execution does not prove it is cheaper than a hosted alternative.

Next lesson: inspect one real create/list trace, add update/delete with exact
IDs, then grow a regression set before adding CRM tools. Compare base weights,+harness changes and trained adapters separately; keep cases out of training for
independent evaluation. Record every step in the portfolio; its public learning
chapters stay text/code even though this separate local lab has an interface.
