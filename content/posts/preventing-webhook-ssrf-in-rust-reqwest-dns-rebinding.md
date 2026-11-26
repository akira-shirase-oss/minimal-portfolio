+++
title = "Preventing webhook SSRF and DNS rebinding in Rust"
description = "Validating a URL before calling reqwest is broken by DNS rebinding, redirects, and IPv6 tricks. Enforce SSRF checks inside reqwest's custom Resolve."
date = 2026-11-26T09:30:00-05:00

[taxonomies]
tags = ["rust", "security", "architecture"]

[extra]
kind = "failure"
+++

Any backend that lets users register a webhook URL, an uptime probe, or an HTTP job handler has the same terrifying feature: you just built an HTTP proxy inside your own network.

If you let a tenant register `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:8080/internal`, your server will dutifully fetch it on their behalf. Both [Service Monitor](@/service-monitor/_index.md) (uptime probes and alert webhooks) and [Durable Runner](@/durable-runner/_index.md) (registered HTTP step handlers) take user-supplied URLs—and the obvious "validate the URL first" approach fails in four different ways.

## Four ways naive SSRF checks get bypassed

If you parse a URL, call `lookup_host()`, verify the IP isn't private, and then call `reqwest::Client::post(url)`, an attacker still gets through:

1. **DNS rebinding (TOCTOU):** On your validation lookup, `attacker.example` returns `93.184.216.34` (TTL 0). Ten milliseconds later, `reqwest` resolves `attacker.example` a second time to open the TCP socket—and gets `127.0.0.1`.
2. **Multi-record / round-robin DNS:** A domain returns two `A` records: `[93.184.216.34, 10.0.0.1]`. If your validator only checks the first IP (or checks "at least one IP is public"), the HTTP client can dial `10.0.0.1` when the first address refuses connections.
3. **HTTP redirects:** `https://public.attacker.example/hook` passes every check, then responds with `302 Found` and `Location: http://127.0.0.1:5432/`.
4. **IPv6 encodings and non-obvious ranges:** Checking `is_loopback()` and `is_private()` in stdlib misses CGNAT (`100.64.0.0/10`), link-local cloud metadata (`169.254.0.0/16`), IPv4-mapped IPv6 (`::ffff:127.0.0.1`), NAT64 (`64:ff9b::/96`), 6to4 (`2002::/16`), multicast, and—on a single-VPS SaaS—**your own server's public IP address**.

## The fix: make validation part of `reqwest`'s DNS resolver

The clean fix in Rust is to implement `reqwest::dns::Resolve` directly (this is `PolicyResolver` in Service Monitor's `monitor-server/src/probe.rs`).

Because `reqwest` hands the hostname to your resolver and dials *only* the `SocketAddr` list your resolver returns, there is no second DNS lookup and no validate-then-connect race:

```rust
use std::net::{IpAddr, SocketAddr};
use reqwest::dns::{Addrs, Name, Resolve, Resolving};

#[derive(Debug, Clone, Copy)]
struct PolicyResolver {
    allow_local_targets: bool,
}

impl Resolve for PolicyResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let allow = self.allow_local_targets;
        Box::pin(async move {
            let host = name.as_str().to_owned();
            let addrs: Vec<SocketAddr> =
                tokio::net::lookup_host((host.as_str(), 0)).await?.collect();
            validate_addrs(addrs.iter().map(SocketAddr::ip), allow)?;
            Ok(Box::new(addrs.into_iter()) as Addrs)
        })
    }
}

fn validate_addrs(
    addrs: impl IntoIterator<Item = IpAddr>,
    allow_local_targets: bool,
) -> Result<(), ResolvedLocal> {
    if allow_local_targets {
        return Ok(());
    }
    // Reject the entire answer if ANY record is local or private.
    if addrs.into_iter().any(is_local) {
        return Err(ResolvedLocal);
    }
    Ok(())
}
```

Then wire three layers together on the `reqwest::Client`:

1. **URL-layer check at registration and per redirect hop:** Only allow `http` and `https` schemes, and reject IP literals in blocked ranges immediately.
2. **Custom redirect policy (`reqwest::redirect::Policy::custom`):** Either disable redirects completely for webhooks (often the safest default for Durable Runner handlers) or cap hops (e.g. `MAX_REDIRECT_HOPS = 5`) and re-run the scheme + IP-literal check on every hop—while `PolicyResolver` automatically guards every redirected hostname's DNS lookup.
3. **Full IANA special-purpose IPv4 and IPv6 blocklists:** Unwrap embedded IPv4 forms (`::ffff:0:0/96`, NAT64 `64:ff9b::/96`, 6to4 `2002::/16`) first and check them against the IPv4 blocklist (`0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `224.0.0.0/4`, `240.0.0.0/4`, plus documentation/benchmarking blocks). Also block your own host's public IP if internal services or Caddy listen on it.

## Prove the guard actually fails when removed

SSRF defenses rot easily when someone constructs a second `reqwest::Client::new()` for a new webhook path and forgets to attach `PolicyResolver`.

In our repos, every SSRF rule has an explicit attack test—loopback literal, `::ffff:127.0.0.1`, link-local metadata `169.254.169.254`, mixed public+private DNS answer, and a `302` redirect to `127.0.0.1`—verified with the same mutation check we wrote about in [How we proved our security attack tests actually fail when protections are removed](@/posts/proving-security-attack-tests-fail-with-mutation-harness.md).

## Frequently asked questions

**Does `reqwest`'s custom `Resolve` run when the URL is a raw IP address like `http://127.0.0.1/`?**
No—`reqwest` skips DNS resolution for IP literals and dials them directly. That is why you must keep *both* layers: URL-level literal checking (at registration and inside your custom redirect policy) *plus* `PolicyResolver` for domain names.

**Why reject the whole DNS response if only one of two IPs is private?**
Because an HTTP client can fall back to the second address if the first one times out or refuses the connection. A legitimate public webhook endpoint has no reason to publish `10.0.0.1` or `127.0.0.1` in public DNS.
