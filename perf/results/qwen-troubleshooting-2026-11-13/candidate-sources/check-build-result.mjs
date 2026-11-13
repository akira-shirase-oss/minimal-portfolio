import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { platform, arch, totalmem } from "node:os";
import { createBuildResultReader } from "./read-build-result.mjs";
import { executeTool } from "./lookup-project.mjs";

const report = {
  recorded_utc: new Date().toISOString(),
  kind: "Offline deterministic tool checks and injected-failure drill; no model calls",
  runtime: process.version, machine: { platform: platform(), arch: arch(), memory_bytes: totalmem() },
  command: "node labs/qwen-tool-use/check-build-result.mjs",
  model_inference_performed: false, weights_changed: false,
  source_sha256: Object.fromEntries(["check-build-result.mjs", "read-build-result.mjs", "build-results.json", "lookup-project.mjs", "project-notes.json", "run.mjs", "TROUBLESHOOTING.md"].map(name =>
    [name, createHash("sha256").update(readFileSync(new URL(name, import.meta.url))).digest("hex")])),
  checks: {}, trace: [],
};
function check(name, run) {
  try { run(); report.checks[name] = { passed: true }; }
  catch (error) { report.checks[name] = { passed: false, error: error.message }; }
}

const read = createBuildResultReader();
const note = executeTool("lookup_project", { project_name: "portfolio" });
const build = read({ project_name: "portfolio" });
check("original_note_remains_available", () => assert.equal(note.note.git_push_deploys, false));
check("example_has_a_specific_build_failure", () => {
  assert.equal(build.build.exit_code, 1);
  assert.match(build.build.error, /Broken internal link.*missing-example\.md/);
  assert.equal(build.build.deployment_started, false);
});
check("example_cannot_be_mistaken_for_live_status", () => assert.match(build.build.fixture_kind, /synthetic.*not a live/));
check("unknown_project_is_a_non_retryable_error", () => {
  const result = read({ project_name: "blog-api" });
  assert.equal(result.error.code, "NOT_FOUND");
  assert.equal(result.error.retryable, false);
  assert.deepEqual(result.available_projects, ["portfolio"]);
});
check("malformed_arguments_are_rejected", () => {
  for (const args of [null, [], {}, { project_name: "" }, { project_name: 12 }, { project_name: "portfolio", path: "/tmp/anything" }]) {
    assert.equal(read(args).error.code, "INVALID_ARGUMENTS");
  }
});
check("object_prototype_names_are_not_projects", () => {
  for (const name of ["__proto__", "constructor", "toString"]) assert.equal(read({ project_name: name }).error.code, "NOT_FOUND");
});
check("returned_data_cannot_mutate_future_reads", () => {
  build.build.exit_code = 0;
  assert.equal(read({ project_name: "portfolio" }).build.exit_code, 1);
});

const injected = createBuildResultReader({ failOnce: true });
const first = injected({ project_name: "portfolio" });
const second = injected({ project_name: "portfolio" });
report.trace = [
  { caller: "scripted test code, not a model", tool: "lookup_project", arguments: { project_name: "portfolio" }, result: note },
  { caller: "scripted test code, not a model", tool: "read_build_result", arguments: { project_name: "portfolio" }, result: first },
  { caller: "scripted test code, not a model", tool: "read_build_result", arguments: { project_name: "portfolio" }, result: second },
];
check("injected_failure_is_explicit_and_retryable", () => {
  assert.equal(first.error.code, "TEMPORARY_UNAVAILABLE");
  assert.equal(first.error.retryable, true);
  assert.equal(first.error.injected, true);
});
check("retry_can_read_the_original_failed_build", () => {
  assert.equal(second.build.exit_code, 1);
  assert.equal(second.build.deployment_started, false);
});
check("failure_state_does_not_leak_between_runs", () => {
  assert.equal(createBuildResultReader({ failOnce: true })({ project_name: "portfolio" }).error.code, "TEMPORARY_UNAVAILABLE");
  assert.equal(createBuildResultReader()({ project_name: "portfolio" }).build.exit_code, 1);
});
report.passed = Object.values(report.checks).every(check => check.passed);
report.limitations = "This tests our tool code and one scripted retry, not Qwen tool selection, diagnosis, recovery, harness stop limits, latency, memory, costs, or held-out quality.";
const directory = new URL("../../evidence/qwen-tool-use/", import.meta.url);
mkdirSync(directory, { recursive: true });
const filename = report.recorded_utc.replace(/[:.]/g, "-") + "-build-tool-check.json";
writeFileSync(new URL(filename, directory), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ passed: report.passed, check_count: Object.keys(report.checks).length, model_inference_performed: false, trace_file: filename, trace: report.trace }, null, 2));
if (!report.passed) process.exitCode = 1;
