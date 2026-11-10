// One gradient step learns two input-token vectors while the output head stays fixed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';
import { embeddingPrediction, updateEmbeddings } from './last-token-embeddings.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const vocabularyBefore = JSON.stringify(tokenizer.tokens);
const examples = [];
for (const document of training) {
  const ids = tokenizer.encode(document.text);
  for (let position = 1; position < ids.length; position++) {
    const prefix = tokenizer.decode(ids.slice(0, position));
    if (prefix === 'cat s' || prefix === 'cat a') examples.push({
      document_id: document.id, prefix, prefix_ids: ids.slice(0, position),
      input_token_id: ids[position - 1], target_id: ids[position], target_token: tokenizer.tokens[ids[position]],
    });
  }
}
const initialEmbeddings = tokenizer.tokens.map(() => [0, 0]);
// Author-chosen balanced directions; these head weights are frozen, not learned.
const head = [[-1, 0], [0, -1], [0.5, 0.5], [1, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0, 1]];
const headBefore = JSON.stringify(head);
const update = updateEmbeddings(initialEmbeddings, head, examples, 1);
const learnedEmbeddings = update.after.embeddings;
const trace = prefix => {
  const ids = tokenizer.encode(prefix);
  return { prefix, prefix_ids: ids, input_scope: 'Last token only; earlier tokens are not consumed by this predictor',
    ...embeddingPrediction(learnedEmbeddings, head, ids.at(-1)) };
};
const predictions = ['cat s', 'cat a', 'tea'].map(trace);
const aId = tokenizer.encode('a')[0];
const sId = tokenizer.encode('s')[0];
const tId = tokenizer.encode('t')[0];
const near = (a, b) => Math.abs(a - b) < 1e-12;
const checks = {
  two_training_positions_with_different_last_tokens: examples.length === 2 && examples[0].prefix === 'cat s' && examples[0].target_token === 'a' && examples[1].prefix === 'cat a' && examples[1].target_token === 't',
  eight_two_number_vectors_are_parameters: learnedEmbeddings.length === 8 && learnedEmbeddings.every(row => row.length === 2),
  equal_initial_embeddings_give_uniform_probabilities: update.before.predictions.every(p => p.probabilities.every(value => value === 0.125)),
  lookup_uses_token_id_as_row_index: JSON.stringify(predictions[0].embedding) === JSON.stringify(learnedEmbeddings[sId]) && JSON.stringify(predictions[1].embedding) === JSON.stringify(learnedEmbeddings[aId]),
  s_embedding_learns_first_direction: learnedEmbeddings[sId][0] === 0.5 && learnedEmbeddings[sId][1] === 0,
  a_embedding_learns_second_direction: learnedEmbeddings[aId][0] === 0 && learnedEmbeddings[aId][1] === 0.5,
  other_six_embedding_rows_unchanged: learnedEmbeddings.every((row, id) => id === aId || id === sId || row.every(value => value === 0)),
  frozen_head_and_vocabulary_preserved: JSON.stringify(head) === headBefore && JSON.stringify(tokenizer.tokens) === vocabularyBefore,
  different_last_tokens_produce_different_scores: JSON.stringify(predictions[0].scores) !== JSON.stringify(predictions[1].scores),
  both_training_targets_gain_probability: predictions[0].probabilities[aId] > 0.125 && predictions[1].probabilities[tId] > 0.125,
  same_last_token_has_same_prediction_despite_different_prefix: JSON.stringify(predictions[1].probabilities) === JSON.stringify(predictions[2].probabilities),
  probability_vectors_are_normalized: predictions.every(p => p.probabilities.every(value => value > 0 && Number.isFinite(value)) && near(p.probabilities.reduce((a, b) => a + b, 0), 1)),
  mean_loss_on_the_two_training_positions_decreases: update.after.mean_loss < update.before.mean_loss,
};
const sourcePaths = ['tools/character-tokenizer.mjs', 'tools/next-token-scores.mjs', 'tools/last-token-embeddings.mjs', 'tools/inspect-token-embeddings.mjs', fixturePath];
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(), kind: 'One embedding-gradient step in a last-token predictor with a frozen linear output head',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  fixture_version: fixture.version, vocabulary: tokenizer.tokens.map((token, id) => ({ id, token })),
  vocabulary_fitted_document_ids: training.map(document => document.id),
  architecture: { input: 'Last token of the supplied prefix only', embedding_width: 2, embedding_parameters: 16, output_head: head, output_head_origin: 'Author-chosen and frozen to isolate embedding updates; coordinate directions are not general semantic labels.', output_head_trained: false, attention_implemented: false, positional_information_used: false },
  training: { examples, selected_positions: 2, available_training_positions: 16, updates: 1, learning_rate: 1, objective: 'Mean next-token negative log likelihood over the two selected training positions, natural log' },
  update, predictions, checks, passed: Object.values(checks).every(Boolean),
  input_embeddings_updated: true, output_head_updated: false, held_out_quality_measured: false, test_set_evaluated: false, text_generated: false,
  scope: 'A small last-token embedding predictor, not a transformer. The tea probe is an unscored architecture check: it has the same last token as cat a and therefore the same distribution. No semantic-similarity quality claim, full-prefix context processing, generation, or Qwen adaptation.',
};
const output = process.argv[2] ?? 'perf/results/first-token-embeddings.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ architecture: report.architecture, training: report.training, before_loss: update.before.mean_loss,
  after_loss: update.after.mean_loss, learned_embedding_rows: { a: learnedEmbeddings[aId], s: learnedEmbeddings[sId] },
  predictions, checks, passed: report.passed, evidence: output }, null, 2));
if (!report.passed) process.exitCode = 1;
