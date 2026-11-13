import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

export const modelConfig = Object.freeze(JSON.parse(readFileSync(new URL("./model-config.json", import.meta.url), "utf8")));
export const generationSettings = Object.freeze({ model: modelConfig.model_selector, temperature: 0, seed: 42, max_tokens: 256, chat_template_kwargs: { enable_thinking: false } });
const protocolError = message => Object.assign(new Error(message), { code: "MODEL_PROTOCOL_ERROR" });

export function wireMessages(messages) {
  return messages.map(message => {
    if (message.role === "tool") {
      if (!message.tool_call_id) throw protocolError("A tool result is missing the model's call ID.");
      return { role: "tool", tool_call_id: message.tool_call_id, content: message.content };
    }
    const result = { role: message.role, content: message.content };
    if (message.tool_calls?.length) result.tool_calls = message.tool_calls.map(call => ({ id: call.id, type: "function", function: { name: call.function.name, arguments: JSON.stringify(call.function.arguments) } }));
    return result;
  });
}

export function normalizeCompletion(raw) {
  const choice = raw?.choices?.[0], message = choice?.message;
  if (!message || message.role !== "assistant" || (message.content != null && typeof message.content !== "string")) throw protocolError("MLX returned no valid assistant message.");
  if (message.tool_calls != null && !Array.isArray(message.tool_calls)) throw protocolError("MLX returned invalid tool calls.");
  const ids = new Set();
  const toolCalls = (message.tool_calls ?? []).map(call => {
    if (typeof call?.id !== "string" || !call.id || ids.has(call.id) || call.type !== "function" || typeof call.function?.name !== "string" || call.function.arguments === undefined) throw protocolError("MLX returned a missing/duplicate call ID or invalid function arguments.");
    ids.add(call.id);
    let args;
    try { args = typeof call.function.arguments === "string" ? JSON.parse(call.function.arguments) : call.function.arguments; }
    catch { throw protocolError("MLX returned malformed JSON tool arguments; no action was executed from this response."); }
    return { id: call.id, type: "function", function: { name: call.function.name, arguments: args } };
  });
  return {
    message: { role: "assistant", content: message.content ?? "", ...(toolCalls.length ? { tool_calls: toolCalls } : {}) },
    done_reason: choice.finish_reason,
    usage: { prompt_tokens: raw.usage?.prompt_tokens ?? null, output_tokens: raw.usage?.completion_tokens ?? null },
    raw_response: raw,
  };
}

export async function mlxChat(payload, { signal, fetchImpl = globalThis.fetch } = {}) {
  const started = performance.now();
  const wirePayload = { ...payload, messages: wireMessages(payload.messages) };
  const body = JSON.stringify(wirePayload);
  const response = await fetchImpl(modelConfig.endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body, signal,
  });
  const headersMs = performance.now() - started;
  if (!response.ok) throw Object.assign(new Error(`Local MLX HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`), { code: `HTTP_${response.status}` });
  const rawText = await response.text();
  return { ...normalizeCompletion(JSON.parse(rawText)), wire_request: wirePayload,
    transport_metrics: { endpoint: modelConfig.endpoint, http_status: response.status,
      request_bytes: Buffer.byteLength(body), response_bytes: Buffer.byteLength(rawText),
      headers_ms: headersMs, total_ms: performance.now() - started,
      timing_note: "Non-streaming: headers_ms is not time to first generated token" } };
}
