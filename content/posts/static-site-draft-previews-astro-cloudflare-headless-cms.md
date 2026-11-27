+++
title = "How draft preview actually works on a static site"
description = "Most headless CMS preview guides assume SSR. Here is what breaks when you add draft preview to a static Astro site on Cloudflare Pages—and how to fix it."
date = 2026-11-27T12:15:00-05:00

[taxonomies]
tags = ["architecture", "security", "reliability"]

[extra]
kind = "failure"
+++

Static sites are fast, cheap, and hard to break—until an editor asks one completely reasonable question: *"How do I preview my draft before I hit publish?"*

Almost every headless CMS tutorial answers that question by quietly switching your site to full server-side rendering (`output: 'server'`). Once you do that, every public visitor hits a serverless function instead of plain pre-built HTML on a CDN.

When we moved [Colophon CMS](@/colophon/_index.md)'s own Astro landing page onto Colophon, we refused to give up static output for public pages. Building real draft preview on Cloudflare Pages while keeping every public route 100% static HTML surfaced six gotchas none of the glossy guides mention.

## The architecture: static public routes + thin preview worker

The split that preserves static-site speed is straightforward:

1. **Public routes (`/`, `/blog/post/`, `/features/...`) stay plain static HTML** built at deploy time—unchanged byte for byte, zero runtime compute.
2. **Only preview routes (`/api/preview` and `/preview/{collection}/{id}`) run on demand** inside a small Cloudflare Pages Worker/Function.

The preview handshake works like an OAuth authorization code, so a draft token never sits in a browser URL or server access log:

```text
1. Editor clicks "Preview" in CMS Studio
2. Studio issues a short-lived, single-use preview code
3. Browser opens: https://site.example/api/preview?code=<one-time>&path=/preview/blog/<id>
4. Worker exchanges `code` server-to-server with the CMS for a draft read token
5. Worker sets an HttpOnly, Secure cookie and redirects to /preview/blog/<id>
6. /preview/blog/<id> fetches the draft from the CMS using that cookie and renders HTML
```

Simple on paper. Here are the six things that bit us in practice.

## Gotcha 1: `X-Frame-Options: DENY` kills the Studio preview pane

Every static-site security checklist (including our own) puts `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'` on `/*` in `static/_headers`.

If your CMS Studio embeds the preview inside a split-pane iframe, the browser immediately blocks it with a blank frame. You have to keep `DENY` on public pages while relaxing framing **strictly for `/preview/*` and `/api/preview`**, using `Content-Security-Policy: frame-ancestors https://your-studio-origin` (and omitting `X-Frame-Options: DENY` on those preview paths—including on error pages returned by the preview handler).

## Gotcha 2: your Cloudflare adapter may have dropped Pages

Before writing custom wiring, check what your framework's current adapter actually targets. When we wired Astro's preview routes on Cloudflare Pages, the current official Astro Cloudflare adapter targeted Cloudflare Workers rather than classic Pages Functions. Keeping public pages purely static while generating a minimal Pages `_worker.js` strictly for the eight preview paths kept public assets untouched.

## Gotcha 3: raw Markdown + syntax highlighting blows edge CPU limits

At build time, Astro runs Shiki or Prism over every code block with plenty of CPU headroom. At **request time** inside a preview edge worker, you receive raw Markdown from the CMS API.

Shipping a full syntax highlighter (TextMate grammars + Oniguruma WASM) inside an edge worker easily hits bundle size or CPU-time limits on cold starts. For draft preview, render Markdown cleanly with a lightweight parser and leave code blocks plain `<pre><code>`—editors are verifying copy, headings, layout, and links, not grammar-token colours.

## Gotcha 4: cookie TTL drifts from Studio session renewal

Suppose your CMS issues a 15-minute draft grant and your preview worker sets `Max-Age=900` on the preview cookie. If the editor keeps writing for 20 minutes and the Studio silently renews the grant on the CMS side, the site's browser cookie still expires at minute 15—suddenly kicking the editor out of preview even though their Studio session is alive.

Either check the grant live and refresh the cookie's expiry, or have the Studio re-issue a fresh one-time code whenever the preview pane reloads after a save.

## Gotcha 5: collapsing every failure into one `404` or `previewing: false`

During testing, our code-exchange endpoint returned the exact same `404` for three completely different situations:

- an unknown code,
- a code that was already spent (e.g., an editor double-clicked or refreshed `/api/preview`), and
- a code that expired.

And when a preview cookie failed, returning a bare `previewing: false` caused the Studio UI to blame "cookies blocked" even when the draft had simply been published or revoked. Distinct error codes (`code_used`, `code_expired`, `grant_revoked`, `already_published`) take five minutes to add and save hours of confused support messages.

## Gotcha 6: validate the `path` parameter before spending the code

Never burn a single-use preview code before validating the redirect target `path`. Check that `path` starts with `/preview/` (preventing open redirects to `https://evil.example` or `//evil.example`) *first*—if it's malformed, reject the request cleanly before calling the CMS exchange endpoint.

For the broader trade-offs between static sites and dynamic CMS rendering, see [Headless CMS vs Static Site Generator](@/posts/headless-cms-vs-static-site-generator.md) and [Cloudflare Pages vs Vercel for static sites](@/posts/cloudflare-pages-vs-vercel-static-sites.md).

## Frequently asked questions

**Why use a one-time code instead of putting the draft API key in the preview URL?**
URLs leak into browser history, `Referer` headers, proxy logs, and copy-pasted Slack links. Exchanging a short-lived, single-use code server-to-server keeps the real draft token inside an `HttpOnly`, `Secure` cookie scoped only to `/preview/`.

**Will Google accidentally index my `/preview/*` routes?**
Send `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store` on every `/preview/*` and `/api/preview` response, and exclude `/preview/` from your sitemap. Never let a CDN cache a draft response.
