// Inspect a small labeled dataset. This script does not train or call a model.
// Optional first argument chooses a fresh result path; existing records are preserved.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const root = new URL('../', import.meta.url);
const fixturePath = 'perf/fixtures/support-intent-v1.json';
const fixture = JSON.parse(readFileSync(new URL(fixturePath, root), 'utf8'));
const comparisonKey = text => text.trim().replace(/\s+/gu, ' ').toLowerCase();
const groups = new Map();
const review = [];
const clean = [];
const duplicates = [];

for (const record of fixture.records) {
  if (typeof record.text !== 'string' || !record.text.trim()) {
    review.push({ ...record, reason: 'missing_text' });
  } else if (typeof record.label !== 'string' || !record.label.trim()) {
    review.push({ ...record, reason: 'missing_label' });
  } else if (!fixture.allowed_labels.includes(record.label)) {
    review.push({ ...record, reason: 'unsupported_label' });
  } else {
    const key = comparisonKey(record.text);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
}

for (const [key, records] of groups) {
  const labels = [...new Set(records.map(record => record.label))];
  if (labels.length > 1) {
    // Hold every conflicting version for review; do not guess the correct label.
    for (const record of records) review.push({ ...record, reason: 'conflicting_labels', comparison_key: key, competing_labels: labels });
  } else {
    const [first, ...repeated] = records;
    clean.push({ ...first });
    for (const record of repeated) duplicates.push({ ...record, duplicate_of: first.id, comparison_key: key });
  }
}

const inputIds = fixture.records.map(record => record.id);
const outputIds = [...clean, ...duplicates, ...review].map(record => record.id);
const inputIdSet = new Set(inputIds);
const keys = clean.map(record => comparisonKey(record.text));
const checks = {
  unique_input_ids: inputIdSet.size === inputIds.length,
  every_input_record_accounted_for: outputIds.length === inputIds.length && outputIds.every(id => inputIdSet.has(id)),
  no_record_in_two_output_groups: new Set(outputIds).size === outputIds.length,
  clean_rows_have_text_and_allowed_label: clean.every(record => record.text.trim() && fixture.allowed_labels.includes(record.label)),
  no_normalized_duplicate_inputs_in_clean_rows: new Set(keys).size === keys.length,
  duplicates_reference_matching_clean_record: duplicates.every(record => clean.some(kept => kept.id === record.duplicate_of
    && comparisonKey(kept.text) === comparisonKey(record.text) && kept.label === record.label)),
  conflicting_inputs_not_silently_kept: review.filter(record => record.reason === 'conflicting_labels')
    .every(record => !keys.includes(record.comparison_key)),
  original_kept_text_and_label_preserved: clean.every(record => JSON.stringify(record) === JSON.stringify(fixture.records.find(original => original.id === record.id))),
};
const labelCounts = Object.fromEntries(fixture.allowed_labels.map(label => [label, clean.filter(record => record.label === label).length]));
const reasonCounts = Object.fromEntries([...new Set(review.map(record => record.reason))].map(reason => [reason, review.filter(record => record.reason === reason).length]));
const hash = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const report = {
  recorded_utc: new Date().toISOString(),
  kind: 'One synthetic labeled-data audit, not model training, evaluation or a performance benchmark',
  code_base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: Object.fromEntries(['tools/audit-training-data.mjs', fixturePath].map(path => [path, hash(path)])),
  machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logical_cpus: os.cpus().length,
    memory_bytes: os.totalmem(), runtime: process.version },
  dataset: fixture,
  policy: {
    comparison_key: 'Trim outer whitespace, collapse whitespace, and lowercase solely for grouping this toy task. Preserve original retained text.',
    identical_input_and_label: 'Keep first occurrence; account for later occurrences separately as duplicates.',
    identical_input_with_different_labels: 'Hold every version for review. Do not infer a replacement label from the message.',
    missing_or_unsupported_fields: 'Hold for review; no invented input or label.',
    scope: 'Case-insensitive comparison is a chosen teaching policy, not a universal rule. This is not semantic duplicate detection or human label verification.',
  },
  summary: { input_records: fixture.records.length, retained_records: clean.length,
    duplicate_records: duplicates.length, review_records: review.length, review_reason_counts: reasonCounts, retained_label_counts: labelCounts },
  retained: clean,
  duplicates,
  review,
  checks,
  program_checks_passed: Object.values(checks).every(Boolean),
  interpretation: 'Audit-consistent subset under the declared rules, not a representative or fully validated training dataset. Five retained messages are insufficient evidence of useful model performance.',
  train_validation_test_split_created: false,
  model_called_or_trained: false,
  model_quality_measured: false,
};
const output = process.argv[2] ?? 'perf/results/first-training-data-audit.json';
writeFileSync(new URL(output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ summary: report.summary, retained_ids: clean.map(record => record.id),
  duplicates: duplicates.map(record => ({ id: record.id, duplicate_of: record.duplicate_of })),
  review: review.map(record => ({ id: record.id, reason: record.reason })),
  program_checks_passed: report.program_checks_passed, evidence: output }, null, 2));
if (!report.program_checks_passed) process.exitCode = 1;
