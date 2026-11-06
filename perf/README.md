# Local Learning-section load scenario

Run from the portfolio checkout, with Zola, Node, Python 3.12+, and ApacheBench
(`ab`) available:

```sh
python3 perf/learning-load.py --baseline-ref 1ad0a09d2c3105d9c482f552e645c297c150ec10
```

The script serves the baseline source and current checkout on loopback using
Zola's development server. It compares 50,000 homepage requests on each version,
then makes **1,000,000 feature requests** across the Learning index, track,
chapter, roadmap, and introductory blog. Concurrency rises from 8 to 1,024.

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

Every run writes raw ApacheBench reports, server logs, and `result.json` under
`perf/results/`, including machine details, the base commit, working-tree state,
and a digest of the exact content/templates/static/config source. Check results
into the same revision as the change. Source edits require a new run; changing
only stored evidence does not change the tested pages.
