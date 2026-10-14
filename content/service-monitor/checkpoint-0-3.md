+++
title = "Checkpoint 0.3: 127.0.0.1 has a lot of disguises"
description = "How I stopped my monitor from being tricked into poking around a private network, and three attacks the tests had to catch."
date = 2026-10-14T12:30:00Z
aliases = ["/posts/service-monitor-checkpoint-0-3/"]

[extra]
# experiment, failure or release
kind = "experiment"
milestone = "M0"
step = "0.3"
short_title = "127.0.0.1 has a lot of disguises"

[extra.summary]
goal = "Stop the monitor from being tricked into reaching your private network."
built = "An address checker, plus a list of off-limits addresses taken from the official registry."
proof = ["35 tests", "3/3 attacks caught", "0 warnings"]
code = "6d549d1"
+++

Every one of these means "this computer":

- `http://127.0.0.1/`
- `http://2130706433/`
- `http://0x7f.1/`
- `http://127.1/`
- `http://0177.0.0.1/`
- `http://[::ffff:127.0.0.1]/`
- `http://[64:ff9b::7f00:1]/`

A monitor visits whatever address you give it. That makes it a bit like a delivery driver who'll go to any address on the label. Handy, until someone writes the address of your private office on it.

The classic target is `169.254.169.254`, a special address inside cloud servers that hands out passwords to anything asking from the inside. This trick even has a name: SSRF.

This checkpoint is the first lock on that door.

## What I built

Two checks:

- **Is the address safe to write down?** Only `http` and `https`. No username or password in it. Nothing that looks like a secret, such as `?token=`. At most 2,048 characters. Secrets belong in a separate header, not in an address that ends up in logs.
- **Is it safe to go there?** Only addresses on the public internet, on the normal web ports (80 and 443).

Good news: the library that reads web addresses turns all those disguises into plain `127.0.0.1` *before* my check even looks. One address to judge, not seven.

## Not from memory

"Which addresses are private?" sounds like common knowledge. It's a surprisingly long list.

So I took it straight from the official registry (IANA) the same day: 26 special IPv4 ranges and 25 IPv6 ranges, each marked whether it's reachable from the public internet. A test checks every line of my list against the registry's own text, so a typo breaks the build.

## The sneaky IPv6 ones

- **For IPv6, I flipped it around.** Instead of listing what's banned, only the normal public range is allowed. Anything new or unusual is refused by default.
- **`64:ff9b::7f00:1` is `127.0.0.1` wearing an IPv6 costume.** Some networks use these addresses legitimately to reach older ones, so I don't ban them all. I look at the address inside and judge that.
- **Rust's own check says `::ffff:127.0.0.1` is *not* "this computer"** until you convert it. So I convert first, every time.

## The one exception

For testing on my laptop, there's a developer mode that allows **exactly** `127.0.0.1` on one chosen port. Not `::1`, not `127.0.0.2`. And only the command line can switch it on, never the web API.

## Does it actually work?

I broke the three defences an attacker would go after, one at a time:

- **Skipped the check for addresses written as numbers:** 3 tests failed.
- **Removed the step that converts the IPv6 costume:** 1 test failed. The interesting part: the address was *still blocked*, by a backup rule. Only the test that checks the exact reason noticed. Two layers, and the tests can see both.
- **Shrank the cloud-password range:** 5 tests failed.

Then I put the original code back and compared it byte for byte.

## Where I messed up: I broke this website

When I first published this build log, every deploy said "success", and every post on this site turned into "404 not found".

The old hosting ran two competing deploys on every update, and the wrong one happened to finish last.

Lesson: a green checkmark isn't a working site. Open the page.

The fix: this site now lives on Cloudflare Pages. I build it on my own machine and upload exactly that, so there's one deploy, and it's the one I checked.

## What it doesn't do yet

- This is the first layer. Names like `example.com` get turned into addresses later, and every one of those addresses gets checked too (Checkpoint 0.5). A name that points to a mix of public and private addresses will be refused outright, because that's a known trick.
- An app checking addresses isn't a firewall. The plan adds network rules as a second layer later.
