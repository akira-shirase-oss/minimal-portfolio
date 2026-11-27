+++
title = "Running our CMS's own site through MCP: bugs from day one"
description = "We moved Colophon's landing page onto Colophon itself and drove it through MCP. Here are the real deploy, preview, CI, and tool bugs we hit in one day."
date = 2026-11-27T12:30:00-05:00

[taxonomies]
tags = ["ai", "rust", "reliability", "architecture"]

[extra]
kind = "experiment"
+++

Test suites tell you whether your code behaves the way you *imagined* users would use it. Running your own real website on your own product tells you where your imagination was wrong.

Yesterday we moved [Colophon CMS](@/colophon/_index.md)'s own landing site (`colophon.404human.dev` — 15 blog posts, 17 pages, home copy, and status line) onto our live hosted Colophon instance and operated it through its remote **MCP server** wherever possible.

Our unit tests, integration tests, and attack suites were all green. Day one of real dogfooding still uncovered more than a dozen concrete bugs across MCP, deploys, Studio routing, static previews, and CI. Here are the ones that taught us the most.

## 1. MCP tools that passed tests but hurt real usage

Driving a real site through MCP immediately exposed friction a synthetic smoke test hides:

- **No tool to create a project (`M1`)** and **`upload_asset` took no file (`M2`)**: you could edit entries through MCP, yet you still couldn't bootstrap a new site end to end without dropping back to raw HTTP.
- **One-typo edits resent 85,000-character bodies (`M3`):** fixing a single word in a long post forced the agent to regenerate and transmit the entire document. Adding a targeted `edit_entry` tool (with optimistic-locking stale refusal) fixed both token burn and accidental overwrites.
- **Substring confirmation bug (`M11`):** opening a draft preview triggered a human approval prompt—because our approval-matching rule checked for `"review"` as a substring and matched `"preview"`.
- **Cloudflare `403 Error 1010` (`M7`):** Cloudflare's Browser Integrity Check blocked Python's default `urllib` client on `/mcp` and `/oauth` before requests ever reached our Rust server. We wrote the full fix up in [Cloudflare Error 1010 on `/mcp` and `/oauth` endpoints](@/posts/cloudflare-error-1010-mcp-oauth-browser-integrity-check.md).
- **No-op saves created fake "unpublished changes" (`M9`):** saving an entry whose body was byte-identical to the current revision still minted a new revision ID, making the Studio show a "needs publish" badge even though nothing changed.

## 2. Deploys dropped traffic for 12.9 seconds whenever an editor tab was open

Every deploy looked smooth in local tests—until a real browser kept an SSE `/events` stream open while we pushed a new binary.

`axum::serve(...).with_graceful_shutdown(...)` waited out the entire 25-second shutdown deadline for that one open SSE connection while refusing new sockets. Cancelling open SSE streams the moment draining starts cut deploy failures from **3 / 407 probes over 12.9 s (29 s switch)** down to **0 / 411 failed probes (10 s switch)** with a live stream open the entire time. Full details in [Why Axum graceful shutdown returned 502 for 10 seconds](@/posts/axum-graceful-shutdown-sse-502.md).

## 3. A collection named `media` could be created—and never opened

Because the Studio already has static pages at `/media`, `/tasks`, `/audience`, and `/import`, creating a collection with any of those slugs succeeded through the API and then shadowed itself in the UI.

Instead of just adding four strings to a list, we added a CI test that reads SvelteKit's actual route directory and fails whenever a static route isn't reserved by the backend—see [Why naming a collection `/media` broke our app](@/posts/reserved-slugs-route-collisions-ci-test.md).

## 4. Three surprises when a static site becomes CMS-driven

Once content lives in a CMS instead of git commits, assumptions baked into your static-site repo break quietly:

- **Hardcoded headline checks broke CI (`P3`):** our landing page's browser test asserted the exact old headline text. The first real edit made in the Studio broke CI until we updated the check to read the page's own `<h1>`.
- **IndexNow pings stopped firing (`P9`):** the deploy script checked `git diff` to decide which URLs changed—which is always empty after a CMS publish! Switching the step to diff the new build against the live site fixed search-engine pings for CMS-only publishes.
- **Static draft preview needed a thin worker (`P6`):** Astro's official Cloudflare adapter no longer targeted classic Pages, `X-Frame-Options: DENY` blocked the preview iframe, and raw Markdown syntax highlighting didn't fit edge CPU limits. Full breakdown in [How draft preview actually works on a static site](@/posts/static-site-draft-previews-astro-cloudflare-headless-cms.md).

## 5. What's still open (kept honest)

Dogfooding didn't magically finish everything—several real gaps are still open on our board:

- **Instant rebuilds on publish (`P2`):** right now a scheduled check polls for a new release every 5 minutes; an instant webhook-to-Pages rebuild relay is still ahead.
- **Lossless Strapi/Sanity field mapping on import (`S5`):** importing currently expects matching field names and doesn't yet convert Sanity Portable Text blocks or references.
- **Delivery timestamps (`P10`):** delivered entries don't yet carry the timestamp a version went live, so `lastmod` in the sitemap still relies on an editor-entered date.

## The takeaway

Every single one of these issues lived in the **seams**—between MCP and Cloudflare, between Axum shutdown and a browser's `EventSource`, between SvelteKit's filesystem router and Postgres validation, and between a CMS publish and a static-site CI pipeline.

Unit tests rarely cross those seams. Being your own first real user crosses all of them before lunch.

## Frequently asked questions

**Why drive your own site through MCP instead of just using the Studio UI?**
Because MCP is a core feature of Colophon, not a demo checkbox. Using it for real edits, uploads, publish requests, and site checks immediately surfaced real agent-ergonomics bugs (like resending 85 KB bodies and the `"review"`-inside-`"preview"` bug) that only show up under real workflows.

**Does the live site still ship static HTML now that Colophon manages it?**
Yes—every public route on `colophon.404human.dev` is still pre-built static HTML carrying the release number it was built from, with a site check verifying the release marker live after deploy.
