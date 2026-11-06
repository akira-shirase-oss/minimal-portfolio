+++
title = "Checkpoint 7.2: a real login for the dashboard"
description = "The token gate kept the admin token in localStorage and sent it on every call. Now the dashboard trades it once for an HttpOnly session cookie — expiring server-side, logout that actually kills the row, and CSRF rules the middleware enforces."
date = 2026-11-06T14:30:00Z

[extra]
kind = "experiment"
milestone = "M7"
step = "7.2"
short_title = "Dashboard login"
tests = 137

[extra.summary]
goal = "A login UX for the dashboard — without weakening the API's authorization contract or the CLI's."
built = "POST /api/login exchanges SMON_ADMIN_TOKEN for a sessions row (migration 0007) + smon_session cookie (HttpOnly, SameSite=Strict, SMON_SESSION_TTL_S default 12h); POST /api/logout deletes the row and expires the cookie; store-side expires_at is the authority; CSRF: Origin must match Host for any credential and is mandatory on cookie-authed writes; bearer kept unchanged for CLI; LoginGate + nav Sign out; e2e runs the real auth path."
proof = ["live drill: wrong token 401 → right token 204+HttpOnly cookie → GET 200 → POST 403 (no Origin) → 403 (evil Origin) → 201 (matching) → logout → 401 with 0 rows left in sessions", "store lifecycle + 7 API session tests + auth unit matrix + Playwright sign-in spec; all 16 e2e specs now run the real auth path"]
code = "akira-shirase-oss/monitoring-service · main @ 825110a"
+++

The deferred "logging in" gap — done as a session the store owns, not a
cookie the browser trusts.

**Gap:** the dashboard's auth was a token pasted into localStorage and echoed
on every request — a long-lived credential parked in the most exposed storage
a browser has, with no expiry, no revocation, and no way to sign out that a
server compromise couldn't keep using.

**What changed:** `POST /api/login` verifies the admin token through the same
digest-compare the middleware always used, writes a `sessions` row (migration
0007), and answers `Set-Cookie: smon_session=<id>; HttpOnly; SameSite=Strict;
Path=/; Max-Age=<ttl>`. The cookie is just a handle — the row's `expires_at`
(`SMON_SESSION_TTL_S`, default 12 h) is the authority, checked on every
request and deleted on sight when expired, so a stolen cookie dies on the
server's clock, not the thief's patience. `POST /api/logout` deletes the row
*and* expires the cookie — sign-out is a server-side fact, not a client-side
suggestion. The retention tick sweeps strays. Bearer stays exactly as it was:
the CLI and scripts need no Origin, no cookie, no new contract.

The CSRF rules live in the middleware, not the login handler: an `Origin`
header that doesn't match `Host` (host:port — the authority the browser
actually dialed) is rejected for **any** credential, and a cookie-authed
mutation must send Origin at all — browsers always do on writes, so its
absence means the request isn't a browser. Failures stay honest in both
directions: a wrong token gets a fixed ~300 ms delay plus 401 (no lockout
state to enumerate), while a session-store failure answers 503 — masquerading
a broken store as "wrong credential" would be a lie. And with no admin token
configured — dev mode — login answers 404 `auth_disabled`, because there is
no credential to exchange.

On the dashboard side, `TokenGate` became `LoginGate`: the token is posted
once, never stored, and the gate shows the server's own error words. `apiFetch`
carries `credentials: 'same-origin'` and nothing else — no header to set, no
secret to leak. Sign out sits in the nav; it's idempotent, so it can render
unconditionally.

**Proof:** store lifecycle tests (create → valid → expire-on-sight → sweep →
delete); 7 API session tests covering cookie flags, the full Origin matrix
(missing/wrong/matching × cookie/bearer), logout, and a ttl=0 session that's
dead on arrival; auth unit tests for the origin and cookie parsers. The
Playwright suite grew a sign-in spec — refused token shows an error, right
token loads the board, Sign out returns to the gate — and the *entire* e2e
suite now runs the real auth path: the server boots with `SMON_ADMIN_TOKEN`,
each spec logs in via `/api/login` and the page carries the cookie. Live
drill on the wire: 401 → 204 + HttpOnly cookie → GET 200 → POST 403 without
Origin → 403 with an evil Origin → 201 with a matching one → logout → 401,
with zero rows left in `sessions`.

**Lesson:** the hard part of "add a login page" was deciding where trust
lives. Putting expiry in the database instead of the cookie means the
browser's copy is decorative — the server can revoke, expire, and audit
without asking the client's permission. Session UX is mostly a database
invariant wearing a form.
