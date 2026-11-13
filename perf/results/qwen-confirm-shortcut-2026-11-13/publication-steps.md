# Publication sequence — 13 November 2026 (request walkthrough and confirmations)

1. Added chapter 9 section "Reading one request, then making it faster" (steps
   1–7 and revision notes), chapter 8 section "Qwen's real weight file", the
   roadmap/track focus notes and the post "My test said PASS. It was reading the
   todo's ID." Copied this experiment folder and
   `../qwen-weights-header-2026-11-13.json` from the local learning workspace.
2. Zola 0.23.6 built 129 pages and 10 sections, 0 orphans. Built HTML contained
   both new heading anchors; the new post appeared in sitemap.xml, llms.txt and
   rss.xml. Source commit `8897e99`.
3. `node tools/site-sweep.mjs --total 1000000 --concurrency 64`: 1,000,063
   requests across 165 built URLs, 9,666 requests/s, zero non-200, p99 18.097 ms.
   Receipt `../2026-11-13T182037394Z-site-sweep.json`, commit `ccd1e89`. A local
   development observation of static serving, not production capacity or model
   inference.
4. Pushed `8897e99` and `ccd1e89` to GitHub `main`.
5. Deployed with Wrangler CLI 4.159.0 (installed version; the README documents
   4.148.0) to Cloudflare Pages project `akira-shirase-oss`, branch `main`,
   commit `ccd1e89`: https://3eebdd14.akira-shirase-oss.pages.dev
6. Live checks on https://404human.dev returned HTTP 200 with the new content on
   chapter 9, chapter 8, the roadmap, the track index, the new post and
   llms.txt. The first chapter 9 anchor check returned the page without the new
   heading id; an immediate repeat returned it. Most likely a cached copy during
   deploy propagation; not separately confirmed.

Experiment limits are unchanged by publication: development cases, not held-out
evaluation; no weights changed; grader bug and compound failure preserved.
