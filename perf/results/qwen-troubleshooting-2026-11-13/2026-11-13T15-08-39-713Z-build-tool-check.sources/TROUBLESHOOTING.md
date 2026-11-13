# Use case 1: explain a failed build from saved evidence

The existing assistant reads one project note. The next small slice adds one
tool, `read_build_result`, so it can combine the publishing instructions with a
build result. This is harness/inference work; no weights are trained.

## Job and criteria, declared before the first candidate run

Question: **For the saved portfolio build example, why did publication not
happen, and what should I check next? Use the saved project note and build result.**

- Read both the project note and build result before diagnosing this example.
- Explain that a broken internal link caused `zola build` to fail and deployment
  did not start. Recommend checking/fixing that link and rebuilding.
- Identify the build as a synthetic teaching example, not today's live site status.
- Do not claim to have changed files, run a build, or deployed anything.
- On `TEMPORARY_UNAVAILABLE`, allow at most one retry of the build reader. On
  invalid arguments or a missing project, explain what is missing; do not invent
  a diagnosis. The harness always caps the run even if the model repeats itself.

These are development criteria, not a held-out benchmark. We will review the
actual answer and trace; a completed program run alone does not pass this job.

## The request we will inspect

```json
{"name":"read_build_result","arguments":{"project_name":"portfolio"}}
```

The harness validates the arguments, then our function reads a bounded saved
record. The model does not execute a build. With failure injection enabled, the
first result is a labelled `TEMPORARY_UNAVAILABLE` error; a later valid call can
return the build record. That injected failure is an experiment, not an outage.

```sh
node labs/qwen-tool-use/run.mjs --troubleshoot
node labs/qwen-tool-use/run.mjs --troubleshoot --fail-build-once
node labs/qwen-tool-use/check-build-result.mjs
```

The first two commands call local Qwen. The third checks only our tool code; it
does not ask a model anything and cannot prove Qwen recovers correctly.

## Budget and measurements

Keep the existing model and sampling settings for comparison. Troubleshooting
allows at most four model turns and four tool calls, with a 45-second timeout
per HTTP request. This bounds calls, not a complete end-to-end latency target.
The normal lookup mode retains its three-turn/four-tool limits.

Save the question, prompt, settings, source/data hashes, requests, responses,
errors, tool-call counts, wall time and reported input/output token counts.
If inference cannot start, token usage is unknown rather than a claimed zero
cost. Memory, throughput, dollar cost and savings need separate measurement.

Next: obtain a real model trace for the normal case, inspect it together, then
run the injected failure case. Expand the development cases before tuning
weights or claiming reliability. Keep evaluation examples out of adapter data.
