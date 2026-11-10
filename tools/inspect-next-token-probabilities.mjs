// Fit counts, inspect next-token distributions, and compare selection and single-target loss.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';
import { fitPrefixCounts, greedyToken, tokenFromDraw } from './prefix-count-model.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const model = fitPrefixCounts(training.map(document => tokenizer.encode(document.text)), tokenizer.tokens.length);
const before = JSON.stringify(model.snapshot());
const trace = prefix => ({ prefix, prefix_ids: tokenizer.encode(prefix), ...model.predict(tokenizer.encode(prefix)) });
const predictions = ['cat ', 'cat s', 'cat a', 'tea'].map(trace);
const ambiguous = predictions[0];
const toToken = id => ({ token_id: id, token: tokenizer.tokens[id] });
const selections = {
  prefix: 'cat ',
  greedy: { ...toToken(greedyToken(ambiguous.probabilities)), tie_policy: 'Lowest vocabulary ID among equal maxima.' },
  fixed_draw_examples: [0.25, 0.75].map(draw => ({ draw, ...toToken(tokenFromDraw(ambiguous.probabilities, draw)) })),
  scope: 'Two fixed draws illustrate probability intervals; this is not a random-sampling benchmark or a measured frequency.',
};

// These distributions are hand-specified hypotheses, not outputs of the fitted count model.
const targetId = tokenizer.encode('a')[0];
const sId = tokenizer.encode('s')[0];
const compare = probabilityOfA => {
  const probabilities = tokenizer.tokens.map(() => 0);
  probabilities[targetId] = probabilityOfA;
  probabilities[sId] = 1 - probabilityOfA;
  const selected = greedyToken(probabilities);
  return { probabilities, target_probability: probabilityOfA, greedy: toToken(selected),
    top_one_correct: selected === targetId, single_target_negative_log_likelihood: -Math.log(probabilityOfA) };
};
const lossComparison = { kind: 'Illustrative hand-specified probability comparison, not trained-model scores',
  observed_target: 'a', candidates: [compare(0.4), compare(0.01)],
  explanation: 'Both top guesses are s. More probability on the observed target a produces a lower negative-log-likelihood loss. Natural logarithm; lower is better for this target.' };

let invalidDrawRejected = false;
try { tokenFromDraw(ambiguous.probabilities, 1); } catch (error) { invalidDrawRejected = error instanceof RangeError; }
const observed = model.snapshot().map(entry => model.predict(entry.prefix_ids));
const checks = {
  exact_training_counts_and_document_boundaries: model.training_observations === 16 && model.distinct_prefixes === 12,
  shared_prefix_has_two_observed_continuations: ambiguous.observations === 2 && ambiguous.counts[targetId] === 1 && ambiguous.counts[sId] === 1,
  shared_prefix_distribution_is_half_each: ambiguous.probabilities.every((p, id) => p === (id === targetId || id === sId ? 0.5 : 0)),
  longer_context_changes_predictions: predictions[1].probabilities[targetId] === 1 && predictions[2].probabilities[tokenizer.encode('t')[0]] === 1,
  all_known_distributions_are_normalized: observed.every(result => result.probabilities.every(p => Number.isFinite(p) && p >= 0) && Math.abs(result.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12),
  known_characters_can_still_form_an_unseen_prefix: tokenizer.decode(predictions[3].prefix_ids) === 'tea' && predictions[3].reason === 'UNSEEN_PREFIX' && predictions[3].probabilities === null,
  inference_does_not_refit_counts: JSON.stringify(model.snapshot()) === before,
  greedy_tie_policy_is_explicit: selections.greedy.token === 'a',
  fixed_draws_can_select_either_supported_token: selections.fixed_draw_examples[0].token === 'a' && selections.fixed_draw_examples[1].token === 's',
  both_hypothetical_top_guesses_are_wrong: lossComparison.candidates.every(candidate => candidate.greedy.token === 's' && !candidate.top_one_correct),
  more_target_probability_has_lower_loss: lossComparison.candidates[0].single_target_negative_log_likelihood < lossComparison.candidates[1].single_target_negative_log_likelihood,
  out_of_range_draw_is_rejected: invalidDrawRejected,
};
const sourcePaths = ['tools/character-tokenizer.mjs', 'tools/prefix-count-model.mjs', 'tools/inspect-next-token-probabilities.mjs', fixturePath];
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'Exact-prefix count-model fit and inference on a teaching fixture; no neural-network training',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  fixture_version: fixture.version, fitted_document_ids: training.map(document => document.id),
  vocabulary: tokenizer.tokens.map((token, id) => ({ id, token })),
  training_observations: model.training_observations, distinct_prefixes: model.distinct_prefixes,
  fitted_prefix_table: model.snapshot(), predictions, selections, illustrative_loss_comparison: lossComparison,
  checks, passed: Object.values(checks).every(Boolean),
  count_based_model_fitted: true, inference_performed: true, neural_network_trained: false,
  trainable_weights_updated: false, held_out_quality_measured: false, test_set_evaluated: false,
  full_text_generation_loop_implemented: false,
  limitations: 'Exact-prefix counts with no smoothing or fallback. Unobserved continuations of known prefixes receive zero probability; unseen prefixes cause abstention. These frequencies do not establish language understanding, calibrated real-world probabilities, or held-out quality. Fixed draws select one next token without a full generation loop.',
};
const output = process.argv[2] ?? 'perf/results/first-next-token-probabilities.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ predictions, selections, illustrative_loss_comparison: lossComparison, checks, passed: report.passed, evidence: output }, null, 2));
if (!report.passed) process.exitCode = 1;
