// Same one-weight trainer and three updates; only the learning rate changes.
// Optional first argument selects a fresh result file; old evidence is preserved.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { train } from '../perf/fixtures/one-weight-training-v1.mjs';

const root = new URL('../', import.meta.url);
const trainerPath = 'perf/fixtures/one-weight-training-v1.mjs';
const baselinePath = 'perf/results/first-training-loop-experiment.json';
const baseline = JSON.parse(readFileSync(new URL(baselinePath, root), 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const close = (a, b) => Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
const settings = { input: 2, target: 6, starting_weight: 2, updates: 3, gradient_probe_distance: 0.5 };
const trials = [
  { name: 'steady', learning_rate: 0.1 },
  { name: 'oscillating', learning_rate: 0.25 },
  { name: 'diverging', learning_rate: 0.3 },
].map(trial => ({ ...trial, history: train(settings.starting_weight, trial.learning_rate, settings.updates) }));

const checks = {
  original_trainer_source_preserved: hash(trainerPath) === baseline.local_source_sha256,
  original_experiment_settings_preserved: baseline.settings.starting_weight === settings.starting_weight
    && baseline.settings.updates === settings.updates && baseline.settings.gradient_probe_distance === settings.gradient_probe_distance
    && baseline.dataset.length === 1 && baseline.dataset[0].input === settings.input && baseline.dataset[0].target === settings.target,
  steady_trial_matches_original_record: trials[0].history.length === baseline.history.length
    && trials[0].history.every((row, i) => Object.entries(row).every(([key, value]) => close(value, baseline.history[i][key]))),
  initial_state_identical: trials.every(trial => trial.history[0].weight === 2 && trial.history[0].prediction === 4 && trial.history[0].loss === 4),
  three_updates_four_recorded_rows: trials.every(trial => trial.history.length === 4),
  finite_values: trials.every(trial => trial.history.every(row => Object.values(row).every(Number.isFinite))),
  fresh_gradients_match_quadratic: trials.every(trial => trial.history.every(row => close(row.gradient, 8 * (row.weight - 3)))),
  updates_use_current_gradient: trials.every(trial => trial.history.slice(1).every((row, i) =>
    close(row.weight, trial.history[i].weight - trial.learning_rate * trial.history[i].gradient))),
};
const direction = history => history.slice(1).map((row, i) => row.loss - history[i].loss);
const observations = {
  rate_0_1_loss_decreases_each_update: direction(trials[0].history).every(change => change < 0),
  rate_0_25_loss_unchanged_while_weights_alternate: trials[1].history.every((row, i) => close(row.loss, 4) && close(row.weight, i % 2 === 0 ? 2 : 4)),
  rate_0_3_loss_increases_each_update: direction(trials[2].history).every(change => change > 0),
};
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'One synthetic training-stability comparison with three controlled learning-rate trials; not a language-model run or capacity benchmark',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(['tools/compare-training-stability.mjs', trainerPath, baselinePath].map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length,
    memory_bytes: os.totalmem(), runtime: process.version },
  dataset: [{ input: settings.input, target: settings.target }],
  settings,
  model: 'prediction = input * weight; squared-error loss; centered numerical gradient; ordinary floating-point arithmetic',
  changed_factor: 'learning_rate only; each trial starts fresh at weight 2 and takes three updates',
  trials,
  observations,
  checks,
  program_checks_passed: Object.values(checks).every(Boolean),
  quality_verdict: 'Descriptive toy training comparison. No validation examples, application acceptance threshold, or promotion decision. Rates are specific to this model and data scale, not universal recommendations.',
  original_training_and_failed_validation_records_changed: false,
  neural_network_or_qwen_weights_changed: false,
  model_promoted: false,
};
const output = process.argv[2] ?? 'perf/results/first-training-stability-comparison.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ trials: trials.map(trial => ({ name: trial.name, learning_rate: trial.learning_rate,
  weights: trial.history.map(row => row.weight), losses: trial.history.map(row => row.loss) })),
  observations, program_checks_passed: report.program_checks_passed, evidence: output }, null, 2));
if (!report.program_checks_passed) process.exitCode = 1;
