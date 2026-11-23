+++
title = "SSE vs WebSockets vs Polling for live dashboards"
description = "When to use Server-Sent Events (SSE), WebSockets, or HTTP polling for live admin dashboards: reconnect gaps, proxy timeouts, auth cookies, and operational simplicity."
date = 2026-11-23T13:45:00-05:00

[taxonomies]
tags = ["architecture", "reliability", "rust"]

[extra]
kind = "guide"
+++

**Use Server-Sent Events (SSE) for live dashboards, status feeds, and change notifications where updates flow server → browser.** SSE runs over plain HTTP, works cleanly with standard session cookies and reverse proxies, and automatically reconnects in the browser. **Use WebSockets only when you genuinely need low-latency bidirectional messaging (chat, collaborative editing, multiplayer state). Use plain polling when updates happen every 15–60 seconds and you want zero long-lived connections.**

In [Colophon CMS](@/colophon/_index.md), live Studio updates use **SSE backed by Postgres `LISTEN`/`NOTIFY` change hints** (`events.rs`)—never WebSockets. Here is why.

## SSE vs WebSockets vs Polling at a glance

| Dimension | Polling | Server-Sent Events (SSE) | WebSockets |
|---|---|---|---|
| **Direction** | Request / response | Server → Client (one-way) | Full-duplex (bidirectional) |
| **Protocol** | Plain HTTP | Plain HTTP (`text/event-stream`) | `Upgrade: websocket` (separate framing) |
| **Browser auto-reconnect** | N/A | Built into `EventSource` (+ `Last-Event-ID`) | Manual (must build backoff + heartbeat) |
| **Auth & cookies** | Standard cookies / headers | Standard same-origin cookies | No custom headers in browser API; careful with CSWSH |
| **Reverse proxy & HTTP/2** | Zero friction | Works over HTTP/2 multiplexing (no 6-conn limit!) | Separate TCP upgrade; extra proxy & idle timeout config |
| **Best fit** | Slow-changing metrics, simple apps | Live dashboards, deploy logs, AI token streaming, CMS updates | Chat, collaborative whiteboards, games, live cursors |

## The hidden failure mode in *every* live stream: the reconnect gap

Whether you choose SSE or WebSockets, connections **will** drop—when a laptop sleeps, a proxy restarts, or a mobile user walks into an elevator.

The biggest mistake teams make is treating a live stream as the **source of truth** instead of a **change hint**:

1. **Stream hints, not full state.** Send a tiny event (`{ "kind": "resync" }` or `{ "collection": "posts" }`) and let the dashboard re-fetch the authoritative HTTP endpoint.
2. **Handle backend gaps explicitly.** If your SSE server is fed by Postgres `LISTEN`/`NOTIFY`, remember that [`sqlx::PgListener::recv()` silently drops notifications on reconnect](@/posts/sqlx-pglistener-silently-drops-notifications.md). Loop on `try_recv()`, and when `Ok(None)` fires, push an explicit `resync` event to every connected browser tab so no UI silently goes stale.
3. **Send periodic keep-alive comments (`: keepalive\n\n`).** Cloudflare, Caddy, and corporate proxies close idle HTTP streams after 60–100 seconds of silence. A 15-second SSE comment keeps the pipe open cleanly.

## When to choose which

**Choose Polling if:**
- A 10–30 second refresh interval is completely fine and you want stateless, CDN-cacheable HTTP endpoints.

**Choose SSE if:**
- You need instant server-to-browser updates (dashboards, build logs, job progress, AI streaming) without maintaining a separate WebSocket protocol.
- You serve your dashboard and API on the same origin with `HttpOnly` session cookies.

**Choose WebSockets if:**
- The browser sends high-frequency messages back to the server (keystrokes, cursor coordinates, chat frames, binary telemetry) where per-message HTTP POST overhead would hurt.
