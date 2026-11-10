# Local Learning-section load scenario

The first training-loop example also has numerical checks:

```sh
node tools/check-training-loop.mjs
```

This executes the complete code printed in chapter 3. It checks the known trace,
fresh gradients, a frozen baseline, the zero-gradient case, smaller updates, and
an oversized update that makes training loss worse. An optional local trainer
path adds a parity check; the recorded first run used the learning workspace's
`model-engineering/labs/one-weight.mjs`. Results are written to
`perf/results/first-training-loop-experiment.json`. It is a program and training-
example check, not an unseen-data evaluation or language-model benchmark.

The later frozen validation exercise is recorded in `results/validation-gate-v1.json`,
with its declared rules in `results/validation-criteria-v1.json` and independent
arithmetic/provenance checks in `results/validation-record-check.json`. Its
candidate verdict is deliberately **FAIL**: one required case misses the limit.
That model verdict is separate from successful record checks and HTTP serving
checks. Keep the failed result and original criteria available.

`node tools/compare-training-stability.mjs` uses the preserved one-weight trainer
to compare three learning rates with the same data, starting weight, and update
budget. It saves `results/first-training-stability-comparison.json`, refusing to
overwrite the first record; pass a fresh result path for a later run. The separate
`results/first-training-stability-independent-check.json` verifies its numerical
traces. These are local training calculations, separate from HTTP serving load.

`node tools/audit-training-data.mjs` inspects a ten-record synthetic support-label
fixture without calling or training a model. The first result and independent
hand-checked expected dispositions are preserved in `results/first-training-data-audit.json`
and `results/first-training-data-independent-check.json`. Those data-audit checks
do not establish model quality or replace the static-serving load scenario.

`node tools/compare-data-splits.mjs` reuses the audit's retained messages in a
fixed split lesson. One unchanged training-message lookup is evaluated on copies,
different validation messages, and one separate test partition. The leaky view
is rejected by overlap checks even with its perfect answer score. Results and
hand-checked expected outputs are in `results/first-data-split-comparison.json`
and `results/first-data-split-independent-check.json`. This is not neural-model
training or an independent real-world benchmark; use a fresh result path for a
later run so the first evidence remains intact.

`node tools/inspect-text-tokens.mjs` prepares character IDs and next-token targets
from a fixed tiny text fixture. The original round trips, vocabulary, per-document
targets and unknown-character rejection are in `results/first-text-tokenization.json`;
the independent expected IDs are in `results/first-text-tokenization-independent-check.json`.
It does not train a predictive model or measure inference quality. Use a fresh
result path to preserve later runs separately.

`node tools/inspect-next-token-probabilities.mjs` fits and queries an exact-prefix
count model on the same training documents. `results/first-next-token-probabilities.json`
records its table, distributions, selection examples, and a separately specified
single-target loss comparison. The independent hand-written expectations are in
`results/first-next-token-probabilities-independent-check.json`. These are fixture
checks, not held-out quality or neural training. Preserve later runs under fresh paths.

`results/qwen-tool-use-baseline.json` and `qwen-tool-use-baseline-sources/` retain
the first local Qwen request/tool/result smoke run and its source snapshot. It
uses existing weights and is not a reliability suite or a training run. The
website load scenario below measures static page serving, not model inference.

Run from the portfolio checkout, with Zola, Node, Python 3.12+, and ApacheBench
(`ab`) available:

```sh
python3 perf/learning-load.py --baseline-ref 7193b0bd3ac6fd377664c24fe71aee20cdd8d1e5
```

The script serves the baseline source and current checkout on loopback using
Zola's development server. It compares 50,000 homepage requests on each version,
then makes **7,200,000 feature requests**: 1,000,000 each on the homepage,
the first-training-loop, overfitting, data, text-model and harness chapters, plus 200,000 each across the Learning index, track,
two chapters, roadmap, and introductory blog. Concurrency ranges from 8 to 1,024.
For later changes, choose the previous source revision as the baseline.

The macOS/Unix runner checks its open-file limit before starting either server.
If the soft limit is below 4,096 and the hard limit permits it, the runner raises
the soft limit for itself and its child processes, including ApacheBench. It
records the before/after limits in `result.json`. This leaves system settings and
shell profiles unchanged. If the hard limit is too low, the run stops before
load with an explicit error. This prevents the load generator from exhausting a
small terminal limit while opening the scenario's 256–1,024 connections.

Before load, it checks status and identifying content. Each phase must finish
with zero failed or non-2xx requests, at least 500 requests/second, and p99 at
most 1,000 ms. The candidate homepage must retain at least 75% of baseline
throughput; its p99 must be no greater than twice baseline or 25 ms, whichever
is larger. Limits are fixed before a run. Misses stop and fail it; results are
kept, including failed runs.

The failure probes check a missing chapter's 404 response and successful
recovery after 512 incomplete requests are disconnected. Rising concurrency
records pressure, throughput, and latency; the differently sized routes do not
establish a saturation point. This is **local development-server evidence**,
not a claim about Cloudflare, production capacity, or a trained AI model.
HTTP load checks do not render CSS or establish mobile layout correctness.

Every run writes raw ApacheBench reports, server logs, and `result.json` under
`perf/results/`, including machine details, the base commit, working-tree state,
and a digest of the exact content/templates/static/config source. Check results
into the same revision as the change. Source edits require a new run; changing
only stored evidence does not change the tested pages.
