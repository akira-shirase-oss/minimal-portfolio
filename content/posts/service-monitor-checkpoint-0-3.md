+++
title = "Checkpoint 0.3: 127.0.0.1 has a lot of disguises"
description = "Stopping a monitor from being turned against your own network, using address ranges from IANA instead of memory, and three attacks the tests had to catch."
date = 2026-10-14T12:30:00Z

[extra]
# experiment, failure or release
kind = "experiment"
+++

Part of [the Service Monitor build log](@/service-monitor.md). Previous: [Checkpoint 0.2](@/posts/service-monitor-checkpoint-0-2.md).

Every one of these means "this machine":

- `http://127.0.0.1/`
- `http://2130706433/`
- `http://0x7f.1/`
- `http://127.1/`
- `http://0177.0.0.1/`
- `http://[::ffff:127.0.0.1]/`
- `http://[64:ff9b::7f00:1]/`

A monitor fetches whatever URL you give it. That makes it a door into the network it runs on. The classic target is `169.254.169.254`, the cloud metadata service, which will happily hand out credentials to anything that asks from inside. This attack has a name: **SSRF**, server-side request forgery.

This checkpoint is the first lock on that door.

## Two questions, two layers

**What does the URL say?** `TargetUrl` accepts only `http` and `https`, with no user name or password, no `#fragment`, no secret-looking query parameters such as `token`, and at most 2,048 characters. Secrets belong in a header, not in a URL that ends up in logs.

**Where may it go?** `NetworkPolicy` allows only addresses that are reachable on the public internet, on ports 80 and 443.

The URL library does a lot of the work. It normalizes all of the IPv4 disguises above to plain `127.0.0.1` *before* our policy looks, so there's one canonical address to judge.

## Not from memory

"Which addresses are private?" sounds like something everyone knows. It isn't a short list. So the blocked ranges come straight from IANA's official special-purpose address registries, fetched the same day: 26 IPv4 entries and 25 IPv6 entries, each marked whether it's globally reachable.

Each table line keeps the registry's own text next to the numbers:

```rust
v4(169, 254, 0, 0, 16, "169.254.0.0/16", "link-local, incl. cloud metadata"),
```

A test parses that text and checks it matches the numbers. Mistype a prefix and the build fails.

## The IPv6 tricks

- **An allow-list, not a block-list.** For IPv6 we only allow global unicast (`2000::/3`), minus the special blocks inside it. Anything unassigned is refused automatically.
- **NAT64:** `64:ff9b::7f00:1` is `127.0.0.1` wearing an IPv6 costume. Some networks use these addresses legitimately to reach IPv4 sites, so instead of blocking the whole range, we look at the IPv4 address inside it and judge *that*.
- **Mapped addresses:** Rust's standard library says `::ffff:127.0.0.1` is *not* loopback until you call `to_canonical()` on it. We do that first.

## The one exception

For local testing there's a dev profile that allows **exactly** `127.0.0.1` on one chosen port. That's not `::1`, not `127.0.0.2`, and not the mapped spelling. Only the command line can switch it on, never the API.

## Do the tests have teeth?

I broke the three defences an attacker would go after, one at a time:

- **Skip the check for IP addresses written in the URL:** 3 tests failed.
- **Remove the IPv4-mapped canonicalization:** 1 test failed. The address was *still blocked*, by a backstop entry for mapped addresses. Only the test that checks the exact reason noticed. Two layers, and the tests can see both.
- **Shrink the metadata range from `/16` to `/32`:** 5 tests failed.

Then I put the original back and compared it byte for byte.

## Meanwhile, I broke this website

When I published the first build-log posts, both deploy runs went green, and every post on this site turned into a 404.

GitHub Pages was still set to "deploy from a branch". So every push started two deploys: my Zola build, and GitHub's old default build, which renders the README. They race. The first time, mine finished 3 seconds later and won. This time, theirs finished 10 seconds later.

Lesson: a green workflow isn't a working site. Check the live pages after every push, because a race that went your way once is still a race.

The fix: this site now lives on Cloudflare Pages. I build it on my own machine with the same Zola version I preview with, and upload exactly that. There's one deploy, and it's the one I checked.

## The honest part

- This is **layer 1**. Domain names are resolved by DNS, and every address that comes back gets checked in Checkpoint 0.5. A name that resolves to a *mix* of public and private addresses will be rejected outright, since that's a classic DNS-rebinding trick.
- An app-level check is not a firewall. The plan also calls for network egress rules as a second boundary.

## Numbers

- **35** tests (15 new), **0** clippy warnings.
- **3/3** deliberate security regressions caught.

Next: a Rust test server that can fail on purpose (Checkpoint 0.4).
