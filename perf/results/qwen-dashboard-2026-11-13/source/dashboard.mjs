import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cpus, totalmem } from "node:os";
import { modelConfig } from "./model.mjs";
import { limits, settings } from "./agent.mjs";

const validId = /^[a-zA-Z0-9-]{1,100}$/;
export function createDashboardServices({ store, runDirectory, manifestPath, fetchImpl = globalThis.fetch }) {
  function runDetails(id) {
    if (!validId.test(id)) return null;
    const path = join(runDirectory, `${id}.json`);
    if (!existsSync(path)) return null;
    try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
  }
  function savedRuns() {
    if (!existsSync(runDirectory)) return { runs: [], total: 0, unreadable: 0 };
    const files = readdirSync(runDirectory).filter(name => name.endsWith(".json") && validId.test(name.slice(0, -5)))
      .map(name => ({ name, mtime: statSync(join(runDirectory, name)).mtimeMs })).sort((a, b) => b.mtime - a.mtime);
    const runs = []; let unreadable = 0;
    for (const { name } of files.slice(0, 100)) {
      const id = name.slice(0, -5), report = runDetails(id);
      if (!report) { unreadable++; continue; }
      runs.push({ id, recorded_utc: report.recorded_utc, question: report.question ?? "Direct model smoke",
        answer: report.answer ?? null, status: report.status ?? (report.inference_performed ? "smoke_completed" : "unknown"),
        kind: id.startsWith("direct-smoke-") ? "Model smoke" : "Chat run", wall_seconds: report.wall_seconds ?? null,
        model_responses: report.model_responses ?? null, tool_calls: report.tool_calls ?? null, usage: report.usage ?? null });
    }
    return { runs, total: files.length, unreadable };
  }
  async function modelStatus() {
    let manifest = null;
    try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { /* An unfinished download has no manifest. */ }
    const identityMatches = manifest?.repository === modelConfig.repository && manifest?.revision === modelConfig.revision;
    let reachable = false, healthy = false, error = null;
    try {
      const response = await fetchImpl("http://127.0.0.1:8080/health", { signal: AbortSignal.timeout(2000) });
      if (!response.ok) throw new Error(`MLX HTTP ${response.status}`);
      const result = await response.json(); reachable = true;
      healthy = result.status === "ok";
    } catch (failure) { error = failure.cause?.code ?? failure.message; }
    return { runtime: "MLX-LM", repository: modelConfig.repository, revision: modelConfig.revision,
      runtime_version: manifest?.packages?.["mlx-lm"] ?? null, packages: manifest?.packages ?? {},
      files_ready: Boolean(identityMatches), runtime_online: reachable,
      runtime_healthy: healthy, ready: Boolean(identityMatches && reachable && healthy),
      identity_scope: "Pinned download manifest; health endpoint does not attest loaded model identity",
      file_bytes: manifest ? Object.values(manifest.files ?? {}).reduce((sum, item) => sum + item.bytes, 0) : null,
      device: cpus()[0]?.model ?? "Apple Silicon", memory_bytes: totalmem(), error, settings, limits };
  }
  return { runDetails, async dashboard() { return { todos: store.list(), activity: savedRuns(), model: await modelStatus() }; } };
}
