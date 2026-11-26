+++
title = "Cloudflare Error 1010 on /mcp and /oauth endpoints"
description = "Cloudflare's Browser Integrity Check rejects Python's default HTTP client with 403 Error 1010 before requests ever reach your MCP or OAuth server."
date = 2026-11-26T09:20:00-05:00

[taxonomies]
tags = ["ai", "security", "architecture"]

[extra]
kind = "failure"
+++

Nothing wastes twenty minutes faster than debugging an OAuth or MCP auth failure in your backend logs—only to realize your server never received a single request.

We hit this while dogfooding [Colophon CMS](@/colophon/_index.md) by running its own landing site through its remote MCP server. Calling `/mcp` and `/oauth` from curl or the TypeScript client worked fine. Calling the exact same URLs from a script using Python's standard HTTP library immediately failed with:

```text
HTTP/2 403
error code: 1010
```

Not a bad bearer token. Not a missing scope. Cloudflare blocked the request at the edge before it ever touched our Rust server.

## Why Cloudflare returns Error 1010

Error `1010` is Cloudflare's **Browser Integrity Check** (enabled by default on proxied zones). It inspects incoming HTTP headers—primarily `User-Agent`—and blocks requests that match patterns commonly associated with bare scrapers or automated scripts.

Python's default `urllib` sends `User-Agent: Python-urllib/3.x`, which triggers `1010` straight away. Many lightweight CLI utilities, agent runtimes, and custom MCP clients hit the exact same wall if they omit or leave a stock library `User-Agent`.

For a marketing site with HTML forms, blocking bare script user agents is a harmless default. For machine-to-machine endpoints like `/mcp`, `/oauth/*`, and `/.well-known/oauth-authorization-server`, the *entire point* of the route is to be called by non-browser clients.

## The fix: scope Browser Integrity Check off for API/MCP paths

Don't blindly turn off Browser Integrity Check across your entire zone if you still want it on your regular web pages. Instead, add a narrow **Cloudflare Configuration Rule** for the machine-facing routes:

1. In the Cloudflare dashboard, open your zone and go to **Rules → Configuration Rules → Create rule**.
2. Match only the non-browser paths:

```text
(starts_with(http.request.uri.path, "/mcp"))
or (starts_with(http.request.uri.path, "/oauth/"))
or (starts_with(http.request.uri.path, "/.well-known/"))
```

3. Under **Settings**, set **Browser Integrity Check** to **Off**, then deploy.

If your MCP and OAuth endpoints live on a dedicated API subdomain (like `api.example.com`), scoping the rule by hostname is even cleaner.

## Don't rely on User-Agent for security anyway

Turning off Browser Integrity Check on `/mcp` and `/oauth/*` does not weaken real security—because a `User-Agent` header is trivial for any attacker to spoof (`-A "Mozilla/5.0 ..."`).

Real protection for MCP servers has to live inside the origin:

- **OAuth / scoped tokens** checked on every call.
- **Per-address rate limits** keyed on the real client IP (not the proxy loopback address).
- **Server-enforced tool permissions and budgets** so an AI agent cannot self-approve publishes or run unbounded loops.

We wrote down the exact server-side guards we enforce on Colophon's MCP adapter in [Securing MCP servers for AI agents](@/posts/securing-mcp-servers-for-ai-agents.md), and the full Cloudflare + Caddy + systemd VPS setup in [Self-hosting production web apps on one VPS](@/posts/self-hosting-web-apps-vps-caddy-systemd-neon-cloudflare.md).

## One tip if you're writing an MCP client

If you maintain a Python SDK or agent client that talks to third-party MCP servers behind Cloudflare, **always set an explicit `User-Agent`** (for example `my-agent-client/0.1`) instead of leaving `Python-urllib` as the default. You shouldn't have to, but until every server operator excludes `/mcp` from Browser Integrity Check, an explicit `User-Agent` avoids mysterious `403 / 1010` blocks in the field.

## Frequently asked questions

**How can I tell if a 403 is from Cloudflare Error 1010 instead of my app?**
Check the response body and headers. Cloudflare `1010` returns plain text `error code: 1010` (with a `cf-ray` header) and never appears in your origin server's access logs.

**Why include `/.well-known/*` in the Configuration Rule?**
Remote MCP clients discover OAuth metadata by fetching `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` *before* they ever hit `/oauth/*` or `/mcp`. If Browser Integrity Check blocks discovery with `1010`, the client fails before authentication even starts.
