+++
title = "Checkpoint P7b: our own auth platform — magic links, no required provider, audited sign-ins"
description = "Colophon's audience auth is now self-contained in the Supabase/Convex sense: passwordless magic links beside email+password, no Keycloak or external provider required anywhere in the product, and every visitor sign-in event lands in the same audit log staff already read."
date = 2026-11-05T17:30:00Z

[extra]
kind = "release"
milestone = "P7"
step = "own-auth"
short_title = "Our own auth platform"

[extra.summary]
goal = "Make the platform's built-in authentication complete enough to run a real installation alone: passwordless sign-in for visitors, no hard dependency on Keycloak or any external identity provider, and staff-visible logs for everything the auth system does."
built = "Single-use hashed magic links (signup-by-link into a project's open role, anti-enumeration 202s, a loopback-only development mailer standing in for a real sender), a public /auth/providers endpoint so the Studio never offers a sign-in button that can only fail, CLI bootstrap for built-in accounts, and every visitor auth event audited under a shared system actor."
proof = ["6/6 database tests — single-use, supersession, expiry and project-scope proven at Postgres RLS, not around it", "4/4 black-box HTTP tests — dev-mail on/off, request→consume→gated-read, no-open-role refusal", "extended k6 smoke: 1,679 requests, 0 failures, magic_consume p99 36ms, member reads p99 ~10ms", "live smoke on the running server: request → 202 with dev_link → consume → 200 member role → spent token 403 → javascript: return_to 422", "visitor signup/signin/signout/magic-link events all asserted present in the project's /audit feed"]
code = "akira-shirase-oss/colophon-cms · main @ 80ab744"
+++

The previous checkpoint built the audience itself; this one makes the platform's auth its own product rather
than a Keycloak integration. Three seams closed:

## Passwordless, built in

`POST /audience/v1/{project}/magic-link` records a single-use, SHA-256-hashed, 15-minute link and answers the
same HTTP 202 whether or not the email has an account — enumeration is a response-level property, so both
cases look identical. `POST …/magic-link/{token}` spends it once: an existing account signs in, an unknown
email becomes a site user in the project's open self-assign role with an unusable password, and any other
outcome — used, expired, superseded, wrong project — is the same `magic_link_invalid`. Requesting a second
link retires the first, so an old link can never outlive the newest request. `return_to` must be an absolute
http(s) URL, so the link always lands on the site that asked.

There is no mail sender yet — that is the honest remaining gap. `COLOPHON_DEV_MAIL` stands in on loopback only:
it hands the link back in the response for development and demos, and the server refuses to boot with it set
on a public listener, because on a public bind it is an account-takeover switch, not a feature.

## No required provider

An installation now runs entirely on built-in accounts. `GET /auth/providers` publicly answers whether an
external provider is configured, so the Studio's sign-in card hides "Sign in with your organisation" instead
of offering a button that can only 503. `colophon admin bootstrap --issuer password --subject a@b.c` makes a
password account the first administrator — before this, the CLI demanded an issuer URL even on an install with
no provider. OIDC remains an adapter a deployment may add; it is no longer an assumption.

## Auth the staff can see

Every visitor auth event is in the project's append-only audit feed — `audience.user_signed_up`,
`.user_signed_in`, `.user_signed_out`, `.magic_link_sent`, `.magic_link_spent` — readable through the same
`/audit` endpoint staff already use. The actor is a shared `urn:colophon:system` identity (the pattern the
worker's budget events already used), because `audit_events.actor_id` references staff identities and a site
user is not one. The write runs after the auth commits, best-effort by contract: auth correctness never
depends on the log, and the log never becomes a second auth path.

And the log has a home: the Studio's new **Audience** page sits next to Members — a different credential
kind, a different page. It lists the project's site visitors (role, last sign-in, disabled state), lets a
role holder change roles or disable an account, shows the audience roles, and surfaces a "Sign-in activity"
panel that filters the same `/audit` feed to `audience.*`. Members are staff; the Audience are your readers
— the Studio now shows both.

Still open: a real mail sender for production magic links, social/OAuth providers for visitors, and
billing/subscription entitlements (deliberately deferred — roles are labels, not plans).
