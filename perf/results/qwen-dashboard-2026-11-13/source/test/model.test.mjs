import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { wireMessages, normalizeCompletion, mlxChat, modelConfig } from "../model.mjs";
import { runChat } from "../agent.mjs";
import { openStore } from "../store.mjs";

const tool = (args = '{"title":"Read Qwen notes"}', id = "call-1") => ({ id, type: "function", function: { name: "create_todo", arguments: args } });
const completion = (content, tool_calls) => ({ choices: [{ message: { role: "assistant", content, ...(tool_calls ? { tool_calls } : {}) }, finish_reason: tool_calls ? "tool_calls" : "stop" }], usage: { prompt_tokens: 12, completion_tokens: 3 } });

test("OpenAI-compatible tool arguments become validated JSON data and usage stays explicit", () => {
  const result = normalizeCompletion(completion(null, [tool()]));
  assert.equal(result.message.content, "");
  assert.deepEqual(result.message.tool_calls[0].function.arguments, { title: "Read Qwen notes" });
  assert.equal(result.message.tool_calls[0].id, "call-1");
  assert.deepEqual(result.usage, { prompt_tokens: 12, output_tokens: 3 });
  assert.equal(normalizeCompletion({ choices: [{ message: { role: "assistant", content: "Hi" }, finish_reason: "stop" }] }).usage.prompt_tokens, null);
});

test("wire history preserves call/result IDs and serializes argument objects once", () => {
  const normalized = normalizeCompletion(completion(null, [tool()]));
  const messages = wireMessages([normalized.message, { role: "tool", tool_name: "create_todo", tool_call_id: "call-1", content: '{"todo":{"id":1}}' }]);
  assert.equal(messages[0].tool_calls[0].function.arguments, '{"title":"Read Qwen notes"}');
  assert.equal(messages[1].tool_call_id, "call-1");
  assert.equal(typeof normalized.message.tool_calls[0].function.arguments, "object");
  assert.throws(() => wireMessages([{ role: "tool", content: "orphan" }]), { code: "MODEL_PROTOCOL_ERROR" });
});

test("malformed JSON, missing IDs, duplicate IDs and malformed choices fail before tool execution", () => {
  for (const raw of [completion(null, [tool("{broken")]), completion(null, [tool("{}", "")]), completion(null, [tool(), tool()]), completion(null, [null]), { choices: [] }]) {
    assert.throws(() => normalizeCompletion(raw), { code: "MODEL_PROTOCOL_ERROR" });
  }
});

test("transport calls only the configured local MLX endpoint and passes cancellation", async () => {
  const signal = new AbortController().signal;
  const response = await mlxChat({ model: "default_model", messages: [{ role: "user", content: "Hi" }], tools: [], stream: false }, { signal, fetchImpl: async (url, init) => {
    assert.equal(url, "http://127.0.0.1:8080/v1/chat/completions");
    assert.equal(init.signal, signal);
    assert.equal(JSON.parse(init.body).model, "default_model");
    return Response.json(completion("Hi"));
  } });
  assert.equal(response.message.content, "Hi");
  assert.match(modelConfig.revision, /^[a-f0-9]{40}$/);
});

test("HTTP errors propagate with no fallback to Ollama or a hosted model", async () => {
  let requests = 0;
  await assert.rejects(mlxChat({ messages: [] }, { fetchImpl: async () => { requests++; return new Response("Unavailable", { status: 503 }); } }), { code: "HTTP_503" });
  assert.equal(requests, 1);
});

test("scripted MLX wire response -> harness -> SQLite -> wire tool result -> answer", async t => {
  const store = openStore(); t.after(() => store.close()); let requests = 0;
  const fetchImpl = async (_url, init) => {
    const payload = JSON.parse(init.body);
    if (requests++ === 0) return Response.json(completion(null, [tool()]));
    const last = payload.messages.at(-1);
    assert.equal(last.role, "tool"); assert.equal(last.tool_call_id, "call-1");
    assert.equal(JSON.parse(last.content).todo.title, "Read Qwen notes");
    assert.equal(typeof payload.messages.at(-2).tool_calls[0].function.arguments, "string");
    return Response.json(completion("Saved todo #1."));
  };
  const { report } = await runChat({ store, requestId: randomUUID(), message: "Add a todo: Read Qwen notes", chat: (payload, options) => mlxChat(payload, { ...options, fetchImpl }), transportLabel: "scripted_mlx_wire_no_model" });
  assert.equal(report.status, "completed"); assert.equal(store.list().total, 1);
  assert.equal(report.tool_calls, 1); assert.equal(report.model_responses, 2);
  assert.deepEqual(report.usage, { prompt_tokens: 24, output_tokens: 6 });
});
