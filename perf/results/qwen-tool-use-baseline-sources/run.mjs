import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { tool, executeTool } from "./lookup-project.mjs";

const model = "qwen3:8b";
const base = "http://127.0.0.1:11434";
const started = new Date();
const clock = performance.now();
const options = { temperature: 0, seed: 42, num_ctx: 4096, num_predict: 256 };
const messages = [
  { role: "system", content: "Answer project questions using the saved facts from lookup_project. Look up the project before giving deployment facts. If a tool returns an error, explain what is missing. Do not claim to run deployments; your only tool reads a saved note." },
  { role: "user", content: "What command publishes my portfolio, and does pushing to GitHub publish it? Use my saved project note." },
];
const report = {
  started_utc: started.toISOString(), kind: "One local tool-use baseline smoke run, not training or a reliability benchmark",
  model, runtime: process.version, options, think: false,
  source_sha256: Object.fromEntries(["run.mjs", "lookup-project.mjs", "project-notes.json"].map(name =>
    [name, createHash("sha256").update(readFileSync(new URL(name, import.meta.url))).digest("hex")])),
  trace: [], final_answer: null, tool_executions: 0,
  limits: { model_turns: 3, total_tool_calls: 4, request_timeout_ms: 45000 },
  weights_changed: false,
};

async function request(path, payload) {
  const response = await fetch(base + path, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  return response.json();
}

try {
  report.server_version = await request("/api/version");
  const tags = await request("/api/tags");
  const installed = tags.models.find(item => item.name === model);
  if (!installed) throw new Error(`${model} is not installed. No model was downloaded.`);
  report.model_digest = installed.digest;
  report.model_details = installed.details;

  for (let turn = 0; turn < report.limits.model_turns; turn += 1) {
    const payload = { model, messages: structuredClone(messages), tools: [tool], stream: false, think: false, options };
    const response = await request("/api/chat", payload);
    report.trace.push({ kind: "model_response", turn, request: payload, response });
    const message = response.message;
    if (!message || message.role !== "assistant") throw new Error("Ollama returned no assistant message.");
    messages.push(message);

    if (!message.tool_calls?.length) {
      report.final_answer = message.content;
      report.stop_reason = "final_answer";
      break;
    }
    for (const call of message.tool_calls) {
      if (report.tool_executions >= report.limits.total_tool_calls) throw new Error("Tool-call budget reached.");
      const name = call.function?.name;
      const args = call.function?.arguments;
      const result = executeTool(name, args);
      report.tool_executions += 1;
      report.trace.push({ kind: "tool_execution", name, arguments: args, result });
      messages.push({ role: "tool", tool_name: String(name || "unknown_tool"), content: JSON.stringify(result) });
    }
  }
  report.stop_reason ??= "model_turn_limit";
  report.status = "completed";
} catch (error) {
  report.status = "runtime_error";
  report.error = `${error.name}: ${error.message}`;
  process.exitCode = 1;
} finally {
  report.wall_seconds = (performance.now() - clock) / 1000;
  const directory = new URL("../../evidence/qwen-tool-use/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const filename = started.toISOString().replace(/[:.]/g, "-") + ".json";
  writeFileSync(new URL(filename, directory), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, stop_reason: report.stop_reason,
    tool_executions: report.tool_executions, final_answer: report.final_answer,
    error: report.error, wall_seconds: report.wall_seconds, trace_file: filename }, null, 2));
}
