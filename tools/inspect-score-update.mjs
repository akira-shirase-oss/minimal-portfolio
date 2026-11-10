// A single full-batch gradient update of eight free scores for the fixed prefix "cat ".
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';
import { scoreDistribution, updateScoreBatch } from './next-token-scores.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const vocabularyBefore = JSON.stringify(tokenizer.tokens);
const prefix = 'cat ';
const prefixIds = tokenizer.encode(prefix);
const examples = [];
for (const document of training) {
  const ids = tokenizer.encode(document.text);
  for (let position = 1; position < ids.length; position++) {
    const context = ids.slice(0, position);
    if (JSON.stringify(context) === JSON.stringify(prefixIds)) {
      examples.push({ document_id: document.id, prefix_ids: context, target_id: ids[position], target_token: tokenizer.tokens[ids[position]] });
    }
  }
}
const initialScores = tokenizer.tokens.map(() => 0);
let scores = [...initialScores];
const targetIds = examples.map(example => example.target_id);
const learningRate = 1;
const update = updateScoreBatch(scores, targetIds, learningRate);
scores = [...update.after.scores];
const predictionAfter = scoreDistribution(scores);
const aId = tokenizer.encode('a')[0];
const sId = tokenizer.encode('s')[0];
const isTarget = id => id === aId || id === sId;
const near = (left, right) => Math.abs(left - right) < 1e-12;
const shifted = scoreDistribution(scores.map(score => score + 1000));
const checks = {
  two_training_examples_for_one_fixed_prefix: examples.length === 2 && examples[0].document_id === 'train-line-1' && examples[0].target_token === 's' && examples[1].document_id === 'train-line-2' && examples[1].target_token === 'a',
  eight_scores_start_uniform: initialScores.length === 8 && update.before.probabilities.every(p => p === 0.125),
  balanced_training_targets: update.before.target_distribution.every((p, id) => p === (isTarget(id) ? 0.5 : 0)),
  initial_mean_loss_matches_log_eight: near(update.before.mean_loss, Math.log(8)),
  batch_gradient_matches_expected_values: update.before.gradient.every((gradient, id) => gradient === (isTarget(id) ? -0.375 : 0.125)),
  scores_changed_by_one_declared_update: scores.every((score, id) => score === (isTarget(id) ? 0.375 : -0.125)),
  both_observed_target_probabilities_increased: predictionAfter[aId] > 0.125 && predictionAfter[sId] > 0.125,
  other_six_probabilities_decreased: predictionAfter.every((p, id) => isTarget(id) || p < 0.125),
  updated_distribution_is_positive_and_normalized: predictionAfter.every(p => p > 0 && Number.isFinite(p)) && near(predictionAfter.reduce((a, b) => a + b, 0), 1),
  same_batch_mean_loss_decreased: update.after.mean_loss < update.before.mean_loss,
  vocabulary_and_initial_scores_unchanged: vocabularyBefore === JSON.stringify(tokenizer.tokens) && initialScores.every(score => score === 0),
  softmax_stays_finite_after_large_common_shift: shifted.every((p, id) => Number.isFinite(p) && near(p, predictionAfter[id])),
};
const sourcePaths = ['tools/character-tokenizer.mjs', 'tools/next-token-scores.mjs', 'tools/inspect-score-update.mjs', fixturePath];
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(), kind: 'One full-batch gradient update of a free logit vector for one fixed prefix; not a complete neural language model',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  fixture_version: fixture.version, vocabulary: tokenizer.tokens.map((token, id) => ({ id, token })),
  vocabulary_fitted_document_ids: training.map(document => document.id),
  model: { kind: 'Eight free scores attached to exactly one prefix; scores are parameters, token IDs are fixed', prefix, prefix_ids: prefixIds, trainable_parameters: scores.length, initial_scores: initialScores },
  training: { examples, target_ids: targetIds, updates: 1, learning_rate: learningRate, objective: 'Mean next-token negative log likelihood over both selected training examples, natural logarithm', selected_positions: examples.length, available_training_positions: 16, context_scope: 'Only cat followed by a space; other prefixes and the remaining 14 training positions are not trained here.' },
  update, checks, passed: Object.values(checks).every(Boolean),
  trainable_parameters_updated: true, neural_network_layers_implemented: false, full_language_model_trained: false,
  held_out_quality_measured: false, test_set_evaluated: false, text_generated: false,
  limitations: 'A single fixed-context logit row cannot compute predictions for other contexts or learn shared token representations. Lower loss is measured on the same two training examples only. No embeddings, attention, neural context encoder, generation loop, or Qwen adaptation.',
};
const output = process.argv[2] ?? 'perf/results/first-next-token-score-update.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ model: report.model, training: report.training, update, checks, passed: report.passed, evidence: output }, null, 2));
if (!report.passed) process.exitCode = 1;
