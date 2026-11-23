+++
title = "Self-hosting web apps on one VPS: Caddy, systemd, Neon, and Cloudflare"
description = "A battle-tested checklist for running multiple Rust web apps on a shared VPS behind Caddy and Cloudflare with Authenticated Origin Pulls, Neon Postgres, and idempotent deploys."
date = 2026-11-23T11:45:00-05:00

[taxonomies]
tags = ["architecture", "security", "reliability", "postgres"]

[extra]
kind = "guide"
+++

Running your own small VPS with **Caddy + systemd + managed Postgres (Neon) + Cloudflare** gives you predictable flat pricing, always-on background workers, and zero Kubernetes overhead. It also gives you five classic ways to misconfigure TLS, client IPs, or secrets on deploy day if you wing it.

Here is the exact self-hosting layout and pre-deploy checklist we use across [Colophon CMS](@/colophon/_index.md), [Service Monitor](@/service-monitor/_index.md), and [Durable Runner](@/durable-runner/_index.md) on a shared DigitalOcean droplet.

## The architecture in one glance

- **Cloudflare Edge:** DNS, TLS termination, WAF, caching for public reads, and static hosting on Cloudflare Pages for landing pages and docs.
- **One VPS (DigitalOcean droplet):**
  - **Caddy** terminates edge-to-origin TLS on `:443`, enforces **Authenticated Origin Pulls**, and reverse-proxies each app to its own loopback port (`127.0.0.1:<port>`).
  - **Each Rust app runs under `systemd`**, serving both its API and its dashboard on the **same origin** (no CORS headaches, simple `HttpOnly`/`SameSite` session cookies, one deploy).
- **Neon Postgres:** managed PostgreSQL with `sslmode=verify-full` and off-box backups (tested with restore drills).

## The six rules that prevent deploy-day surprises

### 1. Keep hostnames one level under your zone
Cloudflare's free Universal SSL certificate covers `example.com` and `*.example.com` only. A two-level subdomain like `app.product.example.com` fails TLS unless you pay for Advanced Certificate Manager. Use `productapp.example.com` instead.

### 2. Lock the origin with Authenticated Origin Pulls (zone-level cert)
If someone discovers your droplet's IPv4 address, they can bypass Cloudflare's WAF and hit Caddy directly—and spoof `Cf-Connecting-Ip`. Enable **Cloudflare Authenticated Origin Pulls** with your **own zone-level client certificate** (not Cloudflare's shared global cert) and configure Caddy to require client-cert verification on `:443`.

### 3. Trust `Cf-Connecting-Ip` only at Caddy, and loopback only in the app
Caddy extracts the real client IP from `Cf-Connecting-Ip` (guaranteed by mTLS Origin Pulls) and passes it to the Rust app on `127.0.0.1`. Your Rust app trusts proxy headers **only** from loopback—and never trusts raw `X-Forwarded-For` from untrusted callers.

### 4. Isolate every app's Caddy file, port, and systemd unit
When multiple services share one VPS, no installer may overwrite global `/etc/caddy/Caddyfile`, `ufw`, or `sshd` config. Use a shared root Caddyfile with `import /etc/caddy/sites/*.caddy`, give each service a distinct loopback port from a registry, and turn Caddy's admin API off (or bind it to a root-only Unix socket).

```text
{
    admin off
}

import /etc/caddy/sites/*.caddy
```

And inside `/etc/caddy/sites/colophon.caddy`, keep upstream keep-alive *below* `hyper`'s timeout (see [why `hyper`'s `header_read_timeout` kills idle keep-alive connections](@/posts/hyper-header-read-timeout-kills-idle-keep-alive.md)):

```text
colophonapp.example.com {
    reverse_proxy 127.0.0.1:8081 {
        transport http {
            keepalive 20s
        }
    }
}
```

### 5. Pass secrets without shell history or argv
Never put database URLs or API keys in CLI flags (`ps aux` leaks them) or chat logs. Write secrets to root-only `0600` env files loaded by `systemd`'s `EnvironmentFile=`, keep separate credentials per purpose (media bucket vs backup bucket), and retain `.prev` on rotation so rollback is instant.

### 6. Test migrations against real Neon before deploy day
Stock Postgres CI runs as a superuser; Neon gives you a non-superuser owner. Always run your migrations against a scratch Neon database before deploy day (see [Migrating to Neon Postgres without superuser](@/posts/neon-postgres-migrations-without-superuser.md)) and make every deploy script idempotent so running it twice leaves the host clean.
