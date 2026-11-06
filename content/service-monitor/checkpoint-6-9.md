+++
title = "Checkpoint 6.9: exit codes a script can trust"
description = "A documented contract — 0 success, 1 API error, 2 usage, 3 unreachable, 4 unauthorized — pinned by tests that spawn the real binary against a stub server."
date = 2026-11-06T12:54:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.9"
short_title = "CLI exit codes"
tests = 113

[extra.summary]
goal = "Let automation branch on the failure class — 'server down' is not 'server refused'."
built = "main() returns ExitCode: 0 success, 1 API/application error, 2 usage, 3 unreachable, 4 unauthorized; send() maps no-HTTP-response vs HTTP rejection; empty edit is a client-side usage error."
proof = ["tests/exit_codes.rs spawns the real monitor binary against a pure-std TCP stub server: bad subcommand, empty edit, closed port, 401, 409, and both success paths — 7 cases"]
code = "akira-shirase-oss/monitoring-service · main @ c932a64"
+++

Ninth slice — the audit item that was never audited.

**Gap:** `main() -> Result` meant every failure exited 1 — to a script, "server
down" was indistinguishable from "server refused" and from "you typed it
wrong".

**What changed:** `main` returns `ExitCode` with a documented contract — `0`
success, `1` API/application error, `2` usage error, `3` unreachable, `4`
unauthorized. The load-bearing distinction lives in `send()`: no HTTP response
is a different failure class than an HTTP rejection. An empty `monitors edit`
is a usage error caught client-side (exit 2), not a round-tripped no-op (exit
1). Results go to stdout, errors to stderr — never mixed.

**Proof:** `tests/exit_codes.rs` spawns the real `monitor` binary
(`CARGO_BIN_EXE_monitor`) against a pure-std TCP stub server — no dev-deps —
covering a bad subcommand, an empty edit, a closed port, a 401, a 409, and the
two success paths. The contract is pinned end-to-end, not asserted from inside.
