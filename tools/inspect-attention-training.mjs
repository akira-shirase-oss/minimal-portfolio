// Train attention embeddings on three same-last-token prefixes; compare three arms.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';
import { attentionForward, updateAttention, updateAttentionAndHead } from './trainable-attention.mjs';
import { updateEmbeddings, embeddingPrediction } from './last-token-embeddings.mjs';
import { scoreBatch } from './next-token-scores.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const vocabularyBefore = JSON.stringify(tokenizer.tokens);
const positionVector = position => [Math.sin(position), Math.cos(position)];
const positionProbe = JSON.stringify([0, 1, 2].map(positionVector));
// Same frozen author-chosen head and same declared initial vectors as the attention demo.
const initialHead = [[-1, 0], [0, -1], [0.5, 0.5], [1, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0, 1]];
const headBefore = JSON.stringify(initialHead);
const initialEmbeddings = tokenizer.tokens.map((token, id) => [
  Math.cos(2 * Math.PI * id / tokenizer.tokens.length),
  Math.sin(2 * Math.PI * id / tokenizer.tokens.length),
]);

// Three prefixes that share their last token; earlier positions carry the answer.
const prefixes = ['cat', 'cat sat', 'cat at'];
const examples = prefixes.map(prefix => ({ prefix, ids: tokenizer.encode(prefix) }));
for (const example of examples) {
  const doc = training.find(d => d.text.startsWith(example.prefix));
  example.target_token = doc.text[example.prefix.length];
  example.target_id = tokenizer.encode(example.target_token)[0];
  example.document_id = doc.id;
}
const tId = tokenizer.encode('t')[0];
const argmax = p => p.indexOf(Math.max(...p));
const meanLoss = (predict, targets) => examples.reduce((sum, ex, i) =>
  sum + scoreBatch(predict(ex.ids).scores, [ex.target_id]).mean_loss / examples.length, 0);
const attLoss = (emb, head) => meanLoss(ids => attentionForward(emb, positionVector, head, ids));

// --- Arm A: last-token baseline, input is only `t` ---
const baselineExamples = examples.map(ex => ({ input_token_id: tId, target_id: ex.target_id }));
let baseEmb = initialEmbeddings.map(row => [...row]);
const baselineTrajectory = [baselineExamples.reduce((sum, ex) =>
  sum + scoreBatch(embeddingPrediction(baseEmb, initialHead, ex.input_token_id).scores, [ex.target_id]).mean_loss / baselineExamples.length, 0)];
for (let step = 0; step < 300; step++) {
  const update = updateEmbeddings(baseEmb, initialHead, baselineExamples, 1);
  baseEmb = update.after.embeddings;
  baselineTrajectory.push(update.after.mean_loss);
}
const baselineFinal = examples.map(ex => ({ prefix: ex.prefix, target_id: ex.target_id,
  ...embeddingPrediction(baseEmb, initialHead, tId) }));

// --- Arm B: attention, embeddings train, head frozen ---
let embB = initialEmbeddings.map(row => [...row]);
const armBTrajectory = [attLoss(embB, initialHead)];
for (let step = 0; step < 300; step++) {
  const update = updateAttention(embB, positionVector, initialHead, examples, 1);
  embB = update.after.embeddings;
  armBTrajectory.push(update.after.mean_loss);
}
const armBFinal = examples.map(ex => ({ prefix: ex.prefix, target_id: ex.target_id,
  ...attentionForward(embB, positionVector, initialHead, ex.ids) }));

// --- Arm C: attention, embeddings AND head train together ---
let embC = initialEmbeddings.map(row => [...row]);
let headC = initialHead.map(row => [...row]);
const armCTrajectory = [attLoss(embC, headC)];
const armCMilestones = [];
for (let step = 0; step < 2000; step++) {
  const update = updateAttentionAndHead(embC, positionVector, headC, examples, 0.5);
  embC = update.after.embeddings;
  headC = update.after.head;
  armCTrajectory.push(update.after.mean_loss);
  if ([299, 999].includes(step)) armCMilestones.push({ after_step: step + 1, mean_loss: update.after.mean_loss });
}
const armCFinal = examples.map(ex => ({ prefix: ex.prefix, target_id: ex.target_id,
  ...attentionForward(embC, positionVector, headC, ex.ids) }));

// --- probes under the Arm C (fully trained) model ---
const probe = text => ({ prefix: text, ...attentionForward(embC, positionVector, headC, tokenizer.encode(text)) });
const probeTea = probe('tea'), probeCatA = probe('cat a');

const near = (a, b) => Math.abs(a - b) < 1e-12;
const probsDiffer = (p, q) => p.some((v, i) => Math.abs(v - q[i]) > 1e-9);
const baselinePredictionsIdentical = baselineFinal.every(r =>
  JSON.stringify(r.probabilities) === JSON.stringify(baselineFinal[0].probabilities));
const attentionArgmaxes = armCFinal.map(f => argmax(f.probabilities));
const targets = examples.map(ex => ex.target_id);
const subsample = (arr, every) => arr.filter((_, i) => i % every === 0 || i === arr.length - 1);

const checks = {
  three_training_examples_all_end_in_t:
    prefixes.every(p => tokenizer.encode(p).at(-1) === tId) && examples.length === 3,
  targets_are_the_recorded_continuations:
    examples[0].target_token === ' ' && examples[1].target_token === '.' && examples[2].target_token === 'e',
  last_token_baseline_is_blind_by_construction: baselinePredictionsIdentical,
  baseline_stays_high_after_300_steps: baselineTrajectory[300] > 1.5,
  arm_b_loss_decreases: armBTrajectory[300] < armBTrajectory[0],
  arm_b_separates_same_last_token_prefixes:
    probsDiffer(armBFinal[1].probabilities, armBFinal[2].probabilities)
    && probsDiffer(armBFinal[0].probabilities, armBFinal[1].probabilities),
  arm_b_learns_nonuniform_weights:
    armBFinal.some(f => Math.max(...f.attention.weights) > 1 / f.attention.weights.length + 1e-9),
  arm_b_frozen_head_limits_argmax:
    !armBFinal.every((f, i) => argmax(f.probabilities) === f.target_id),
  arm_c_all_three_predictions_correct:
    attentionArgmaxes.every((a, i) => a === targets[i]),
  arm_c_loss_near_zero: armCTrajectory[2000] < 0.01,
  arm_c_beats_both_other_arms:
    armCTrajectory[2000] < armBTrajectory[300] && armCTrajectory[2000] < baselineTrajectory[300],
  heads_frozen_in_arms_a_and_b_but_trained_in_c:
    JSON.stringify(initialHead) === headBefore
    && headC.some((row, o) => row.some((v, d) => Math.abs(v - initialHead[o][d]) > 1e-9)),
  embeddings_changed_where_trained:
    embB.some((row, id) => row.some((v, d) => Math.abs(v - initialEmbeddings[id][d]) > 1e-9))
    && embC.some((row, id) => row.some((v, d) => Math.abs(v - initialEmbeddings[id][d]) > 1e-9)),
  vocabulary_and_position_vectors_unchanged:
    JSON.stringify(tokenizer.tokens) === vocabularyBefore
    && JSON.stringify([0, 1, 2].map(positionVector)) === positionProbe,
  all_probabilities_normalized:
    [...baselineFinal, ...armBFinal, ...armCFinal].every(f => near(f.probabilities.reduce((a, b) => a + b, 0), 1)),
  tea_probe_still_differs_from_cat_a_after_training:
    probsDiffer(probeTea.probabilities, probeCatA.probabilities),
  trajectories_recorded:
    baselineTrajectory.length === 301 && armBTrajectory.length === 301 && armCTrajectory.length === 2001
    && armCTrajectory.every(Number.isFinite),
};

const sourcePaths = ['tools/character-tokenizer.mjs', 'tools/next-token-scores.mjs', 'tools/last-token-embeddings.mjs',
  'tools/attention-context.mjs', 'tools/trainable-attention.mjs', 'tools/inspect-attention-training.mjs', fixturePath];
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'First trained attention weights: three arms on same-last-token prefixes — blind baseline, trained embeddings with frozen head, trained embeddings+head',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  fixture_version: fixture.version, vocabulary: tokenizer.tokens.map((token, id) => ({ id, token })),
  task: { reason: 'Three prefixes share their last token t, so a last-token predictor cannot separate their targets; earlier positions must be used.',
    examples, batch: 'Full batch of 3 each step',
    trained_parameters: 'Arm B: shared embedding table only (16 numbers, identity Q/K/V, frozen head). Arm C: embeddings + head (32 numbers). Arm A baseline: last-token embedding only.' },
  arms: {
    a_last_token_baseline: { steps: 300, learning_rate: 1, input: 'Last token only (t for all three)',
      initial_loss: baselineTrajectory[0], final_loss: baselineTrajectory[300], trajectory: subsample(baselineTrajectory, 10),
      identical_predictions_for_all_three: baselinePredictionsIdentical,
      final_argmax: baselineFinal.map(f => argmax(f.probabilities)) },
    b_attention_frozen_head: { steps: 300, learning_rate: 1, input: 'Whole prefix via attention; embeddings train, head frozen',
      initial_loss: armBTrajectory[0], final_loss: armBTrajectory[300], trajectory: subsample(armBTrajectory, 10),
      final_argmax: armBFinal.map(f => argmax(f.probabilities)),
      final_attention_weights: armBFinal.map(f => ({ prefix: f.prefix,
        weights: f.attention.weights.map((w, i) => ({ position: i, token: tokenizer.tokens[f.ids[i]], weight: w })) })) },
    c_attention_trained_head: { steps: 2000, learning_rate: 0.5, input: 'Whole prefix via attention; embeddings and head train',
      initial_loss: armCTrajectory[0], milestones: armCMilestones, final_loss: armCTrajectory[2000],
      trajectory: subsample(armCTrajectory, 25), final_argmax: attentionArgmaxes,
      final_attention_weights: armCFinal.map(f => ({ prefix: f.prefix,
        weights: f.attention.weights.map((w, i) => ({ position: i, token: tokenizer.tokens[f.ids[i]], weight: w })) })),
      final_probabilities: armCFinal.map(f => f.probabilities) },
  },
  learned_parameters: { initial_embeddings: initialEmbeddings, arm_b_embeddings: embB,
    arm_c_embeddings: embC, arm_c_head: headC },
  post_training_probes: { cat_a: probeCatA.probabilities, tea: probeTea.probabilities,
    cat_sa_weights_under_arm_c: probe('cat sa').attention.weights },
  checks, passed: Object.values(checks).every(Boolean),
  scope: 'First trained weighting through the attention mechanism. Three same-last-token examples; full-batch gradient descent. Embeddings are trainable; Arm C also trains the head. Declared position vectors; identity Q/K/V; single head; no multi-layer, no causal masking, no held-out quality measurement, no generation. Not a transformer; no Qwen adaptation.',
};
const output = process.argv[2] ?? 'perf/results/first-attention-training.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({
  arms: {
    baseline: { initial: baselineTrajectory[0], final: baselineTrajectory[300], argmax: baselineFinal.map(f => argmax(f.probabilities)) },
    attention_frozen_head: { initial: armBTrajectory[0], final: armBTrajectory[300], argmax: armBFinal.map(f => argmax(f.probabilities)) },
    attention_trained_head: { initial: armCTrajectory[0], milestones: armCMilestones, final: armCTrajectory[2000], argmax: attentionArgmaxes },
  },
  targets,
  arm_b_weights_cat_sat: armBFinal[1].attention.weights.map(w => +w.toFixed(3)),
  arm_c_weights_cat_sat: armCFinal[1].attention.weights.map(w => +w.toFixed(3)),
  checks, passed: report.passed, evidence: output,
}, null, 2));
if (!report.passed) process.exitCode = 1;
