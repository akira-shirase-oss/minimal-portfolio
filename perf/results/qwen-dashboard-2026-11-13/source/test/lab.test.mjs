import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { openStore } from "../store.mjs";
import { executeTool } from "../tools.mjs";
import { runChat, limits } from "../agent.mjs";
import { createApp } from "../app.mjs";

const final = content => ({ message: { role: "assistant", content }, usage: { prompt_tokens: 10, output_tokens: 2 } });
const call = (name, args) => ({ id: randomUUID(), type: "function", function: { name, arguments: args } });
const calls = (...tool_calls) => ({ ...final(""), message: { role: "assistant", content: "", tool_calls } });
const scripted = (...responses) => async () => {
  const response = responses.shift();
  if (response instanceof Error) throw response;
  assert.notEqual(response, undefined, "The harness made an unexpected extra model request.");
  return response;
};
const run = (store, chat) => runChat({ store, chat, message: "Add a todo: Read Qwen notes", requestId: randomUUID(), transportLabel: "scripted_test_no_model" });
function setup(t) { const store = openStore(); t.after(() => store.close()); return store; }
function post(body, headers = {}) { return new Request("http://127.0.0.1:3210/api/chat", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }); }
const body = () => ({ session_id: randomUUID(), request_id: randomUUID(), message: "Add a todo: Read Qwen notes" });

test("creation receipts prevent duplicate rows across a database restart", t => {
  const directory = mkdtempSync(join(tmpdir(), "qwen-todo-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "todos.sqlite"), id = randomUUID();
  let store = openStore(path);
  const first = executeTool(store, id, "create_todo", { title: "Read Qwen notes" });
  store.close(); store = openStore(path);
  try {
    const repeated = executeTool(store, id, "create_todo", { title: "Read Qwen notes" });
    assert.equal(repeated.todo.id, first.todo.id); assert.equal(repeated.replayed, true);
    assert.equal(store.list().total, 1);
    assert.equal(executeTool(store, id, "create_todo", { title: "Another task" }).error.code, "WRITE_LIMIT");
    assert.equal(store.list().total, 1);
  } finally { store.close(); }
});

test("tool validation rejects wrong tools, empty titles and extra fields without writes", t => {
  const store = setup(t), id = randomUUID();
  for (const args of [null, [], {}, { title: " " }, { title: 12 }, { title: "x".repeat(161) }, { title: "ok", sql: "DROP TABLE todos" }]) assert.equal(executeTool(store, id, "create_todo", args).error.code, "INVALID_ARGUMENTS");
  assert.equal(executeTool(store, id, "delete_todo", { id: 1 }).error.code, "UNKNOWN_TOOL");
  assert.equal(executeTool(store, id, "execute_sql", {}).error.code, "UNKNOWN_TOOL");
  assert.equal(executeTool(store, id, "list_todos", { limit: 999 }).error.code, "INVALID_ARGUMENTS");
  assert.equal(store.list().total, 0);
});

test("titles are stored as data, including SQL-like text; list has an explicit cap", t => {
  const store = setup(t);
  const title = "'); DROP TABLE todos; --";
  executeTool(store, randomUUID(), "create_todo", { title });
  for (let i = 0; i < 10; i++) executeTool(store, randomUUID(), "create_todo", { title: `Task ${i}` });
  const result = store.list();
  assert.equal(result.todos[0].title, title); assert.equal(result.total, 11);
  assert.equal(result.todos.length, 10); assert.equal(result.has_more, true);
});

test("scripted tool round trip reaches SQLite and supplies its real result to the next request", async t => {
  const store = setup(t); let turn = 0;
  const result = await run(store, async payload => {
    if (turn++ === 0) return calls(call("create_todo", { title: "Read Qwen notes" }));
    const saved = JSON.parse(payload.messages.at(-1).content);
    assert.equal(saved.todo.title, "Read Qwen notes");
    return final(`Saved todo #${saved.todo.id}.`);
  });
  assert.equal(result.report.status, "completed"); assert.equal(result.report.tool_calls, 1);
  assert.equal(result.report.model_responses, 2); assert.equal(store.list().total, 1);
  assert.deepEqual(result.report.usage, { prompt_tokens: 20, output_tokens: 4 });
  assert.equal(result.report.transport, "scripted_test_no_model");
});

test("repeated create requests in one assistant response do not duplicate the row", async t => {
  const store = setup(t);
  const { report } = await run(store, scripted(calls(call("create_todo", { title: "Read Qwen notes" }), call("create_todo", { title: "Read Qwen notes" })), final("Saved one todo.")));
  assert.equal(store.list().total, 1); assert.equal(report.tool_calls, 2);
  assert.equal(report.trace.filter(event => event.kind === "tool_result")[1].result.replayed, true);
});

test("invalid model arguments return an error that a later valid call can correct", async t => {
  const store = setup(t);
  const { report } = await run(store, scripted(calls(call("create_todo", {})), calls(call("create_todo", { title: "Read Qwen notes" })), final("Saved.")));
  assert.equal(report.status, "completed"); assert.equal(store.list().total, 1);
  assert.equal(report.trace.find(event => event.kind === "tool_result").result.error.code, "INVALID_ARGUMENTS");
});

test("model loop and tool-call limits stop repeated calls with incomplete status", async t => {
  const store = setup(t);
  const repeated = await run(store, async () => calls(call("list_todos", {})));
  assert.equal(repeated.report.status, "incomplete"); assert.equal(repeated.report.stop_reason, "model_turn_limit");
  assert.equal(repeated.report.model_responses, limits.model_turns);
  const excessive = await run(store, scripted(calls(...Array.from({ length: 8 }, () => call("list_todos", {})))));
  assert.equal(excessive.report.status, "incomplete"); assert.equal(excessive.report.stop_reason, "tool_call_limit");
  assert.equal(excessive.report.tool_calls, limits.tool_calls);
});

test("empty and truncated replies are incomplete and never execute truncated tool requests", async t => {
  const store = setup(t);
  assert.equal((await run(store, scripted(final(" ")))).report.stop_reason, "empty_answer");
  const truncated = { ...calls(call("create_todo", { title: "Unfinished" })), done_reason: "length" };
  assert.equal((await run(store, scripted(truncated))).report.stop_reason, "truncated_model_response");
  assert.equal(store.list().total, 0);
});

test("runtime failure before a response leaves token usage unknown and does not create tasks", async t => {
  const store = setup(t);
  const error = Object.assign(new Error("Scripted connection denial; not an actual network call"), { cause: { code: "EPERM" } });
  const { report } = await run(store, scripted(error));
  assert.equal(report.status, "runtime_error"); assert.equal(report.error.code, "EPERM");
  assert.equal(report.usage.prompt_tokens, null); assert.equal(report.model_responses, 0);
  assert.equal(store.list().total, 0);
});

test("a saved action survives a failed follow-up answer and remains visible in the trace", async t => {
  const store = setup(t);
  const { report } = await run(store, scripted(calls(call("create_todo", { title: "Read Qwen notes" })), new Error("Scripted second-request failure")));
  assert.equal(report.status, "runtime_error"); assert.equal(report.answer, null);
  assert.equal(store.list().total, 1);
  assert.equal(report.trace.find(event => event.kind === "tool_result").result.todo.id, 1);
});

test("malformed runtime responses fail honestly rather than crashing report accounting", async t => {
  const store = setup(t);
  const { report } = await run(store, async () => null);
  assert.equal(report.status, "runtime_error"); assert.equal(report.usage.output_tokens, null);
});

test("HTTP handler replays one request ID and rejects reuse for a different message", async t => {
  const store = setup(t); let invocations = 0;
  const sequence = scripted(calls(call("create_todo", { title: "Read Qwen notes" })), final("Saved."));
  const app = createApp({ store, transportLabel: "scripted_test_no_model", chat: async (...args) => { invocations++; return sequence(...args); } });
  const request = body();
  const first = await (await app(post(request))).json();
  const replay = await (await app(post(request))).json();
  assert.deepEqual(replay, first); assert.equal(invocations, 2); assert.equal(store.list().total, 1);
  assert.equal((await app(post({ ...request, message: "Different message" }))).status, 409);
});

test("HTTP handler enforces one in-flight chat, validates input and serves local assets", async t => {
  const store = setup(t); let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const app = createApp({ store, transportLabel: "scripted_test_no_model", chat: async () => { entered(); await gate; return final("Hello."); } });
  assert.equal((await app(post({ message: "Missing IDs" }))).status, 400);
  assert.equal((await app(post(body(), { Origin: "https://example.com" }))).status, 403);
  assert.equal((await app(new Request("http://example.com/"))).status, 403);
  const active = app(post(body())); await started;
  assert.equal((await app(post(body()))).status, 429);
  release(); assert.equal((await active).status, 200);
  for (const path of ["/", "/app.js", "/style.css", "/api/todos"]) assert.equal((await app(new Request(`http://127.0.0.1:3210${path}`))).status, 200);
  assert.equal(store.list().total, 0);
});

test("query breakdown correlates timed model, validation and database stages with actual saved rows", async t => {
  const store = setup(t);
  const { report } = await run(store, scripted(calls(call("create_todo", { title: "Read Qwen notes" })), final("Saved.")));
  assert.equal(report.trace_version, 2); assert.equal(report.context.history_messages, 0);
  const validation = report.trace.find(item => item.kind === "tool_validation");
  const database = report.trace.find(item => item.kind === "database_result");
  const result = report.trace.find(item => item.kind === "tool_result");
  assert.equal(validation.status, "passed"); assert.equal(validation.call_id, result.call_id);
  assert.equal(database.rows_changed, 1); assert.equal(database.result.todo.id, store.list().todos[0].id);
  assert.equal(report.trace.at(-1).kind, "run_finished");
  for (let i = 1; i < report.trace.length; i++) assert.ok(report.trace[i].elapsed_ms >= report.trace[i - 1].elapsed_ms);
  assert.ok(Math.abs(Object.values(report.processing_ms).reduce((sum, value) => sum + value, 0) - report.wall_seconds * 1000) < .1);
});

test("rejected arguments record validation without claiming database work; runtime errors retain elapsed time", async t => {
  const store = setup(t);
  const { report } = await run(store, scripted(calls(call("create_todo", {})), new Error("Synthetic runtime outage")));
  assert.equal(report.trace.find(item => item.kind === "tool_validation").status, "rejected");
  assert.equal(report.trace.some(item => item.kind === "database_result"), false);
  assert.ok(report.trace.find(item => item.kind === "model_error").duration_ms >= 0);
  assert.equal(report.trace.at(-1).status, "runtime_error"); assert.equal(store.list().total, 0);
});
