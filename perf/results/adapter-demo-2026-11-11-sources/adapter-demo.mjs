// Chapter 8 lab: adapting an existing model — frozen base vs full fine-tune
// vs a removable adapter, on the SAME failed gate we preserved earlier.
//
// Base model: prediction = input * weight, with weight = 2.992 — the candidate
// that passed input 1→3 but failed input 10→30 (abs error limit 0.05).
//
// We try three ways to fix the failure and compare what each one costs:
//   A) frozen baseline        — change nothing
//   B) full fine-tune         — train the base weight itself on the new case
//   C) adapter                — freeze the base weight, train a small add-on delta
//
//   node labs/adapter-demo.mjs   → runs all three, writes evidence JSON

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const BASE = 2.992;                    // the preserved failed candidate
const LIMIT = 0.05;
const cases = [ { input: 1, target: 3 }, { input: 2, target: 6 }, { input: 10, target: 30 } ];
const new_data = { input: 10, target: 30 };   // the case the base fails
const RATE = 0.005, STEPS = 1;

const predict = (w, input) => input * w;
const err = (w, c) => predict(w, c.input) - c.target;
const gradW = (w, c) => 2 * c.input * err(w, c);          // d(loss)/dw for squared loss

function evaluate(label, w) {
  const rows = cases.map(c => ({ ...c, prediction: predict(w, c.input),
    abs_error: Math.abs(err(w, c)), pass: Math.abs(err(w, c)) <= LIMIT }));
  return { label, effective_weight: w, all_pass: rows.every(r => r.pass), rows };
}

const report = {
  kind: "Adapter-vs-fine-tune teaching comparison on the preserved failed gate; tiny one-parameter example, not an LLM adaptation",
  limit: LIMIT, base_weight: BASE, new_data, rate: RATE, steps: STEPS,
  source_sha256: createHash("sha256").update(readFileSync(new URL(import.meta.url))).digest("hex"),
};

// A) frozen baseline — the failure we preserved
report.baseline = evaluate("frozen baseline", BASE);

// B) full fine-tune: the base weight itself moves
let w = BASE;
for (let i = 0; i < STEPS; i += 1) w = w - RATE * gradW(w, new_data);
report.full_finetune = evaluate("full fine-tune (base weight retrained)", w);
report.full_finetune.base_weight_now = w;
report.full_finetune.base_weight_changed = w !== BASE;
report.full_finetune.way_back = "Only by keeping a saved copy of the old weights.";

// C) adapter: base weight frozen, a new delta parameter learns the fix
let delta = 0;
for (let i = 0; i < STEPS; i += 1) delta = delta - RATE * gradW(BASE + delta, new_data);
report.adapter = evaluate("adapter (base frozen + trained delta)", BASE + delta);
report.adapter.base_weight_still = BASE;
report.adapter.delta = delta;
report.adapter.base_weight_changed = false;
report.adapter.trained_parameters = 1;
report.adapter.frozen_parameters = 1;

// The adapter's special property: remove it and you are exactly back at baseline.
report.adapter.removed = evaluate("adapter switched OFF (revert check)", BASE);
report.adapter.revert_is_exact_baseline =
  JSON.stringify(report.adapter.removed.rows) === JSON.stringify(report.baseline.rows);

report.what_differs = {
  both_pass_now: report.full_finetune.all_pass && report.adapter.all_pass,
  distinction: "Full fine-tune edits the base weights; an adapter leaves them frozen and learns the change in a small add-on that can be removed or swapped.",
  real_models: "In a real model the base is billions of frozen numbers and the adapter (e.g. LoRA) is a tiny trained add-on. Same idea, bigger scale.",
  honest_limit: "This adapter still changes the answer for every input — adapters are modular, not task-selective. Real Qwen adapter training needs a framework and a memory check; untested locally.",
};

mkdirSync(new URL("../evidence/", import.meta.url), { recursive: true });
writeFileSync(new URL("../evidence/2026-11-11-adapter-demo.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
