+++
title = "Checkpoint 6.1: certificate classification"
description = "TLS failures now say which certificate problem they saw — expired, not yet valid, name mismatch, untrusted — committed as check detail, not flattened to 'connect'."
date = 2026-11-06T12:30:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.1"
short_title = "Certificate classification"
tests = 93

[extra.summary]
goal = "Say which certificate failure a probe saw, instead of flattening every TLS error to 'connect'."
built = "cert_expired / cert_not_yet_valid / cert_name_mismatch / cert_untrusted / tls as committed check detail, via a deterministic webpki-roots rustls ClientConfig plus ProbePolicy::extra_roots for internal CAs."
proof = ["rcgen fixtures over a real rustls server cover all four classes plus a trusted chain", "live: expired.badssl.com → cert_expired; a wrong-host endpoint → cert_name_mismatch"]
code = "akira-shirase-oss/monitoring-service · main @ a6ba677"
+++

M6 was not a planned milestone — it was an audit of the retired monitor's
20-post build log against the rebuild, logged in `docs/GAPS.md`. This is the
first of eleven gaps closed, each with the same discipline: the gap, the
decision that mattered, the proof.

**Gap:** the old monitor said *which* certificate failure it saw; the rebuild
flattened everything to `connect` — the least useful alert text there is.

**What changed:** TLS errors now classify into `cert_expired`,
`cert_not_yet_valid`, `cert_name_mismatch`, `cert_untrusted`, or generic `tls`
as committed check detail. The deeper fix was the trust config itself: reqwest
on macOS delegates verification to Security.framework, which returns opaque OS
status codes — the rich `CertificateError` variants are destroyed before the
classifier sees them. So the monitor builds its own rustls `ClientConfig` on
**webpki-roots**: deterministic on every OS, and honest in a specific way — the
monitor reports what *public* clients see, and a corporate root can't quietly
mask a real failure. For operators with internal CAs,
`ProbePolicy::extra_roots` trusts what they explicitly add, nothing else.

**Proof:** rcgen fixtures over a real rustls server cover all four classes plus
a trusted chain; live drill — `expired.badssl.com` committed `cert_expired`, a
wrong-host endpoint committed `cert_name_mismatch`.

**Lesson:** the verifier is part of the contract. Switching off the platform
verifier wasn't just about better error strings — it makes classification
deterministic across OSes and stops a local root store from silently rewriting
what "trusted" means.
