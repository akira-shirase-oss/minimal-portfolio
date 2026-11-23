+++
title = "Headless CMS vs Static Site Generator (Zola / Astro)"
description = "When a static site generator (Zola or Astro) beats a headless CMS—and when editorial workflows, roles, and scheduled publishing justify a CMS."
date = 2026-11-23T14:15:00-05:00

[taxonomies]
tags = ["architecture", "reliability"]

[extra]
kind = "guide"
+++

**Choose a Static Site Generator (Zola or Astro) when developers own the content, changes go through Git, and you want zero runtime servers, sub-second builds, and maximum security.** **Choose a Headless CMS when non-technical editors need a browser UI, draft previews, role-based approvals, scheduled publishing, or structured content shared across multiple apps and sites.**

We build and run **both** in this workspace: `404human.dev` runs on **Zola** (a single Rust binary, zero runtime database), our product docs run on **Astro Starlight**, and [Colophon CMS](@/colophon/_index.md) is our Rust + Svelte headless CMS built specifically for the moment Git-only workflows stop scaling.

## Headless CMS vs Static Site Generator at a glance

| Dimension | Static Site Generator (Zola / Astro) | Headless CMS (e.g., Colophon, Strapi, Sanity) |
|---|---|---|
| **Authoring workflow** | Markdown + Git commits + pull requests | Browser Studio UI with drafts, roles, and validation |
| **Runtime attack surface** | Near zero (static HTML/CSS on a CDN) | Live API + database + auth (needs patching, rate limits, backups) |
| **Scheduled publishing** | Needs external CI cron rebuilds | Built-in scheduler (publishes at exact timestamp without redeploying code) |
| **Non-developer editors** | High friction (Git, Markdown syntax, frontmatter errors) | First-class (form fields, media library, live previews) |
| **Multi-channel reuse** | Awkward (content is tied to one repo's build) | One structured API feeds web, mobile, docs, and newsletters |
| **Hosting cost & speed** | Free / unlimited on Cloudflare Pages; instant CDN TTFB | VPS + Postgres + CDN caching for public reads |

## The hybrid pattern most teams end up with

This doesn't have to be an all-or-nothing choice. In fact, the strongest architecture combines both:

1. **Author and govern content in a Headless CMS** (drafts, schema validation, scheduled publish, audit history, and safe AI draft proposals via MCP).
2. **Trigger a static rebuild or cache purge on publish** (via a transactional outbox + webhook to [Durable Runner](@/durable-runner/_index.md) or Cloudflare Pages).
3. **Serve public readers fast static HTML/cached JSON at the edge**, so a traffic spike never hits your CMS database.

## When to choose which

**Choose a Static Site Generator (Zola / Astro) if:**
- You are building a developer portfolio, engineering blog, or technical docs where writers are comfortable in Git.
- You want `zola build` in 200 ms, zero database operations, and a site that can never go down from a Postgres outage.
- You rarely need non-engineers editing copy or scheduling releases.

**Choose a Headless CMS if:**
- Marketing, editorial, or support teams need to edit pages, upload media, preview drafts, and schedule launches without opening a pull request.
- You need strict role permissions (editor vs publisher), approval gates, or audit logs proving what was live at a given timestamp.
- Multiple frontends (marketing site, app dashboard, mobile client) consume the same structured content.
