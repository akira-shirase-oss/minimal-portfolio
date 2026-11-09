// Two tiny fitted models; no neural network, gradient descent, or external packages.
// Run from the checkout: node tools/compare-overfitting.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const root = new URL('../', import.meta.url);
const dataPath = 'perf/fixtures/overfitting-v1.json';
const data = JSON.parse(readFileSync(new URL(dataPath, root), 'utf8'));
const training = data.training;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const xMean = mean(training.map(row => row.distance));
const yMean = mean(training.map(row => row.duration));
const slope = training.reduce((sum, row) => sum + (row.distance - xMean) * (row.duration - yMean), 0)
  / training.reduce((sum, row) => sum + (row.distance - xMean) ** 2, 0);
const intercept = yMean - slope * xMean;

// Fit uses training rows only. Validation targets never enter either model.
const straightLine = distance => intercept + slope * distance;
const flexibleCurve = distance => training.reduce((sum, row, i) => {
  let contribution = row.duration;
  for (let j = 0; j < training.length; j += 1) {
    if (j !== i) contribution *= (distance - training[j].distance) / (row.distance - training[j].distance);
  }
  return sum + contribution;
}, 0);

function evaluate(predict, rows) {
  const predictions = rows.map(row => {
    const prediction = predict(row.distance);
    return { ...row, prediction, absolute_error: Math.abs(prediction - row.duration) };
  });
  return { cases: predictions, mean_absolute_error: mean(predictions.map(row => row.absolute_error)) };
}

const models = [
  { name: 'straight_line', description: 'Least-squares straight line: two fitted coefficients',
    fitted: { slope, intercept }, predict: straightLine },
  { name: 'flexible_curve', description: 'Degree-5 polynomial interpolating the six training observations',
    fitted: { representation: 'Lagrange interpolation through training rows', nodes: training }, predict: flexibleCurve },
].map(({ predict, ...model }) => ({ ...model,
  training: evaluate(predict, training), validation: evaluate(predict, data.validation) }));

const lineResiduals = models[0].training.cases.map(row => row.prediction - row.duration);
const checks = {
  disjoint_inputs: data.validation.every(row => !training.some(train => train.distance === row.distance)),
  unique_training_inputs: new Set(training.map(row => row.distance)).size === training.length,
  finite_predictions: models.every(model => [model.training, model.validation].every(split =>
    split.cases.every(row => Number.isFinite(row.prediction)))),
  line_residual_sum: Math.abs(lineResiduals.reduce((sum, value) => sum + value, 0)) < 1e-9,
  line_weighted_residual_sum: Math.abs(lineResiduals.reduce((sum, value, i) => sum + value * training[i].distance, 0)) < 1e-9,
  curve_matches_training: models[1].training.cases.every(row => row.absolute_error < 1e-9),
};
const hashes = Object.fromEntries(['tools/compare-overfitting.mjs', dataPath].map(path =>
  [path, createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex')]));
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'One synthetic model-fitting comparison; not a language-model training run or capacity benchmark',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: hashes,
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model,
    logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  dataset: data,
  fitting: 'Closed-form least squares and interpolation using training observations only; no iterative optimizer or early stopping',
  models,
  checks,
  program_checks_passed: Object.values(checks).every(Boolean),
  observed_comparison: {
    flexible_curve_training_error_lower: models[1].training.mean_absolute_error < models[0].training.mean_absolute_error,
    flexible_curve_validation_error_higher: models[1].validation.mean_absolute_error > models[0].validation.mean_absolute_error,
  },
  quality_verdict: 'No application acceptance threshold or promotion decision. This hand-constructed example illustrates fitting noise; it is not evidence that flexible models always generalize worse.',
  model_promoted: false,
};
const output = new URL('perf/results/first-overfitting-comparison.json', root);
// Preserve the first comparison. Later experiments must use distinct evidence paths.
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ models: models.map(model => ({ model: model.name,
  training_mean_absolute_error_minutes: model.training.mean_absolute_error,
  validation_mean_absolute_error_minutes: model.validation.mean_absolute_error })),
  program_checks_passed: report.program_checks_passed, observed_comparison: report.observed_comparison,
  evidence: 'perf/results/first-overfitting-comparison.json' }, null, 2));
if (!report.program_checks_passed) process.exitCode = 1;
