// Attention over the whole prefix: weights, context vectors, order blindness, and position vectors.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';
import { attentionContext, addPositionVectors, headScores } from './attention-context.mjs';
import { embeddingPrediction } from './last-token-embeddings.mjs';
import { scoreDistribution } from './next-token-scores.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const vocabularyBefore = JSON.stringify(tokenizer.tokens);

// Declared, not learned: one distinct unit-circle direction per token ID.
// The previous lab learned only 2 of 8 rows; its six zero rows would make
// most attention keys identical and the mechanism demos degenerate.
const declaredEmbeddings = tokenizer.tokens.map((token, id) => [
  Math.cos(2 * Math.PI * id / tokenizer.tokens.length),
  Math.sin(2 * Math.PI * id / tokenizer.tokens.length),
]);
const positionVector = position => [Math.sin(position), Math.cos(position)];
// Same frozen author-chosen head as the embedding lab, for comparability.
const head = [[-1, 0], [0, -1], [0.5, 0.5], [1, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0, 1]];
const headBefore = JSON.stringify(head);

const trace = (prefix, { positions = false } = {}) => {
  const ids = tokenizer.encode(prefix);
  let vectors = ids.map(id => [...declaredEmbeddings[id]]);
  if (positions) vectors = addPositionVectors(vectors, positionVector);
  const attention = attentionContext(vectors);
  const scores = headScores(attention.context, head);
  return {
    prefix, token_ids: ids, positions_used: positions,
    per_position: ids.map((id, position) => ({
      position, token: tokenizer.tokens[id], score: attention.scores[position], weight: attention.weights[position],
    })),
    context: attention.context, scores, probabilities: scoreDistribution(scores),
  };
};

const catSa = trace('cat sa');
const catA = trace('cat a');
const tea = trace('tea');
const catNoPos = trace('cat ');
const tacNoPos = trace('tac ');
const catPos = trace('cat ', { positions: true });
const tacPos = trace('tac ', { positions: true });

// Last-token predictor on the same declared table: 'cat a' and 'tea' both end in 'a',
// so this single lookup is the prediction both prefixes receive.
const aId = tokenizer.encode('a')[0];
const lastTokenPrediction = { applies_to_prefixes: ['cat a', 'tea'], shared_last_token_id: aId,
  ...embeddingPrediction(declaredEmbeddings, head, aId) };

const satIds = tokenizer.encode('cat sat');
const satVectors = addPositionVectors(satIds.map(id => [...declaredEmbeddings[id]]), positionVector);
const sameTokenDifferentPositions = { token: 't', positions: [2, 6],
  vector_at_2: satVectors[2], vector_at_6: satVectors[6] };

const near = (a, b) => Math.abs(a - b) < 1e-12;
const vecEqual = (u, v) => u.every((value, i) => near(value, v[i]));
const vecDiffers = (u, v) => u.some((value, i) => Math.abs(value - v[i]) > 1e-9);
const probsDiffer = (p, q) => p.some((value, i) => Math.abs(value - q[i]) > 1e-9);
const allTraces = [catSa, catA, tea, catNoPos, tacNoPos, catPos, tacPos];

const checks = {
  seven_prefixes_encoded_inside_vocabulary: allTraces.every(t => t.token_ids.length === t.prefix.length),
  weights_are_normalized_distributions: allTraces.every(t =>
    t.per_position.every(p => p.weight > 0 && Number.isFinite(p.weight))
    && near(t.per_position.reduce((sum, p) => sum + p.weight, 0), 1)),
  order_demo_multisets_differ_only_by_order:
    JSON.stringify([...catNoPos.token_ids].sort((a, b) => a - b)) === JSON.stringify([...tacNoPos.token_ids].sort((a, b) => a - b)),
  attention_is_order_blind_without_position_information:
    vecEqual(catNoPos.context, tacNoPos.context) && !probsDiffer(catNoPos.probabilities, tacNoPos.probabilities),
  position_vectors_make_order_visible:
    vecDiffers(catPos.context, tacPos.context) && probsDiffer(catPos.probabilities, tacPos.probabilities),
  same_token_at_different_positions_gets_different_vectors:
    vecDiffers(sameTokenDifferentPositions.vector_at_2, sameTokenDifferentPositions.vector_at_6),
  attention_prefers_the_positions_holding_the_query_token: (() => {
    const weights = catSa.per_position.map(p => p.weight);
    return weights[1] === weights[5] && weights.every((w, i) => i === 1 || i === 5 || w < weights[1]);
  })(),
  last_token_predictor_reproduces_the_recorded_limitation:
    lastTokenPrediction.shared_last_token_id === tokenizer.encode('tea').at(-1)
    && lastTokenPrediction.shared_last_token_id === tokenizer.encode('cat a').at(-1),
  attention_separates_prefixes_that_share_their_last_token:
    vecDiffers(catA.context, tea.context) && probsDiffer(catA.probabilities, tea.probabilities),
  attention_weights_vary_across_positions:
    Math.max(...catSa.per_position.map(p => p.weight)) > Math.min(...catSa.per_position.map(p => p.weight)),
  declared_embedding_rows_are_distinct:
    declaredEmbeddings.every((row, i) => declaredEmbeddings.every((other, j) => i === j || vecDiffers(row, other))),
  vocabulary_and_head_unchanged:
    JSON.stringify(tokenizer.tokens) === vocabularyBefore && JSON.stringify(head) === headBefore,
};

const sourcePaths = ['tools/character-tokenizer.mjs', 'tools/next-token-scores.mjs', 'tools/last-token-embeddings.mjs',
  'tools/attention-context.mjs', 'tools/inspect-attention-context.mjs', fixturePath];
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'Attention-weighted whole-prefix context for next-token prediction; mechanism demonstration with declared vectors, no training',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  fixture_version: fixture.version, vocabulary: tokenizer.tokens.map((token, id) => ({ id, token })),
  architecture: {
    input: 'Whole prefix; the last position queries all positions including itself',
    projections: 'Identity: position vectors are used directly as queries, keys, and values',
    token_vectors: 'Declared unit-circle directions, one per token ID; author-chosen, not learned',
    position_vectors: 'Declared [sin(p), cos(p)] per position, added on demand in the order demos',
    output_head: { weights: head, origin: 'Same frozen author-chosen head as the embedding lab', trained: false },
    attention_implemented: true, single_head: true, trained_parameters: 0,
  },
  demonstrations: {
    cat_sa_weights: catSa,
    prefix_pair_sharing_last_token: { cat_a: catA, tea, last_token_predictor: lastTokenPrediction },
    order_blindness: { cat_no_positions: catNoPos, tac_no_positions: tacNoPos },
    order_with_positions: { cat_positions: catPos, tac_positions: tacPos },
    same_token_different_positions: sameTokenDifferentPositions,
  },
  checks, passed: Object.values(checks).every(Boolean),
  scope: 'A mechanism demonstration of attention-style context, not a transformer. Declared token and position vectors, identity projections, single head, no training, no multi-layer, no causal mask beyond prefix length, no held-out quality measurement, no text generation, no Qwen adaptation.',
};
const output = process.argv[2] ?? 'perf/results/first-attention-context.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({
  cat_sa_weights: catSa.per_position,
  cat_a_context: catA.context, tea_context: tea.context,
  cat_a_probabilities: catA.probabilities, tea_probabilities: tea.probabilities,
  order_blind_contexts_identical: checks.attention_is_order_blind_without_position_information,
  order_visible_with_positions: checks.position_vectors_make_order_visible,
  checks, passed: report.passed, evidence: output,
}, null, 2));
if (!report.passed) process.exitCode = 1;
