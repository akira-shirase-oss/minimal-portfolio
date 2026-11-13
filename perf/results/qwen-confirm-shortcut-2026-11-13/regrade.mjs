// Re-grades saved answers after a grader bug: the compound count check matched the todo ID ("#3"/"ID 3")
// instead of a stated count. Original summary.json is preserved; corrected grades go to summary.regraded.json.
import { readFileSync, writeFileSync } from "node:fs";
const s = JSON.parse(readFileSync(new URL("summary.json", import.meta.url)));
const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const statesCount = (answer, n) => new RegExp(`\\b(${n}|${words[n]})\\s+(saved\\s+|total\\s+)?(todos?|tasks?|items?)\\b|\\btotal\\b[^.]*\\b(${n}|${words[n]})\\b`, "i").test(answer ?? "");
const runs = s.runs.map(r => {
  if (r.case !== "compound") return { ...r, passed_original: r.passed };
  const report = JSON.parse(readFileSync(new URL(r.report, import.meta.url)));
  const created = report.trace.find(e => e.kind === "tool_result" && e.name === "create_todo")?.result?.todo;
  return { ...r, passed_original: r.passed, passed: r.status === "completed" && !!created && /bakery/i.test(created.title) && r.rows_after === r.rows_before + 1 && statesCount(r.answer, r.rows_after),
    observed_title: created?.title ?? null };
});
const median = xs => { const v = [...xs].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const table = {};
for (const r of runs) ((table[r.case] ??= {})[r.arm] ??= []).push(r);
const out = {};
for (const [c, arms] of Object.entries(table)) for (const [arm, g] of Object.entries(arms))
  (out[c] ??= {})[arm] = { passed: `${g.filter(r => r.passed).length}/${g.length}`, passed_original: `${g.filter(r => r.passed_original).length}/${g.length}`,
    wall_s_median: +median(g.map(r => r.wall_seconds)).toFixed(3), wall_s_range: [+Math.min(...g.map(r => r.wall_seconds)).toFixed(3), +Math.max(...g.map(r => r.wall_seconds)).toFixed(3)],
    model_calls: median(g.map(r => r.model_responses)), prompt_tokens_median: median(g.map(r => r.prompt_tokens)), output_tokens_median: median(g.map(r => r.output_tokens)) };
const sessions = {};
for (const r of runs) { const k = `${r.arm} rep${r.rep}`; sessions[k] = +((sessions[k] ?? 0) + r.wall_seconds).toFixed(3); }
writeFileSync(new URL("summary.regraded.json", import.meta.url), JSON.stringify({ regraded_utc: new Date().toISOString(),
  reason: "Grader bug: compound count regex matched the todo ID. Corrected to require a stated count. Model outputs unchanged; no rerun.",
  summary: out, session_wall_seconds: sessions, compound_titles: runs.filter(r => r.case === "compound").map(r => r.observed_title), runs }, null, 2) + "\n");
console.log(JSON.stringify({ summary: out, session_wall_seconds: sessions, compound_titles: [...new Set(runs.filter(r => r.case === "compound").map(r => r.observed_title))] }, null, 1));
