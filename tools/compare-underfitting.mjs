// A constant model on the same synthetic delivery data as the overfitting lesson.
// Optional first argument selects a fresh result path; existing results are preserved.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const root = new URL('../', import.meta.url);
const datasetPath = 'perf/fixtures/overfitting-v1.json';
const baselinePath = 'perf/results/first-overfitting-comparison.json';
const data = JSON.parse(readFileSync(new URL(datasetPath, root), 'utf8'));
const baseline = JSON.parse(readFileSync(new URL(baselinePath, root), 'utf8'));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

// Fitting chooses one constant using training targets alone. It cannot learn a slope.
const constant = mean(data.training.map(row => row.duration));
function evaluate(rows) {
  const cases = rows.map(row => ({ ...row, prediction: constant,
    absolute_error: Math.abs(constant - row.duration) }));
  return { cases, mean_absolute_error: mean(cases.map(row => row.absolute_error)) };
}
const model = { name: 'constant', description: 'One fitted number, the mean training duration, used at every distance',
  fitted: { constant_minutes: constant }, training: evaluate(data.training), validation: evaluate(data.validation) };
const sourcePaths = ['tools/compare-underfitting.mjs', datasetPath, baselinePath];
const sha = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const checks = {
  original_dataset_unchanged: sha(datasetPath) === baseline.source_sha256[datasetPath],
  baseline_contains_same_dataset: JSON.stringify(data) === JSON.stringify(baseline.dataset),
  original_model_sources_unchanged: Object.entries(baseline.source_sha256).every(([path, hash]) => sha(path) === hash),
  disjoint_inputs: data.validation.every(row => !data.training.some(train => train.distance === row.distance)),
  constant_is_finite: Number.isFinite(constant),
  training_residual_sum_zero: Math.abs(data.training.reduce((sum, row) => sum + constant - row.duration, 0)) < 1e-9,
  prediction_identical_at_all_distances: [...model.training.cases, ...model.validation.cases].every(row => row.prediction === constant),
};
const comparison = [model, ...baseline.models].map(item => ({
  model: item.name,
  training_mean_absolute_error_minutes: item.training.mean_absolute_error,
  validation_mean_absolute_error_minutes: item.validation.mean_absolute_error,
  evidence: item.name === 'constant' ? 'this run' : baselinePath,
}));
const line = comparison.find(item => item.model === 'straight_line');
const outputPath = process.argv[2] ?? 'perf/results/first-underfitting-comparison.json';
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'One constant-model fitting run with frozen earlier comparisons; not language-model training or a capacity benchmark',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, sha(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model,
    logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  dataset: data,
  fitting: 'Choose the mean training duration, which minimizes training squared error among constant predictions. Report mean absolute error to compare with the original lesson. No validation targets used in fitting.',
  model,
  comparison,
  checks,
  program_checks_passed: Object.values(checks).every(Boolean),
  observed_comparison: {
    constant_training_error_higher_than_line: model.training.mean_absolute_error > line.training_mean_absolute_error_minutes,
    constant_validation_error_higher_than_line: model.validation.mean_absolute_error > line.validation_mean_absolute_error_minutes,
  },
  quality_verdict: 'The constant model cannot represent any distance-dependent trend. Comparison illustrates underfitting on deliberately constructed data, without application acceptance limits or promotion. Validation cases were already inspected in the earlier lesson and are not a fresh final test.',
  baseline_models_rerun: false,
  neural_network_or_qwen_weights_changed: false,
  model_promoted: false,
};
writeFileSync(new URL(outputPath, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ constant_minutes: constant, comparison, checks,
  observed_comparison: report.observed_comparison, evidence: outputPath }, null, 2));
if (!report.program_checks_passed) process.exitCode = 1;
