+++
title = "How we proved our security attack tests fail when protections are removed"
description = "Two reviews caught security tests passing with protections deleted. Here is the 8-point mutation-proof harness standard we use across seven repos."
date = 2026-11-23T09:45:00-05:00

[taxonomies]
tags = ["security", "reliability", "rust"]

[extra]
kind = "experiment"
+++

You can't test a smoke alarm without smoke. You also can't trust a security test suite that has never been watched fail when its protection is turned off.

On 2026-11-20, two independent white-hat reviews across our repositories caught **security attack suites that stayed green even when the defense was completely deleted**. The tests looked thorough on paper, and every single one had a subtle flaw:

- Asserting "any 4xx status" when an oversized body was rejected by a router limit before the auth check even ran.
- Counting a connection timeout or `EOF` as "request blocked."
- Replaying a token that had never been issued (so it failed as "unknown" instead of "replayed").
- Writing an assertion that could never evaluate to false.

That is why we built a **mutation-proof harness** across our seven Rust repositories (and documented the standard after surveying all seven scripts on 2026-11-21).

## What a mutation proof actually does

For every attack test in the repo—auth bypass, cross-tenant IDOR, SSRF, replay, rate-limit spoofing, body caps—the proof script applies a targeted **mutant** that weakens or removes that specific protection, runs the target attack test, and requires it to **fail at the exact protection assertion**.

If the test still passes with the defense removed, the test is broken and CI goes red.

## The 8-point mutation-proof standard

Surveying seven repos' first attempts at mutation scripts uncovered a surprising number of ways a proof script itself can lie—or wreck a developer's working tree. Every proof harness in this workspace now enforces eight rules:

1. **Run unmutated green first.** Before injecting any mutant, run the target test against clean code and require it to pass.
2. **Pin the failure to the decisive assertion.** A mutant that fails to compile, breaks setup, or prevents the server from booting is **INCONCLUSIVE**, not a kill. We check that the *target* test ran and failed at the protection's own assertion (using `.expect` sidecars pinning `file:line`, as in [Service Monitor](@/service-monitor/_index.md)).
3. **Never mutate the working tree (or refuse a dirty tree).** Twice in one day, a `git checkout` restore wiped uncommitted work. Even better: copy the repo to a scratch directory and mutate only the scratch copy.
4. **Watch file mtimes on restore.** If you ever restore a file in place, `cp -a` or `cp -p` preserves the old mtime—so `cargo` skips rebuilding and later runs execute the *last mutant*! A restored file must always be newer than any built binary.
5. **Refuse zero mutants and unknown selectors.** A typo in a filter flag (`--only srf` instead of `ssrf`) must exit non-zero, never report "0 mutants, all passed."
6. **Validate every shell value before arithmetic or word-splitting.** (See [Bash `(( ))` arithmetic code injection](@/posts/bash-arithmetic-code-injection.md).)
7. **Compile mutants with `-D warnings`.** Keep mutant builds strict so dead-code or unused-variable shortcuts don't mask what changed.
8. **Enumerate every attack test.** CI lists every attack test in the suite and requires either a matching mutant or an explicit written exemption.

## Never let a mutant reach a commit

On 2026-11-21, [Durable Runner](@/durable-runner/_index.md) accidentally committed a `// MUTANT:` line into its server source, and no unit test happened to hit that branch. Mutating only a scratch copy prevents that locally, and a CI guard now rejects any `MUTANT:` or `// MUTANT` marker anywhere under `crates/*/src` or `src/`.

## What an honest attack assertion looks like

Instead of checking `status.is_client_error()`, every attack test asserts three things:

1. **Exact HTTP status** (e.g. `403 Forbidden`, not `400` or `404`).
2. **Exact machine-readable error code** (e.g. `error.code == "tenant_mismatch"`).
3. **Post-attack state re-read from storage** (confirming the ledger, row count, or audit log did not change).

That way, when you delete the tenant check or replay guard in a mutant, there is only one reason the test goes red—and you have proof the test is actually guarding the door.
