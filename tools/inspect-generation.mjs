// Generation over the exact-prefix count model: greedy, fixed-draw sampling, and unseen-seed abstention.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';
import { fitPrefixCounts, greedyToken, tokenFromDraw } from './prefix-count-model.mjs';
import { generateText } from './generate-text.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const vocabularyBefore = JSON.stringify(tokenizer.tokens);
const model = fitPrefixCounts(training.map(document => tokenizer.encode(document.text)), tokenizer.tokens.length);
const tableBefore = JSON.stringify(model.snapshot());
const newlineId = tokenizer.encode('\n')[0];
const run = (seed, select, maxSteps = 32) =>
  generateText(model, tokenizer.encode, tokenizer.decode, seed, { select, maxSteps, stopTokenId: newlineId });

const greedyFromCat = run('cat ', greedyToken);
const greedyFromC = run('c', greedyToken);
// Fixed supplied draws make the sampling path inspectable; the first draw picks 's' over 'a'.
const sampledDraws = [0.75, 0.3, 0.6, 0.2, 0.9, 0.4, 0.1, 0.5];
const sampledFromCat = run('cat ', (probabilities, steps) => tokenFromDraw(probabilities, sampledDraws[steps.length] ?? 0));
const unseenSeed = run('te', greedyToken);
const trainingTexts = training.map(document => document.text);

const checks = {
  greedy_from_cat_writes_a_training_document_verbatim:
    greedyFromCat.generated_text === 'cat ate.\n' && trainingTexts.includes(greedyFromCat.generated_text),
  greedy_from_single_character_completes_a_document:
    greedyFromC.generated_text === 'cat ate.\n' && greedyFromC.steps.length === 8,
  fixed_draw_sampling_writes_the_other_training_document:
    sampledFromCat.generated_text === 'cat sat.\n' && trainingTexts.includes(sampledFromCat.generated_text),
  unseen_seed_halts_with_explicit_reason_and_zero_tokens:
    unseenSeed.halt_reason === 'UNSEEN_PREFIX' && unseenSeed.steps.length === 0 && unseenSeed.generated_text === 'te',
  both_runs_stop_on_the_newline_token:
    greedyFromCat.halt_reason === 'STOP_TOKEN' && sampledFromCat.halt_reason === 'STOP_TOKEN',
  prefix_grows_by_exactly_one_token_per_step:
    greedyFromCat.steps.every((step, i) => step.step === i)
    && greedyFromCat.generated_ids.length === tokenizer.encode('cat ').length + greedyFromCat.steps.length,
  every_step_records_distribution_and_selection:
    greedyFromCat.steps.every(step => Array.isArray(step.probabilities) && step.probabilities.length === tokenizer.tokens.length && Number.isInteger(step.selected_id)),
  generated_texts_are_confined_to_training_documents:
    [greedyFromCat, greedyFromC, sampledFromCat].every(r => trainingTexts.includes(r.generated_text)),
  selection_rule_changes_output_without_changing_the_model:
    greedyFromCat.generated_text !== sampledFromCat.generated_text && JSON.stringify(model.snapshot()) === tableBefore,
  generated_token_becomes_part_of_the_next_prefix: (() => {
    const first = sampledFromCat.steps[0];
    const second = sampledFromCat.steps[1];
    return first.selected_token === 's' && second.prefix === 'cat s';
  })(),
  model_table_and_vocabulary_unchanged:
    JSON.stringify(model.snapshot()) === tableBefore && JSON.stringify(tokenizer.tokens) === vocabularyBefore,
};

const sourcePaths = ['tools/character-tokenizer.mjs', 'tools/prefix-count-model.mjs', 'tools/generate-text.mjs',
  'tools/inspect-generation.mjs', fixturePath];
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'First text-generation loop over the fitted exact-prefix count model',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length, memory_bytes: os.totalmem(), runtime: process.version },
  fixture_version: fixture.version, vocabulary: tokenizer.tokens.map((token, id) => ({ id, token })),
  model: { kind: 'Exact-prefix count model', distinct_prefixes: model.distinct_prefixes, training_observations: model.training_observations },
  loop: { predict_then_select_then_append: true, stop_rule: 'newline token or 32-step limit', sampling_draws: 'Fixed supplied draws, not randomness' },
  runs: { greedy_from_cat: greedyFromCat, greedy_from_c: greedyFromC, sampled_from_cat: sampledFromCat, unseen_seed: unseenSeed },
  checks, passed: Object.values(checks).every(Boolean),
  scope: 'A generation loop over a memorized count table. Output is confined to verbatim training text; unseen prefixes halt with UNSEEN_PREFIX. No neural weights, no generalization, no held-out quality claim, no Qwen adaptation.',
};
const output = process.argv[2] ?? 'perf/results/first-text-generation.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({
  greedy_from_cat: { text: greedyFromCat.generated_text, steps: greedyFromCat.steps.length, halt: greedyFromCat.halt_reason },
  greedy_from_c: { text: greedyFromC.generated_text, steps: greedyFromC.steps.length },
  sampled_from_cat: { text: sampledFromCat.generated_text, halt: sampledFromCat.halt_reason },
  unseen_seed: { text: unseenSeed.generated_text, halt: unseenSeed.halt_reason },
  checks, passed: report.passed, evidence: output,
}, null, 2));
if (!report.passed) process.exitCode = 1;
