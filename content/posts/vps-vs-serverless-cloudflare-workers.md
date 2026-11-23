+++
title = "Single VPS vs Serverless (Cloudflare Workers / AWS Lambda)"
description = "When an always-on VPS beats serverless (Cloudflare Workers / AWS Lambda): background loops, DB pools, cold starts, and predictable flat pricing."
date = 2026-11-23T12:45:00-05:00

[taxonomies]
tags = ["architecture", "reliability"]

[extra]
kind = "guide"
+++

**Choose a single always-on VPS (with Cloudflare in front) when your app needs persistent background loops, long-lived database connections, scheduled jobs, or live streams—and you want flat, predictable pricing.** **Choose serverless (Cloudflare Workers, AWS Lambda) when your workload is genuinely stateless, spiky, globally latency-sensitive at the edge, or sits idle 99% of the time.**

We evaluated Cloudflare Workers and Containers for our SaaS family ([Colophon CMS](@/colophon/_index.md), [Service Monitor](@/service-monitor/_index.md), [Durable Runner](@/durable-runner/_index.md)) and deliberately chose **Cloudflare Pages for static sites + one always-on DigitalOcean VPS for our Rust servers**. Here is the failure-mode breakdown behind that decision.

## Single VPS vs Serverless at a glance

| Dimension | Single VPS (+ Cloudflare Edge) | Serverless (Workers / Lambda) |
|---|---|---|
| **Always-on loops (schedulers, outbox, SSE)** | Native (one long-lived process under `systemd`) | Awkward or impossible (scale-to-zero kills loops; needs external queues/Durable Objects) |
| **Database connections** | Persistent `PgPool` + dedicated `PgListener` | Connection storms without HTTP proxies / poolers |
| **Cold starts** | Zero | ~0–10 ms (V8 isolates) to 100 ms–2 s (Lambda VPC/containers) |
| **Billing predictability** | Flat monthly bill ($6–$24/mo) | Pay-per-request (can spike unexpectedly under DDoS or retry loops) |
| **Global edge latency** | Origin in one region; Cloudflare caches public reads globally | Compute runs near every user automatically |
| **OS patching & uptime** | You own `systemd`, Caddy, backups, and upgrades | Managed by the cloud provider |

## Why scale-to-zero breaks real backend products

Modern backend services are rarely "just stateless HTTP handlers." Look at what a real CMS or monitor actually runs continuously:

1. **Scheduled publishing and cron loops** that must fire on time even when zero users are visiting the dashboard.
2. **Outbox workers** draining webhooks and rebuild jobs with bounded concurrency.
3. **Long-lived `LISTEN`/`NOTIFY` and SSE streams** pushing live updates to open tabs.
4. **Local WAL files or framed journals** (like [Service Monitor](@/service-monitor/_index.md)'s SQLite store and [Durable Runner](@/durable-runner/_index.md)'s journal).

On a scale-to-zero platform, every one of those forces you to bolt on extra proprietary services (managed queues, cron triggers, stateful Durable Objects, HTTP DB proxies). On a $12/month VPS running a compiled Rust binary under `systemd`, all four live in one 30 MB process with zero extra network hops.

## The best of both worlds: static at the edge, stateful on a VPS

You don't have to pick one extreme for your entire stack:
- **Static marketing pages, blogs, and docs** (`404human.dev`, product docs) belong on **Cloudflare Pages**—global CDN, zero origin load, free bandwidth.
- **Always-on APIs, dashboards, and workers** belong on an **always-on VPS behind Cloudflare + Caddy** (see our [self-hosting VPS checklist](@/posts/self-hosting-web-apps-vps-caddy-systemd-neon-cloudflare.md)).

## When to choose which

**Choose a single VPS if:**
- Your app has background workers, schedulers, WebSockets/SSE, or persistent Postgres/SQLite connections.
- You want simple same-origin deploys, flat pricing, and zero vendor lock-in.
- One well-tuned Rust/Go/Node binary easily handles your traffic (a single 2 GB VPS handles thousands of requests/sec in Rust).

**Choose Serverless if:**
- Your workload is pure request/response glue (webhooks, auth edge checks, image transforms, light APIs) with spiky or near-zero baseline traffic.
- You need compute running in 100+ edge locations close to users.
- You have no desire to manage OS updates, systemd units, or reverse proxies.
