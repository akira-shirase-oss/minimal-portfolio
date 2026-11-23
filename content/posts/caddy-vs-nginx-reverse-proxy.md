+++
title = "Caddy vs Nginx for reverse proxying modern web apps"
description = "Caddy vs Nginx in production: automatic TLS, config minimalism, upstream keep-alive timeouts, HTTP/2 and mTLS origin pulls, and when Nginx still wins."
date = 2026-11-23T13:00:00-05:00

[taxonomies]
tags = ["architecture", "reliability", "security"]

[extra]
kind = "guide"
+++

**Choose Caddy by default for self-hosted web apps and multi-service VPS setups.** Automatic HTTPS, clean 10-line configs, built-in OCSP stapling, and safe defaults eliminate 90% of reverse-proxy footguns. **Choose Nginx when you need maximum raw edge throughput on huge static/proxy farms, rely on battle-tested C modules (like OpenResty/Lua), or operate inside an enterprise fleet that already standardizes on Nginx.**

We run **Caddy** in front of every Rust service on our shared VPS (see our [self-hosting checklist](@/posts/self-hosting-web-apps-vps-caddy-systemd-neon-cloudflare.md)). Here is how Caddy and Nginx actually compare once you hit production edge cases.

## Caddy vs Nginx at a glance

| Dimension | Caddy | Nginx |
|---|---|---|
| **Automatic TLS (Let's Encrypt / ZeroSSL)** | Built-in, automatic issuance & renewal | External (`certbot` + cron/systemd timer) |
| **Config readability** | Short, declarative `Caddyfile` (5–15 lines per site) | Verbose `nginx.conf` (easy to miss `proxy_set_header` or TLS ciphers) |
| **Multi-app VPS isolation** | `import /etc/caddy/sites/*.caddy` | `include /etc/nginx/sites-enabled/*.conf` |
| **Raw throughput / memory** | Very fast (Go); slightly higher RAM per connection | Industry ceiling (event-driven C); lowest memory overhead |
| **Ecosystem / custom modules** | Growing Go plugin ecosystem (`xcaddy`) | Massive decades-old ecosystem (OpenResty, ModSecurity, njs) |
| **Admin API** | Enabled on `:2019` by default (**turn off** if unused!) | None (reload via `nginx -s reload`) |

## Two subtle production gotchas to watch in both

### 1. Upstream idle keep-alive alignment
Both Caddy and Nginx pool HTTP/1.1 keep-alive connections to your backend app (`127.0.0.1:8080`). If your reverse proxy keeps an idle socket alive *longer* than your backend's idle/header timeout (for example, `hyper`'s 30-second default), the proxy will occasionally send a request down a socket the backend just closed—producing mysterious `502 Bad Gateway` errors.

In Caddy, set `keepalive` explicitly *below* the backend timeout:

```text
app.example.com {
    reverse_proxy 127.0.0.1:8080 {
        transport http {
            keepalive 20s
        }
    }
}
```

(We traced this exact race in [why `hyper`'s `header_read_timeout` kills idle keep-alive connections](@/posts/hyper-header-read-timeout-kills-idle-keep-alive.md).)

### 2. Lock down Caddy's admin API and proxy headers
Two things we check in every Caddy audit:
- Set `admin off` in the global block (or bind it to a root-only Unix socket) if you don't use dynamic config reloads over localhost.
- If Cloudflare sits in front of Caddy, enforce **Authenticated Origin Pulls** (client TLS cert verification) and pass `Cf-Connecting-Ip`—never let arbitrary internet clients spoof `X-Forwarded-For`.

## When to choose which

**Choose Caddy if:**
- You are self-hosting a handful of web apps or SaaS services on one or a few VPS nodes.
- You want zero-maintenance TLS and readable configs you can audit in 30 seconds.
- You value developer/operator speed over squeezing the last 10% of C-level proxy CPU.

**Choose Nginx if:**
- You serve massive static/media traffic where every megabyte of RAM and microsecond of proxy overhead counts.
- You need OpenResty/Lua scripting, advanced cache slicing, or a specific Nginx module.
- Your team already has hardened Nginx templates, Ansible roles, and monitoring dashboards in place.
