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

Run from the portfolio checkout, with Zola, Node, Python 3.12+, and ApacheBench
(`ab`) available:

```sh
python3 perf/learning-load.py --baseline-ref 7193b0bd3ac6fd377664c24fe71aee20cdd8d1e5
```

The script serves the baseline source and current checkout on loopback using
Zola's development server. It compares 50,000 homepage requests on each version,
then makes **3,200,000 feature requests**: 1,000,000 each on the homepage and
the first-training-loop chapter, plus 200,000 each across the Learning index, track,
two chapters, roadmap, and introductory blog. Concurrency ranges from 8 to 1,024.
For later changes, choose the previous source revision as the baseline.

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
