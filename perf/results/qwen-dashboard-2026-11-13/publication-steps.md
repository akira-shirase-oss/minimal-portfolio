# Publication sequence — 13 November 2026

1. Reconciled the three earlier prepared portfolio packages and setup-access
   addendum into the canonical portfolio. Added direct setup recovery, actual
   model results, dashboard screens, query-stage instrumentation, monochrome
   design and >=14px sans-serif changes. Preserved the earlier failures.
2. Zola built 128 pages and 10 sections. Source commit `396d260` was pushed.
3. Ran `python3 perf/learning-load.py --baseline-ref cf7cb8eddc932601eef815e3238a44eafe8d62cb --port 1141`.
   Passed the content checks, baseline/candidate comparison and five million-
   request feature phases. The harness phase stopped before results with
   ApacheBench exit 49: `apr_socket_connect(): Can't assign requested address`.
   Original failed receipt: `../20261113T165341Z-learning/result.json`.
4. Added explicit continuation support in commit `911037e`. It requires identical
   site source hash, baseline, thresholds, Zola version and machine before reusing
   a successful phase. It preserves the original failed receipt and skips no
   unsuccessful phase. A fresh listener port changes the connection tuple;
   no system networking settings were changed.
5. Continued using `--port 1151 --resume-result perf/results/20261113T165341Z-learning/result.json`.
   The updated harness chapter completed 1,000,000 requests, zero failed/non-2xx,
   30,410.89 requests/s, p99 21 ms. Four other 200,000-request phases passed.
   The roadmap phase at concurrency 1,024 then hit the same client allocation
   error. Receipt: `../20261113T165813Z-learning/result.json`.
6. A read-only machine check found 31,096 established TCP socket entries; another
   local service and its worker accounted for roughly 15,500 connections (both
   endpoints appear in socket counts). The IPv4 ephemeral range was 49152–65535.
   Shared-machine connection pressure is the likely explanation, not an isolated
   proof of the exact kernel failure. That unrelated service was left running.
7. Overall full-site sweep status: **incomplete/failed**, with both attempts
   retained. Across the original and continuation, 6.8 million feature requests
   completed, including the updated chapter's million-request phase. Reused
   phases are not counted as newly executed requests. The remaining roadmap and
   blog phases and final recovery checks did not complete. These are development
   observations about local Zola serving, not Qwen throughput or Cloudflare
   capacity. The required scenario remains available; this is not a claim of a
   fully green performance gate.
8. The dashboard's separate evidence is unchanged: 25 scripted checks and four
   real local model development cases passed. No weights changed, no held-out
   quality benchmark ran and no cost savings were measured. Publication can
   preserve and explain failed checks without labelling them successful.

Cloudflare deployment and live checks are recorded in `publication.json` once
actually executed. Personal application data, private learner answers, model
weights and Python environments are excluded from this public source record.
