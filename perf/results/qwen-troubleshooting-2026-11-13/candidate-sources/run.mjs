import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { tool, executeTool } from "./lookup-project.mjs";
import { buildResultTool, createBuildResultReader } from "./read-build-result.mjs";

const model = "qwen3:8b";
const base = "http://127.0.0.1:11434";
const started = new Date();
const clock = performance.now();
const options = { temperature: 0, seed: 42, num_ctx: 4096, num_predict: 256 };
const cli = process.argv.slice(2);
const troubleshooting = cli[0] === "--troubleshoot";
if (troubleshooting) cli.shift();
const failBuildOnce = troubleshooting && cli.includes("--fail-build-once");
const question = cli.filter(arg => arg !== "--fail-build-once")[0] ?? (troubleshooting
  ? "For the saved portfolio build example, why did publication not happen, and what should I check next? Use the saved project note and build result."
  : "What command publishes my portfolio, and does pushing to GitHub publish it? Use my saved project note.");
const readBuildResult = createBuildResultReader({ failOnce: failBuildOnce });
const availableTools = troubleshooting ? [tool, buildResultTool] : [tool];
const messages = [
  { role: "system", content: "Answer project questions using the saved facts from lookup_project. Look up the project before giving deployment facts. If a tool returns an error, explain what is missing. If the saved note does not contain the fact asked for, say the note does not record it — do not fill gaps from your own knowledge. If the question does not name a project, ask which project — and never describe what a note does or does not record unless you have looked it up. Do not claim to run deployments; your only tool reads a saved note." },
  { role: "user", content: question },
];
if (troubleshooting) {
  messages[0].content = messages[0].content.replace("your only tool reads a saved note", "your tools only read saved records");
  messages[0].content += " You also have read_build_result: before diagnosing a saved build example, read both its project note and its build result. Build results in this lab are explicitly synthetic, not live status: identify that in your answer. Treat error objects as failures, not successful records. For a retryable build-reader error, retry that read at most once; otherwise explain the missing evidence. Recommend a next step supported by the records. These tools only read data; you cannot fix files, build, or deploy.";
}
const report = {
  started_utc: started.toISOString(), kind: "One local tool-use inference attempt, not training or a reliability benchmark",
  model, runtime: process.version, options, think: false, question,
  mode: troubleshooting ? "saved_build_troubleshooting" : "project_note_lookup", injected_build_failure: failBuildOnce,
  source_sha256: Object.fromEntries(["run.mjs", "lookup-project.mjs", "project-notes.json", "read-build-result.mjs", "build-results.json"].map(name =>
    [name, createHash("sha256").update(readFileSync(new URL(name, import.meta.url))).digest("hex")])),
  trace: [], final_answer: null, tool_executions: 0,
  limits: { model_turns: troubleshooting ? 4 : 3, total_tool_calls: 4, request_timeout_ms: 45000 },
  weights_changed: false,
};

async function request(path, payload) {
  let response;
  try {
    response = await fetch(base + path, {
      method: payload ? "POST" : "GET",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(report.limits.request_timeout_ms),
    });
  } catch (error) {
    report.failed_request = { path, cause_code: error.cause?.code ?? error.code ?? null };
    throw error;
  }
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
    const payload = { model, messages: structuredClone(messages), tools: availableTools, stream: false, think: false, options };
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
      const result = troubleshooting && name === "read_build_result" ? readBuildResult(args) : executeTool(name, args);
      report.tool_executions += 1;
      report.trace.push({ kind: "tool_execution", name, arguments: args, result });
      messages.push({ role: "tool", tool_name: String(name || "unknown_tool"), content: JSON.stringify(result) });
    }
  }
  report.stop_reason ??= "model_turn_limit";
  report.status = report.stop_reason === "final_answer" && report.final_answer?.trim() ? "completed" : "incomplete";
  if (report.status === "incomplete") process.exitCode = 2;
} catch (error) {
  report.status = "runtime_error";
  report.error = `${error.name}: ${error.message}`;
  report.error_code = error.cause?.code ?? error.code ?? null;
  process.exitCode = 1;
} finally {
  report.wall_seconds = (performance.now() - clock) / 1000;
  const responses = report.trace.filter(event => event.kind === "model_response").map(event => event.response);
  report.model_responses = responses.length;
  report.usage = Object.fromEntries([["prompt_tokens", "prompt_eval_count"], ["output_tokens", "eval_count"]].map(([label, key]) =>
    [label, responses.length && responses.every(response => Number.isFinite(response[key])) ? responses.reduce((sum, response) => sum + response[key], 0) : null]));
  const directory = new URL("../../evidence/qwen-tool-use/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const filename = started.toISOString().replace(/[:.]/g, "-") + ".json";
  writeFileSync(new URL(filename, directory), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, stop_reason: report.stop_reason,
    tool_executions: report.tool_executions, final_answer: report.final_answer,
    error: report.error, error_code: report.error_code, failed_request: report.failed_request,
    usage: report.usage, wall_seconds: report.wall_seconds, trace_file: filename }, null, 2));
}
