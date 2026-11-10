// Text -> token IDs -> text, then next-token targets. No model training occurs.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { makeCharacterTokenizer } from './character-tokenizer.mjs';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/tiny-text-tokens-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const training = fixture.documents.filter(document => document.partition === 'training');
const validation = fixture.documents.filter(document => document.partition === 'validation');
const tokenizer = makeCharacterTokenizer(training.map(document => document.text));
const vocabulary = tokenizer.tokens.map((token, id) => ({ id, token }));
const fingerprint = () => createHash('sha256').update(JSON.stringify(vocabulary)).digest('hex');
const vocabularyBefore = fingerprint();

function sequence(text) {
  const tokenIds = tokenizer.encode(text);
  return {
    text, token_ids: tokenIds, decoded: tokenizer.decode(tokenIds),
    input_ids: tokenIds.slice(0, -1), next_token_target_ids: tokenIds.slice(1),
    examples: tokenIds.slice(1).map((next, position) => ({
      position, visible_prefix: tokenizer.decode(tokenIds.slice(0, position + 1)),
      prefix_ids: tokenIds.slice(0, position + 1), next_token_id: next, next_token: tokenizer.tokens[next],
    })),
  };
}
const trainingSequences = training.map(document => ({ document_id: document.id, ...sequence(document.text) }));
const validationEncodings = validation.map(document => {
  const tokenIds = tokenizer.encode(document.text);
  return { ...document, token_ids: tokenIds, decoded: tokenizer.decode(tokenIds), used_for_vocabulary_fit: false };
});
const demonstration = sequence(fixture.demonstration_text);
let unknownProbe;
try {
  unknownProbe = { input: fixture.unknown_character_probe, unexpectedly_encoded_ids: tokenizer.encode(fixture.unknown_character_probe) };
} catch (error) {
  unknownProbe = { input: fixture.unknown_character_probe, rejected: true,
    error_type: error.name, code: error.code, character: error.character, code_point_index: error.position, message: error.message };
}
let invalidIdRejected = false;
try { tokenizer.decode([tokenizer.tokens.length]); } catch (error) { invalidIdRejected = error instanceof RangeError; }
const trainingTokenCount = trainingSequences.reduce((count, document) => count + document.token_ids.length, 0);
const predictionPositions = trainingSequences.reduce((count, document) => count + document.next_token_target_ids.length, 0);
const checks = {
  vocabulary_contains_exact_training_alphabet: tokenizer.tokens.length === new Set(training.flatMap(document => Array.from(document.text))).size
    && tokenizer.tokens.every(token => training.some(document => Array.from(document.text).includes(token))),
  all_training_text_round_trips: trainingSequences.every(document => document.decoded === document.text),
  validation_text_round_trips_without_vocab_change: validationEncodings.every(document => document.decoded === document.text) && fingerprint() === vocabularyBefore,
  demonstration_round_trips: demonstration.decoded === fixture.demonstration_text,
  zero_id_preserves_newline: tokenizer.decode([0]) === '\n' && tokenizer.encode('\n')[0] === 0,
  inputs_and_targets_have_one_position_shift: trainingSequences.every(document => document.input_ids.length === document.next_token_target_ids.length
    && document.input_ids.every((id, position) => id === document.token_ids[position])
    && document.next_token_target_ids.every((id, position) => id === document.token_ids[position + 1])),
  prefixes_end_before_target_position: trainingSequences.every(document => document.examples.every((example, position) =>
    example.prefix_ids.length === position + 1 && example.visible_prefix === Array.from(document.text).slice(0, position + 1).join('')
    && example.next_token === Array.from(document.text)[position + 1])),
  no_targets_cross_document_boundaries: predictionPositions === trainingTokenCount - trainingSequences.length
    && trainingSequences.every(document => document.examples.length === Array.from(document.text).length - 1),
  unknown_character_rejected_without_vocabulary_growth: unknownProbe.rejected === true && unknownProbe.code === 'UNKNOWN_CHARACTER'
    && unknownProbe.character === '?' && unknownProbe.code_point_index === 3 && fingerprint() === vocabularyBefore,
  invalid_token_id_rejected: invalidIdRejected,
};
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'One character-tokenization and next-token-target preparation run; no predictive model trained or evaluated',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(['tools/character-tokenizer.mjs', 'tools/inspect-text-tokens.mjs', fixturePath].map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length,
    memory_bytes: os.totalmem(), runtime: process.version },
  dataset: fixture,
  vocabulary_fitted_from_document_ids: training.map(document => document.id),
  vocabulary, vocabulary_sha256: vocabularyBefore,
  training_token_count: trainingTokenCount, training_prediction_positions: predictionPositions,
  training_sequences: trainingSequences, validation_encodings: validationEncodings,
  demonstration, unknown_character_probe: unknownProbe,
  checks, program_checks_passed: Object.values(checks).every(Boolean),
  special_tokens: [],
  meaning_of_ids: 'Arbitrary fixed vocabulary indexes; not meanings, predictions, weights, or learned embeddings.',
  scope: 'Toy ASCII text illustrated with one Unicode code point per token. Round-trip decoding reconstructs supplied text; it does not generate new text. Validation encoding checks compatibility only, not model quality.',
  predictive_model_trained: false, model_quality_measured: false, test_set_evaluated: false,
};
const output = process.argv[2] ?? 'perf/results/first-text-tokenization.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ vocabulary, demonstration, training_token_count: trainingTokenCount,
  training_prediction_positions: predictionPositions, validation_encodings: validationEncodings,
  unknown_character_probe: unknownProbe, program_checks_passed: report.program_checks_passed, evidence: output }, null, 2));
if (!report.program_checks_passed) process.exitCode = 1;
