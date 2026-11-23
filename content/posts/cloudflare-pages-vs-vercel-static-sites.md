+++
title = "Cloudflare Pages vs Vercel for static sites and docs"
description = "Cloudflare Pages vs Vercel for static blogs, landing pages, and Astro/Zola docs: bandwidth limits, HTTP _headers CSP/HSTS, deploy workflows, and vendor lock-in."
date = 2026-11-23T13:15:00-05:00

[taxonomies]
tags = ["architecture", "security"]

[extra]
kind = "guide"
+++

**Choose Cloudflare Pages for static blogs, landing pages, and Astro/Zola documentation sites.** You get unlimited bandwidth on the free tier, native `_headers` and `_redirects` files for strict HTTP CSP/HSTS hygiene, and direct CLI deploys (`wrangler pages deploy`) with zero surprise overage bills. **Choose Vercel when your site is a Next.js app that relies heavily on SSR, Incremental Static Regeneration (ISR), preview-branch collaboration, and tight Next.js framework integration.**

This site (`404human.dev`), our product landing pages, and our Astro Starlight docs sites all deploy to **Cloudflare Pages**. Here is why.

## Cloudflare Pages vs Vercel at a glance

| Dimension | Cloudflare Pages | Vercel |
|---|---|---|
| **Static bandwidth pricing** | **Unlimited** on free & paid plans | Metered (100 GB/mo free, then paid overages) |
| **Static headers (`CSP`, `HSTS`, `noindex`)** | Plain `static/_headers` file | `vercel.json` |
| **Redirects** | Plain `static/_redirects` file (301/302) | `vercel.json` or Next.js config |
| **Build-and-ship determinism** | Build locally with exact binary (`zola build`) and upload `public/` via `wrangler` | Git-push cloud builds (great DX, less control over exact binary unless via CLI) |
| **Commercial use on free tier** | Allowed | Restricted to non-commercial Hobby tier |
| **Best fit** | Static sites, Zola/Astro/Hugo docs, marketing sites, commercial indie products | Next.js full-stack apps, teams needing PR preview comments & ISR |

## The failure modes that actually matter

1. **Surprise bandwidth bills when a post hits Hacker News.** A viral technical post with a few screenshots can push tens or hundreds of gigabytes in a weekend. On metered static hosts, a traffic spike turns into a billing alert; on Cloudflare Pages, static bandwidth is unlimited.
2. **Competing git deploys.** Earlier on GitHub Pages, two competing deploys could race on a push and publish the wrong build. Building locally with our exact Zola 0.23.6 binary, running `zola check` + contrast + CSP checks, and uploading the exact verified `public/` directory via `wrangler pages deploy` guarantees **what you checked is byte-for-byte what ships**.
3. **Duplicate-domain indexing.** Both Cloudflare (`*.pages.dev`) and Vercel (`*.vercel.app`) expose preview/project domains alongside your custom domain. On Cloudflare Pages, three lines in `static/_headers` (`X-Robots-Tag: noindex` on `*.pages.dev` and `www.`) plus `<link rel="canonical">` keep search engines focused on one domain.

## When to choose which

**Choose Cloudflare Pages if:**
- You ship static HTML/CSS/JS (Zola, Astro Starlight, Hugo, SvelteKit static adapter).
- You want unlimited bandwidth, commercial-friendly free hosting, and Cloudflare DNS/WAF in one place.
- You want strict HTTP security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`) in a plain `_headers` file.

**Choose Vercel if:**
- You are building a Next.js application using App Router SSR, Server Actions, or ISR.
- Your team relies on Vercel's PR preview UI, toolbar comments, and analytics.
