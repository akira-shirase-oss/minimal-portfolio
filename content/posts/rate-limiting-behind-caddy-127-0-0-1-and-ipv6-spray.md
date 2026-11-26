+++
title = "Why every rate limiter behind Caddy saw 127.0.0.1"
description = "Behind Caddy on loopback, peer-IP rate limits collapse every user into one bucket. Here is how to trust proxy headers safely and stop IPv6 bucket sprays."
date = 2026-11-26T09:25:00-05:00

[taxonomies]
tags = ["security", "rust", "reliability"]

[extra]
kind = "failure"
+++

Per-IP rate limiting looks simple on a laptop. You grab the client's socket address, put it in a map, and return `429 Too Many Requests` when a bucket runs dry.

Then you put Caddy and Cloudflare in front of your Rust server on a VPS. Suddenly every single user on the internet arrives from the exact same TCP peer: `127.0.0.1`. One noisy client burns through the rate limit and locks out every legitimate customer on the platform.

We caught this exact bug—along with three subtler ones sitting right behind it—during a pre-launch security review of [Durable Runner](@/durable-runner/_index.md).

## Trap 1: trusting forwarding headers blindly

The reflex fix is to read `X-Forwarded-For` or `CF-Connecting-IP` instead of the TCP peer. That breaks in the opposite direction: if anything can reach your port directly (or if your proxy doesn't strip client-supplied headers), an attacker just sends a random `CF-Connecting-IP: 1.2.3.4` on every request and bypasses your rate limiter completely.

The rule in `durable-server/src/addr_limits.rs` is strict: **only read the forwarding header when the TCP peer is inside an explicit `TrustedProxies` CIDR list.** Everyone else is keyed on their actual TCP peer address.

```rust
pub fn client_addr(
    peer: IpAddr,
    trusted: &TrustedProxies,
    cf_connecting_ip: Option<&str>,
) -> IpAddr {
    if trusted.trusts(peer) {
        if let Some(ip) = cf_connecting_ip.and_then(|v| v.trim().parse::<IpAddr>().ok()) {
            return ip;
        }
    }
    peer
}
```

Notice the fallback: if the header is missing or malformed, we fall back to `peer` rather than letting the request skip rate limiting. And when running behind Cloudflare → Caddy → Rust on one box, Caddy must only accept connections from Cloudflare's edge (via Cloudflare Authenticated Origin Pulls and firewall rules) so `CF-Connecting-IP` cannot be spoofed before it hits loopback.

## Trap 2: connection caps happen *before* HTTP headers exist

Even after fixing request rate limits, your TCP connection limiter still sees `127.0.0.1` (or Cloudflare's edge IP) at `accept()` time—because no HTTP request has been read yet.

If your server caps every peer at 64 concurrent TCP connections (`--max-conns-per-addr`), your own reverse proxy hits that ceiling as soon as 64 users are active at once.

The fix is two separate caps:
- **`--max-conns-per-addr` (e.g. 64)** for normal peers.
- **`--max-conns-per-proxy` (e.g. 4096)** when the TCP peer matches `TrustedProxies`, while per-address HTTP rate limits still bound each individual client behind the proxy.

## Trap 3: unbounded rate-limit maps are a memory DoS

An unbounded `HashMap<IpAddr, Bucket>` is an easy way for a distributed flood to OOM your server. On the other hand, a naive LRU eviction policy lets an attacker spray random IPs to evict hot abusive buckets and reset their own rate limit.

In Durable Runner we cap the table at `MAX_LIMITED_ADDRS = 65_536` entries (~4 MiB). When the table is full:

1. Idle buckets that have been full for over 60 seconds are reclaimed.
2. Any new address that still doesn't fit **shares a single `overflow` token bucket** instead of evicting active entries.

Hot abusers stay tracked, memory stays flat, and an address spray throttles itself.

## Trap 4: keying IPv6 by full `/128` address

An IPv4 client usually has one IP. An attacker with a single residential IPv6 `/64` subnet has 2^64 unique addresses—and with a `/48`, they have 65,536 distinct `/64` subnets.

If you key your rate limiter by raw `IpAddr`, one IPv6 attacker can rotate the last 64 bits on every request and get an infinite supply of fresh buckets.

Our address normalizer handles three things at once:
1. **Unwrap IPv4-mapped IPv6 (`::ffff:203.0.113.5`)** back to IPv4 so one host can't get two separate buckets.
2. **Mask IPv6 addresses to `/64`** (`DEFAULT_V6_PREFIX = 64`) so every host inside one `/64` shares one bucket.
3. **Charge an aggregate `/48` bucket** at 10× the single-address rate so a single `/48` can't mint 65,536 fresh `/64` buckets to fill the table.

## Verify it with a real test

Don't assume proxy-header plumbing works because Caddy is configured—write two quick integration tests:
- Send a request from an **untrusted peer** with a spoofed `CF-Connecting-IP` header and assert the limiter ignores the header and throttles the peer.
- Send requests from a **trusted proxy peer** with two different `CF-Connecting-IP` headers and assert client A hitting `429` does not block client B.

If you're tuning Caddy in front of a Rust backend, also check [Caddy vs Nginx for reverse proxying modern web apps](@/posts/caddy-vs-nginx-reverse-proxy.md) and [Self-hosting production web apps on one VPS](@/posts/self-hosting-web-apps-vps-caddy-systemd-neon-cloudflare.md).

## Frequently asked questions

**Should I use `X-Forwarded-For` or `CF-Connecting-IP` behind Cloudflare?**
Use `CF-Connecting-IP` (when your origin only accepts traffic from Cloudflare via Authenticated Origin Pulls or strict firewall rules). `X-Forwarded-For` is a comma-separated list that clients can pre-populate, making index bugs far easier to introduce.

**Won't keying IPv6 at `/64` rate-limit multiple people on the same network?**
A `/64` is standard for a single household or small subnet—similar to a single NATed IPv4 address. Keeping the `/48` aggregate at a higher multiplier (such as 10×) protects your table without penalizing normal neighbours.
