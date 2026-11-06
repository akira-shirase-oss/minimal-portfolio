+++
title = "Checkpoint 3.2: the checked host is the connected host"
description = "The escape suite found a real hole before it ran a single test: url_authority ended the authority only at '/', so http://evil.com\\@granted.com/ checked 'granted.com' while reqwest connected to evil.com. Authority now ends at / \\ ? # and both sides normalize before compare."
date = 2026-11-07T23:59:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.2"
short_title = "The escape suite"
tests = 59

[extra.summary]
goal = "Adversarial coverage of every documented bypass — the checked thing is always the real thing."
built = "url_authority ends at / \\ ? # and normalizes (case, trailing DNS dot, IPv6 brackets); grants parse host | host:port | [v6] | [v6]:port | bare v6; unparseable grants never match."
proof = ["http://evil.com\\@127.0.0.1:PORT/ refuses with the real destination named: exit 7, '127.0.0.1:80'", "file:// fetch refused — scheme gate fails closed", "userinfo, ?-smuggle, #-smuggle, case, trailing dot, IPv6 — all unit-pinned", "garbage grants never match — fail closed at the grant side too"]
code = "akira-shirase-oss (local, not yet pushed) · f82f97e"
+++

The escape suite's job is to find what the parser got wrong — and it found
a real one before the first test ran, just by reading `url_authority` and
asking what `reqwest` would do with the same string.

**The hole:** `url_authority` ended the authority component only at `/`.
But WHATWG URL parsing — which is what reqwest's `url` crate implements —
treats `\` as a delimiter for special schemes too. So
`http://evil.com\@granted.com/` split two ways: our checker saw the
authority as `evil.com\@granted.com`, took the last `@` segment, checked
`granted.com` — and allowed it. Reqwest parsed the same bytes, stopped at
the backslash, and connected to `evil.com`. The check said yes to a
destination the connection never visits. That is exactly the shape every
SSRF-by-parser-divergence bug has: two parsers, two answers, one allowed.

Same class of bug, two more doors: `?` and `#` also end the authority.
`http://evil.com?@granted.com/` put the granted name in the *query* — our
parser kept reading to the `@` and checked `granted.com`.

**The fix is boring on purpose:** end the authority at the first of
`/ \ ? #`, strip userinfo at the last `@` *within that span*, then
normalize — lowercase, trailing DNS dot dropped, IPv6 brackets off — so
`HTTP://GRANTED.COM.` and `granted.com` compare as the same host. Grants
got their own parser: `host`, `host:port`, `[v6]`, `[v6]:port`, or a bare
multi-colon IPv6; anything else never matches. Fail closed on both sides.

**The test that almost lied:** the end-to-end pin initially passed a URL
*without* the backslash — JS string literals eat `\@` into plain `@`, so
the script fetched a genuinely granted userinfo URL and "proved" nothing.
One more level of escaping fixed it (`\\\\` in Rust → `\\` in source →
`\` in the string), and the test now refuses with the real destination
named in the error: `127.0.0.1:80`, not the granted `:PORT`.

**Lesson:** when a security check parses differently than the client it
guards, the check is not a check — it's a hope. The fix isn't a stricter
parser; it's making the checker's parse *agree* with the client's. Any
divergence you can't eliminate is one you must fail closed on.
