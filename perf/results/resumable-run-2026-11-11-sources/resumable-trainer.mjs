// Chapter 7 lab: a training run whose state can be saved, interrupted,
// and resumed — with a proof that resume is identical to uninterrupted.
//
// Model: prediction = input * weight. Data: input 2 -> target 6.
// Same centered numerical gradient as one-weight.mjs; no dependencies.
//
//   node labs/resumable-trainer.mjs full              → run all 8 steps
//   node labs/resumable-trainer.mjs part1             → run 4 steps, save checkpoint, stop (the "interrupt")
//   node labs/resumable-trainer.mjs part2             → load checkpoint, run the remaining 4 steps
//   node labs/resumable-trainer.mjs verify            → compare full vs interrupted+resumed, print PASS/FAIL
//
// A "checkpoint" here is one JSON file holding everything the next step needs:
// which step we are on, the weight, the settings, the data, and a hash of this
// program so a checkpoint can't silently resume under different code.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const DIR = new URL("../evidence/resumable-run-2026-11-11/", import.meta.url);
const CKPT = new URL("checkpoint.json", DIR);
const data = { input: 2, target: 6 };
const settings = { rate: 0.1, probe: 0.5, total_steps: 8 };
const code_sha256 = createHash("sha256").update(readFileSync(new URL(import.meta.url))).digest("hex");

const loss = (w) => (data.input * w - data.target) ** 2;
const gradient = (w) => (loss(w + settings.probe) - loss(w - settings.probe)) / (2 * settings.probe);

// One training step = the whole story of this lab: it only needs the
// current weight and settings — nothing else. (An optimizer with memory,
// like momentum, would add more state to save; ours is stateless.)
function step(state) {
  const g = gradient(state.weight);
  const weight = state.weight - state.rate * g;
  return { ...state, weight, step: state.step + 1, last_gradient: g, last_loss: loss(weight) };
}

function freshState() {
  return { run_id: "one-weight-resume-demo", step: 0, weight: 2, ...settings,
           data, code_sha256, history: [{ step: 0, weight: 2, loss: loss(2) }] };
}

function saveCheckpoint(state, note) {
  const { history, ...rest } = state;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(CKPT, JSON.stringify({ ...rest, note, saved_utc: new Date().toISOString() }, null, 2) + "\n");
}

function loadCheckpoint() {
  const ckpt = JSON.parse(readFileSync(CKPT, "utf8"));
  if (ckpt.code_sha256 !== code_sha256) throw new Error("Checkpoint was saved by different code — refusing to resume.");
  if (ckpt.rate !== settings.rate || ckpt.probe !== settings.probe) throw new Error("Settings differ from checkpoint.");
  return ckpt;
}

function record(name, payload) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(new URL(name, DIR), JSON.stringify(payload, null, 2) + "\n");
}

function run(state, steps) {
  for (let i = 0; i < steps; i += 1) {
    state = step(state);
    state.history.push({ step: state.step, weight: state.weight, gradient: state.last_gradient, loss: state.last_loss });
  }
  return state;
}

const mode = process.argv[2];
if (mode === "full") {
  const end = run(freshState(), settings.total_steps);
  record("full-run.json", { kind: "uninterrupted 8-step reference run", settings, history: end.history });
  console.log(`full: step ${end.step}, weight ${end.weight}, loss ${end.last_loss}`);
} else if (mode === "part1") {
  const end = run(freshState(), settings.total_steps / 2);
  saveCheckpoint(end, "interrupted after step 4 of 8 — saved and exited");
  record("part1-run.json", { kind: "interrupted at step 4", settings, history: end.history });
  console.log(`part1: stopped at step ${end.step}, weight ${end.weight} — checkpoint saved`);
} else if (mode === "part2") {
  const ckpt = loadCheckpoint();
  const end = run({ ...ckpt, history: [] }, settings.total_steps - ckpt.step);
  record("part2-run.json", { kind: "resumed from checkpoint to step 8", resumed_from_step: ckpt.step, settings, history: end.history });
  console.log(`part2: resumed from step ${ckpt.step} → step ${end.step}, weight ${end.weight}`);
} else if (mode === "verify") {
  const full = JSON.parse(readFileSync(new URL("full-run.json", DIR), "utf8"));
  const part1 = JSON.parse(readFileSync(new URL("part1-run.json", DIR), "utf8"));
  const part2 = JSON.parse(readFileSync(new URL("part2-run.json", DIR), "utf8"));
  const ckpt = JSON.parse(readFileSync(CKPT, "utf8"));
  const fullEnd = full.history.at(-1), p1End = part1.history.at(-1), p2End = part2.history.at(-1);
  const checks = {
    checkpoint_saved_at_step_4: ckpt.step === 4 && Math.abs(ckpt.weight - p1End.weight) < 1e-12,
    resume_continued_from_4: p2End.step === 8,
    final_weights_identical: p2End.weight === fullEnd.weight,
    final_losses_identical: p2End.loss === fullEnd.loss,
    checkpoint_records_code_hash: ckpt.code_sha256 === code_sha256,
  };
  const passed = Object.values(checks).every(Boolean);
  record("verify.json", { kind: "resume-parity verification", checks, passed,
    full_final: fullEnd, interrupted_final: p1End, resumed_final: p2End });
  console.log(JSON.stringify({ checks, passed, full_final: fullEnd, resumed_final: p2End }, null, 2));
  process.exitCode = passed ? 0 : 1;
} else {
  console.log("usage: node labs/resumable-trainer.mjs [full|part1|part2|verify]");
}
