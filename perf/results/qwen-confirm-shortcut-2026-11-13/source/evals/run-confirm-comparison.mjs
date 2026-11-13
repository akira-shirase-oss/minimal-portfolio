// Runs evals/confirm-shortcut-v1.json against the real local MLX Qwen server.
// Usage: node evals/run-confirm-comparison.mjs <output-directory>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { cpus, totalmem } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { openStore } from "../store.mjs";
import { createApp } from "../app.mjs";

const lab = new URL("../", import.meta.url);
const plan = JSON.parse(readFileSync(new URL("evals/confirm-shortcut-v1.json", lab)));
const outDir = process.argv[2];
if (!outDir) throw new Error("Pass an output directory.");
mkdirSync(join(outDir, "reports"), { recursive: true });

const health = await fetch("http://127.0.0.1:8080/health").then(r => r.json()).catch(() => null);
if (health?.status !== "ok") throw new Error("MLX server is not healthy at 127.0.0.1:8080; nothing was run.");

const sha = name => createHash("sha256").update(readFileSync(new URL(name, lab))).digest("hex");
const sources = Object.fromEntries(["agent.mjs", "app.mjs", "tools.mjs", "store.mjs", "model.mjs", "model-config.json",
  "evals/confirm-shortcut-v1.json", "evals/run-confirm-comparison.mjs"].map(name => [name, sha(name)]));
const manifest = JSON.parse(readFileSync(new URL(".models/model-manifest.json", lab)));

const countWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
function judge(id, report, before, after) {
  const answer = report.answer ?? "";
  const results = report.trace.filter(e => e.kind === "tool_result");
  const creates = results.filter(e => e.name === "create_todo" && e.result?.todo && !e.result.replayed);
  const titles = after.todos.map(t => t.title);
  switch (id) {
    case "create": {
      const row = creates[0]?.result.todo;
      return creates.length === 1 && after.total === before.total + 1 && row?.title === "Inspect query breakdown" &&
        answer.includes(String(row.id)) && answer.includes(row.title);
    }
    case "list":
      return results.some(e => e.name === "list_todos") && after.total === before.total && titles.every(t => answer.includes(t));
    case "missing-title":
      return results.length === 0 && after.total === before.total && /title/i.test(answer);
    case "unsupported-delete":
      return creates.length === 0 && after.total === before.total && /(delete|cannot|can't|unable|not able)/i.test(answer);
    case "compound":
      // Fixed 13 Nov after the first run: a bare-number match was fooled by the todo ID ("#3"); require a stated count.
      return creates.length === 1 && /bakery/i.test(creates[0].result.todo.title) && after.total === before.total + 1 &&
        new RegExp(`\\b(${after.total}|${countWords[after.total]})\\s+(saved\\s+|total\\s+)?(todos?|tasks?|items?)\\b|\\btotal\\b[^.]*\\b(${after.total}|${countWords[after.total]})\\b`, "i").test(answer);
  }
}

const warmStarted = performance.now();
const warm = await fetch("http://127.0.0.1:8080/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "default_model", messages: [{ role: "user", content: "Reply with just READY." }], max_tokens: 8, temperature: 0 }) }).then(r => r.json());
const warmUp = { seconds: (performance.now() - warmStarted) / 1000, reply: warm.choices?.[0]?.message?.content ?? null, counted: false };
console.log(`warm-up (not counted): ${warmUp.seconds.toFixed(2)}s -> ${JSON.stringify(warmUp.reply)}`);

const arms = { A_model_writes: false, B_code_confirms: true };
const order = [["A_model_writes", "B_code_confirms"], ["B_code_confirms", "A_model_writes"], ["A_model_writes", "B_code_confirms"]];
const rows = [];
for (let rep = 1; rep <= plan.protocol.repetitions; rep++) {
  for (const arm of order[rep - 1]) {
    const store = openStore();
    store.create("Read Qwen notes", randomUUID());
    const app = createApp({ store, confirmWrites: arms[arm] });
    const session = randomUUID();
    for (const c of plan.cases) {
      const before = store.list();
      const response = await app(new Request("http://127.0.0.1:3210/api/chat", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session, request_id: randomUUID(), message: c.message }) }));
      const report = await response.json();
      const after = store.list();
      const file = `${arm}-rep${rep}-${c.id}.json`;
      writeFileSync(join(outDir, "reports", file), JSON.stringify({ ...report, experiment: plan.version, arm, rep, case: c.id, source_sha256: sources }, null, 2) + "\n");
      const row = { arm, rep, case: c.id, passed: report.status === "completed" && judge(c.id, report, before, after),
        status: report.status, stop_reason: report.stop_reason, answer_source: report.answer_source, answer: report.answer,
        model_responses: report.model_responses, tool_calls: report.tool_calls, tools: report.trace.filter(e => e.kind === "tool_result").map(e => e.name),
        prompt_tokens: report.usage.prompt_tokens, output_tokens: report.usage.output_tokens, wall_seconds: report.wall_seconds,
        rows_before: before.total, rows_after: after.total, report: `reports/${file}` };
      rows.push(row);
      console.log(`${arm} rep${rep} ${c.id.padEnd(18)} ${row.passed ? "PASS" : "FAIL"} ${row.wall_seconds.toFixed(2)}s calls=${row.model_responses} tokens=${row.prompt_tokens}/${row.output_tokens} :: ${String(row.answer).replaceAll("\n", " ").slice(0, 110)}`);
    }
    store.close();
  }
}

const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const summary = {};
for (const c of plan.cases) for (const arm of Object.keys(arms)) {
  const group = rows.filter(r => r.case === c.id && r.arm === arm);
  const stat = key => { const v = group.map(r => r[key]).filter(Number.isFinite); return v.length ? { median: median(v), min: Math.min(...v), max: Math.max(...v) } : null; };
  (summary[c.id] ??= {})[arm] = { passed: `${group.filter(r => r.passed).length}/${group.length}`,
    wall_seconds: stat("wall_seconds"), model_responses: stat("model_responses"), prompt_tokens: stat("prompt_tokens"), output_tokens: stat("output_tokens") };
}
writeFileSync(join(outDir, "summary.json"), JSON.stringify({ experiment: plan.version, recorded_utc: new Date().toISOString(),
  kind: plan.kind, weights_changed: false, machine: { cpu: cpus()[0]?.model, memory_bytes: totalmem(), node: process.version },
  model: { repository: manifest.repository, revision: manifest.revision, packages: manifest.packages }, source_sha256: sources,
  protocol: plan.protocol, warm_up: warmUp, summary, runs: rows }, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 1));
