# 404human.dev load matrix — stability and scale evidence

A static site: "load" means the built `public/` serving correctly at rate, plus build
integrity. Results in `perf/results/`. Honesty: local serving numbers are development
observations; production serving is Cloudflare Pages' edge, which we don't load-test (their
infrastructure, not ours — and load-testing a CDN you share with others is impolite traffic).

| Module | Scenario | What it proves | Evidence status |
|---|---|---|---|
| Built-site integrity | `tools/check-training-loop.mjs` + content checks | built pages carry the right content — no broken build | committed (content-check results) |
| Static serving | `perf` learning-section runs | `public/` files served at million-request scale locally | committed (learning-section million-request results) |
| Full-site sweep | crawl-serve scenario (define) | every built URL answered 200 at rate — no 500s, correct content-types | gap — define + run once |
| Feeds/meta | sitemap/llms.txt/rss check | generated surfaces valid and complete | gap — define + run |

## Gaps to close this pass

1. One full-site sweep at rate against a local static server (all ~100 URLs, ≥1M total) — commit.
2. A feed/meta check script — sitemap URLs all resolve in `public/`, llms.txt covers every post.
