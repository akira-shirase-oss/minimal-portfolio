// Check the actual runnable example printed in chapter 3, using independent oracles.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cpus, totalmem, platform, arch } from "node:os";
import { runInNewContext } from "node:vm";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const chapter = readFileSync("content/learn/model-engineering/our-first-training-loop.md", "utf8");
const blocks = [...chapter.matchAll(/```javascript\n([\s\S]*?)\n```/g)];
const source = blocks.at(-1)[1];
let printed;
const context = { console: { table(rows) { printed = JSON.parse(JSON.stringify(rows)); } } };
runInNewContext(source, context, { timeout: 1000 });
const checks = [];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
function check(name, fn) { fn(); checks.push({ name, passed: true }); }
const rows = (start, rate, updates) => JSON.parse(JSON.stringify(context.train(start, rate, updates)));

check("three updates produce starting point plus three results", () => {
  assert.equal(printed.length, 4);
  const expected = [[2, 4, 4], [2.8, 5.6, 0.16], [2.96, 5.92, 0.0064], [2.992, 5.984, 0.000256]];
  printed.forEach((row, index) => {
    assert.equal(row.step, index);
    [row.weight, row.prediction, row.loss].forEach((value, column) => close(value, expected[index][column]));
  });
});
check("fresh numerical gradients match the independently derived quadratic slope", () => {
  for (const start of [2, 3, 4]) {
    for (const rate of [0.01, 0.1, 0.3]) {
      for (const row of rows(start, rate, 3)) close(row.gradient, 8 * (row.weight - 3));
    }
  }
});
check("default training loss decreases on each of the three updates", () => {
  for (let index = 1; index < printed.length; index += 1) assert.ok(printed[index].loss < printed[index - 1].loss);
});
check("starting above the target decreases the weight", () => close(rows(4, 0.1, 1)[1].weight, 3.2));
check("exact-match zero gradient leaves the weight unchanged", () => {
  for (const row of rows(3, 0.1, 3)) {
    assert.equal(row.weight, 3); assert.equal(row.gradient, 0); assert.equal(row.loss, 0);
  }
});
check("smaller rate gives the independently calculated first update", () => close(rows(2, 0.01, 1)[1].weight, 2.08));
check("oversized rate causes the expected training-loss regression", () => {
  const run = rows(2, 0.3, 1);
  close(run[1].weight, 4.4); close(run[1].prediction, 8.8); close(run[1].loss, 7.84);
  assert.ok(run[1].loss > run[0].loss);
});
check("zero rate is a frozen-weight baseline", () => {
  for (const row of rows(2, 0, 3)) assert.equal(row.weight, 2);
});

let localSourceSha = null;
if (process.argv[2]) {
  const path = resolve(process.argv[2]);
  const local = await import(pathToFileURL(path).href);
  check("local learning file and published example produce identical traces", () => {
    for (const [start, rate] of [[2, 0.1], [4, 0.1], [3, 0.1], [2, 0.01], [2, 0.3], [2, 0]]) {
      assert.deepEqual(local.train(start, rate, 3), rows(start, rate, 3));
    }
  });
  localSourceSha = createHash("sha256").update(readFileSync(path)).digest("hex");
}

const dataset = [{ input: 2, target: 6 }];
const result = {
  executed_utc: new Date().toISOString(),
  kind: "One-weight local training experiment and numerical checks; not a language-model benchmark",
  runtime: process.version,
  machine: { platform: platform(), arch: arch(), cpu: cpus()[0].model, logical_cpus: cpus().length, memory_bytes: totalmem() },
  dataset, dataset_sha256: createHash("sha256").update(JSON.stringify(dataset)).digest("hex"),
  source: "Complete JavaScript example in our-first-training-loop.md",
  source_sha256: createHash("sha256").update(source).digest("hex"),
  local_source_sha256: localSourceSha,
  settings: { starting_weight: 2, learning_rate: 0.1, updates: 3, gradient_probe_distance: 0.5 },
  criteria: { numerical_absolute_or_relative_tolerance: 1e-10, expected_trace: "four rows: weights 2, 2.8, 2.96, 2.992", default_loss_must_decrease_each_update: true },
  history: printed, checks,
  conclusions: { program_checks: "PASS", training_loss_on_this_pair: "DECREASED", unseen_data_quality: "NOT_EVALUATED", qwen_weights_changed: false },
};
writeFileSync("perf/results/first-training-loop-experiment.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ checks: checks.length, ...result.conclusions, final: printed.at(-1) }, null, 2));
