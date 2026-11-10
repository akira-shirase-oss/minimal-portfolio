// Show duplicate leakage using one unchanged exact-message lookup baseline.
// The example is a split lesson, not a neural-network or language-model benchmark.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/support-split-demo-v1.json';
const auditPath = 'perf/results/first-training-data-audit.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const audit = JSON.parse(readFileSync(new URL(auditPath, root), 'utf8'));
const key = text => text.trim().replace(/\s+/gu, ' ').toLowerCase();
const unique = [];
const duplicates = [];
const firstByKey = new Map();
for (const record of fixture.records) {
  const normalized = key(record.text);
  if (firstByKey.has(normalized)) {
    duplicates.push({ ...record, duplicate_of: firstByKey.get(normalized).id });
  } else {
    firstByKey.set(normalized, record);
    unique.push(record);
  }
}
const split = Object.fromEntries(['training', 'validation', 'test'].map(name =>
  [name, unique.filter(record => fixture.group_assignment[record.group] === name)]));
const overlap = (left, right, select) => [...new Set(left.map(select))].filter(value => right.some(record => select(record) === value));
function isolation(left, right) {
  const recordIds = overlap(left, right, row => row.id);
  const normalizedInputs = overlap(left, right, row => key(row.text));
  const groups = overlap(left, right, row => row.group);
  return { record_id_overlap: recordIds, normalized_input_overlap: normalizedInputs,
    group_overlap: groups, passed: recordIds.length === 0 && normalizedInputs.length === 0 && groups.length === 0 };
}
const safeIsolation = {
  training_validation: isolation(split.training, split.validation),
  training_test: isolation(split.training, split.test),
  validation_test: isolation(split.validation, split.test),
};
// Deliberately bad validation view: discarded copies of the training messages.
const leakyValidation = duplicates.filter(record => fixture.group_assignment[record.group] === 'training');
const leakyIsolation = isolation(split.training, leakyValidation);

// Fit exactly once, using training text/labels only. No group or ID enters prediction.
const memory = new Map(split.training.map(record => [key(record.text), record.label]));
const fingerprint = () => createHash('sha256').update(JSON.stringify([...memory])).digest('hex');
const fittedFingerprint = fingerprint();
function evaluate(records) {
  const cases = records.map(record => {
    const prediction = memory.get(key(record.text)) ?? null;
    return { ...record, predicted_label: prediction, answered: prediction !== null, correct: prediction === record.label };
  });
  const correct = cases.filter(record => record.correct).length;
  const answered = cases.filter(record => record.answered).length;
  return { cases, total: cases.length, correct, abstained: cases.length - answered,
    fraction_correct_including_abstentions: correct / cases.length, answer_coverage: answered / cases.length };
}
const scores = { leaky_validation: evaluate(leakyValidation), clean_validation: evaluate(split.validation) };
// Inspect this predefined test partition once after the baseline and both views are frozen.
const testResult = evaluate(split.test);
const sameOriginal = (current, original) => ['id', 'text', 'label'].every(field => current[field] === original[field]);
const allSafeIds = [...Object.values(split).flat(), ...duplicates].map(record => record.id);
const labelsCovered = rows => fixture.allowed_labels.every(label => rows.some(record => record.label === label));
const checks = {
  all_records_have_valid_text_label_and_group: fixture.records.every(record => record.text.trim()
    && fixture.allowed_labels.includes(record.label) && ['training', 'validation', 'test'].includes(fixture.group_assignment[record.group])),
  duplicate_families_have_consistent_group_and_label: duplicates.every(record => {
    const original = firstByKey.get(key(record.text));
    return record.group === original.group && record.label === original.label;
  }),
  safe_plan_accounts_for_all_input_ids_once: allSafeIds.length === fixture.records.length
    && new Set(allSafeIds).size === fixture.records.length && fixture.records.every(record => allSafeIds.includes(record.id)),
  original_retained_examples_preserved: audit.retained.every(record => fixture.records.some(current => sameOriginal(current, record))),
  original_invoice_duplicate_preserved: sameOriginal(fixture.records.find(record => record.id === 's04'), audit.duplicates.find(record => record.id === 's04')),
  safe_split_isolation_passes: Object.values(safeIsolation).every(value => value.passed),
  every_safe_split_contains_all_categories: Object.values(split).every(labelsCovered),
  leaky_view_has_distinct_ids_but_is_detected: leakyIsolation.record_id_overlap.length === 0
    && leakyIsolation.normalized_input_overlap.length > 0 && !leakyIsolation.passed,
  one_lookup_entry_per_training_message: memory.size === split.training.length,
  lookup_model_unchanged_during_all_evaluation: fingerprint() === fittedFingerprint,
};
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const output = process.argv[2] ?? 'perf/results/first-data-split-comparison.json';
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'Fixed synthetic split-isolation lesson with an exact-message lookup baseline; not a neural-network, language-model or capacity benchmark',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(['tools/compare-data-splits.mjs', fixturePath, auditPath].map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length,
    memory_bytes: os.totalmem(), runtime: process.version },
  dataset: fixture,
  policy: 'Keep one row per case/whitespace-normalized message, then assign whole declared copy families to a split. Retain removed copies as evidence. This is not semantic paraphrase detection.',
  safe_split: split,
  excluded_duplicates: duplicates,
  safe_split_isolation: safeIsolation,
  deliberately_leaky_validation: { records: leakyValidation, isolation: leakyIsolation, accepted: false },
  lookup_baseline: { fitted_once: true, training_entries: [...memory], fitted_sha256: fittedFingerprint,
    behavior: 'Return saved training label for exact normalized text; abstain on unseen text. No semantic inference.' },
  validation_scores: scores,
  test_result: testResult,
  scoring: 'Correct answers divided by all cases, counting abstentions as not correct. Report abstentions explicitly. Same training lookup used for both validation views and one test evaluation.',
  test_evaluation_calls: 1,
  candidate_versions_selected_using_test: false,
  checks,
  program_checks_passed: Object.values(checks).every(Boolean),
  quality_verdict: 'Safe partitions pass declared overlap checks; deliberately leaky validation fails them. Tiny constructed examples were designed and inspected by the author, so the demonstration test partition is not an independent real-world benchmark. No model promotion or deployment decision.',
  original_audit_or_review_records_changed: false,
  neural_network_or_language_model_trained: false,
  model_promoted: false,
};
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ unique_messages: unique.length, excluded_duplicates: duplicates.length,
  safe_split_counts: Object.fromEntries(Object.entries(split).map(([name, rows]) => [name, rows.length])),
  safe_isolation_passed: Object.values(safeIsolation).every(value => value.passed),
  leaky_validation_id_overlap: leakyIsolation.record_id_overlap.length,
  leaky_validation_message_overlap: leakyIsolation.normalized_input_overlap.length,
  leaky_validation_accepted: false,
  scores: Object.fromEntries([...Object.entries(scores), ['clean_test', testResult]].map(([name, score]) =>
    [name, { correct: score.correct, total: score.total, abstained: score.abstained }])),
  program_checks_passed: report.program_checks_passed, evidence: output }, null, 2));
if (!report.program_checks_passed) process.exitCode = 1;
