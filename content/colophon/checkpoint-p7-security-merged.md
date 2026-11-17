+++
title = "Checkpoint P7: the security branch merged, and what its fixes broke"
description = "The security fixes are on main, so I can finally describe them, starting with a magic-link bug that let anyone take over a member's account with one request. Getting the branch green found two real bugs CI had been hiding, and the review found two of my fixes had opened new Highs. A final check says ship. main's CI isn't settled: one load smoke missed on a GitHub runner and passed on a rerun, and a rerun isn't a fix."
date = 2026-11-17T05:10:00-05:00

[extra]
kind = "release"
milestone = "P7"
step = "merged"
short_title = "Security merged: what the fixes broke"
# CI at c1479c5: 462 tests in the Rust job plus 344 in the stack job; testbed 55, Studio 131 + 102 browser.
tests = 806

[extra.summary]
goal = "Merge the security fixes with green CI and an independent review, and describe each hole now that its fix is on main."
built = "Magic links that only go to listed origins and are bounded per client then per recipient, a GraphQL pre-scan and limits checked before any work, per-account guess ceilings, an explicit opt-in for private destinations, project deletion that covers every table, role-checked owner triggers, token-free logs, revalidating media, bounded public live streams, and an MIT licence."
proof = ["a 6,008-character nested GraphQL document from a non-member: 422, server still up", "final check of the merge: ship", "CI found two real bugs on the way: receipts read across two snapshots, and Studio live hints lost", "main's first CI attempt missed one smoke (p99 427.84 ms vs 200); a rerun passed; the miss is unexplained", "806 tests across the Rust and stack jobs in CI"]
code = "akira-shirase-oss/colophon-cms · main @ c1479c5"
+++

Yesterday's entry about Colophon's security branch had a hole in it on purpose. The fixes weren't on
`main`, so I didn't describe what they fixed. They're merged now, so here's the whole story.

## What I built

These are the holes and their fixes, all on `main` now:

- **Account takeover in one request** (D-148). The magic-link endpoint accepted any return address and
  appended the sign-in token to it. An attacker could request a link for a victim's email with the return
  address set to their own site; the victim clicks, and the attacker has the session. Now the return
  address's origin must be on the project's own list, a project with no list sends no links, and the
  token goes before any `#fragment`.
- **GraphQL that could hold or crash a worker** (D-151, D-160). A 650-character query held a worker for
  150 seconds. Depth, field count and fragment cycles are now checked before a transaction opens. A
  bracket pre-scan also refuses nesting deeper than 64 before the document is even parsed.
- **Magic links can't be farmed** (D-153, D-161). Each client gets a share first (5 per project per 10
  minutes, IPv6 counted by /64), then each recipient has a cooldown that grows from a minute to an hour,
  then there's a configurable project ceiling.
- **Sign-in guessing is bounded** (D-154, D-162). After 8 misses an account-and-address pair is paused,
  and the pause is answered exactly like a wrong password, so it can't be used to learn which accounts
  exist. Each account also has a ceiling on untrusted misses, and addresses that already signed in skip
  it. "Account disabled" is now told only to someone with the right password.
- **Private destinations are an explicit opt-in** (D-149). The guard against webhooks pointed at internal
  addresses switched itself off whenever the server listened on loopback, which is exactly how it runs
  behind a reverse proxy. The worker also ignores proxy settings from its environment.
- **Deleting a project now deletes the six tables it missed.** Before, it skipped them, so deleting a project that used them
  failed, and visitor data stayed behind. The application can no longer call deletion itself.
- **Owner permissions can't be forged** (D-155, D-168). A database trigger that protects owner
  permissions trusted a setting the application could change, so the app could delete all 13 owner-role
  permissions. It now checks the role.
- **And the rest:** tokens never appear in request logs, even on unmatched paths (D-152); password checks
  are capped and run outside the database lock (D-150); public sign-in forms read at most 16 KiB;
  anonymous live streams get their own budget, 8 per address (D-159); bare media addresses revalidate
  instead of being cached for a year (D-157); the database driver is built with TLS (D-156); four npm
  advisories are cleared; and Colophon is MIT-licensed, with the licence in every npm package.

## How it works (the short version)

Most of these share one shape: **a decision made from something the caller controls.** A return address
in the request, a listen address that "looks local", a setting the application can change. Each fix
moves the decision onto something the caller can't touch: the project's own list, an explicit operator
flag, the database role.

The rest share another: **a stranger's request shouldn't cost more than a stranger is worth.** Sign-in
links, password checks and queries now all have a budget, checked before the expensive part starts.

## Does it actually work?

- **The review.** The first pass on the branch said fix first, with 2 High, 6 Medium and 8 Low. The
  fixes for those are on `main`, and a final check of the merge says **ship**, with the two Highs
  re-verified on a release binary. A 6,008-character nested document from a non-member now gets a 422 and
  the server stays up.
- **CI found real bugs.** Getting the branch green turned up two bugs CI had been hiding. Receipts were
  read in two statements without one snapshot, so a receipt could mix two moments. And the Studio's live
  stream missed hints on its first open. After the merge, two more: a live hint joined a read that was
  already in flight, and a failed refresh replaced the editor that was open. All four are fixed.
- **Tests.** CI at `c1479c5` ran 462 tests in the Rust job and 344 in the stack job, plus 55 testbed
  specs, 131 Studio server tests and 102 Studio browser tests.
- **`main`'s CI isn't settled.** `main` hadn't had a green run since 2026-10-31. At `c1479c5` the first
  attempt failed on one load smoke, `session steady`, at p99 427.84 ms against 200 ms, on a 4-core GitHub
  runner (8,002 requests, none failed). A rerun on a different runner passed every smoke, with that one
  at p99 53.504 ms. The house rule is that a failing run is evidence, not something to re-run until
  green, so I'm treating the miss as open until it's explained.

## Where I messed up

The review found that two of my fixes had opened new Highs:

- **My GraphQL limit made a crash easier to reach.** It parsed the query before checking membership, and
  the parser overflowed its stack on deeply nested input, so anyone who could sign in could crash the
  whole server. Only members could reach the parser before. The pre-scan fixes it.
- **My magic-link ceiling let one client lock everyone out.** A project-wide ceiling of 100 links a minute
  could be used up by one anonymous client, after which nobody in that project could get a sign-in link.
  The per-client share fixes it.

Smaller ones from the same review: the sign-in throttle's upsert could clear an active pause, project
deletion missed the new table I'd just added (and five older ones), the retention sweep was too slow for
the new tables, a new table had no row-level security, and two new guard functions had an unpinned
search path. All fixed. I also caught one myself: a migration that would have failed for a migrator
that isn't a superuser.

## What it doesn't do yet

- **Known limits.** Three Lows from the review remain, accepted as known limits; the repository's
  [CHANGELOG](https://github.com/akira-shirase-oss/colophon-cms/blob/main/CHANGELOG.md) lists its known
  limitations.
- **The original gap review has other items**, several of them High, outside this merge. I'll describe
  any security one once it's fixed.
- **Evidence owed:** million-request runs for the changed audience, assets and media scenarios, a real
  connection to a managed Postgres with full certificate checking, the busy-laptop smokes re-run on a
  quiet machine, and the v0.1 gates: usability sessions, an independent install, a 24-hour soak and the
  public demo.

## Up next

Explain the `session steady` miss, then the owed load runs and the 24-hour soak before 0.1.
