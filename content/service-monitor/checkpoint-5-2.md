+++
title = "Checkpoint 5.2: the SSRF guard, finished where it has to live"
description = "PolicyResolver validates every DNS answer inside reqwest's resolver — the dialer only ever sees validated addresses, one local address fails the whole answer, redirects revalidate per hop."
date = 2026-11-06T02:10:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.2"
short_title = "SSRF complete"
tests = 88

[extra.summary]
goal = "No path from a public probe to a private address — validated at the layer that can't be raced."
built = "PolicyResolver inside reqwest's DNS resolution: every address in the OS answer must be public (SMON_PROFILE=lab opts out); redirects followed ≤5 hops, each revalidated through URL-layer policy; DNS refusal classifies rejected_local via a cause-chain walk."
proof = ["unit: is_local full-range matrix incl. v4-mapped v6, validate_addrs mixed answer, real localhost refusal", "live: localhost-as-name → transport/rejected_local; redirect chain → pass/200; loop → http_fail/302"]
code = "akira-shirase-oss/monitoring-service · main @ 33656f5"
+++

**What changed:** the DNS layer was the real work. `PolicyResolver` hooks
reqwest's own resolver, so every address in the OS answer is validated *and
reqwest only ever dials the validated set*. That closes the classic
check-then-resolve-again hole — there is no second resolution to race (no
TOCTOU). One private address in the answer fails the whole thing:
round-robin DNS makes "usually public" no defense. Redirects are now
followed — up to 5 hops, each revalidated through the same policy — because a
redirect is a target the target chose. A refused or looping hop leaves the
last 3xx as `http_fail` evidence. And a DNS refusal classifies
`rejected_local` via a cause-chain walk, not an ambiguous `connect`.

**Proof — live:** `http://localhost:…` registers fine (it looks like a name),
then every probe lands `transport` + `rejected_local` — the refusal is
committed evidence, not a silent skip. A redirect chain → `pass`, a loop →
`http_fail/302`. Unit-side: the `is_local` range matrix including v4-mapped
v6, mixed-answer `validate_addrs`, and a real `localhost` refusal.
