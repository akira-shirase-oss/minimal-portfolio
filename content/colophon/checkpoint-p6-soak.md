+++
title = "Checkpoint P6: the soak kept teaching"
description = "The 24-hour soak failed, and kept failing usefully: a 12-hour session expiry, a zero-error gate that made deliberate drills unpassable, a vacuous first verdict, a scenario bug hiding 240k phantom failures, a shell ARG_MAX crash, and a jq type crash — then v5: 628,813 requests with every failure inside an announced drill window. The gate holds."
date = 2026-11-11T16:30:00Z

[extra]
kind = "release"
milestone = "P6"
step = "24h soak"
short_title = "Soak failures, three fixes, honest gates"
tests = 0

[extra.summary]
goal = "Prove the mixed scenario holds for 24 hours — reads, writes, publishing, and deliberate dependency drills — and commit the evidence either way."
built = "session re-auth on 401 (the 12h absolute expiry fix), the soak sidecar with machine-readable drill windows, the L05FAIL console-stamp gate with an unlogged-failure failsafe, and a fault-suite guard that refuses to race a running dev server."
proof = ["24h soak: 19.9M requests, every latency gate passed, 867,613 L05 errors — evidence committed, not rerun away", "root cause: dev accounts' absolute 12h sessions; mixed.js now re-authenticates (34 mid-run re-auths, 0 stale refills, 0 torn pages)", "v2b gate was vacuous (per-VU state) — replaced with console stamps; v3 then caught the pinned-entry scenario bug and an ARG_MAX crash; v4 caught a jq type bug and a warmup anomaly", "v5 HELD: 628,813 requests, 5 drills, 3,296 failed assertions all inside announced windows, 0 outside, 0 stale, 0 torn, every latency gate inside bound", "the v4 warmup anomaly is recorded unexplained — stamps now name the failing check"]
code = "akira-shirase-oss/colophon-cms · main @ 918773a"
+++

The soak was supposed to be the easy part — point the scenario at a day, read the
gates. It turned into the most instructive failure of the project so far.

## Failure one: the 12-hour wall

The November 9 soak ran 19.9M requests and every latency gate passed — but L05
ended with 867,613 errors. The runner log showed why: the dev accounts carry a
twelve-hour *absolute* session lifetime, and the second half of the run collected
401s. `mixed.js` now re-authenticates on 401 once per attempt, counts the
re-auths as evidence (`l05_reauths`), and the sidecar expires every live session
on a schedule so the path is exercised deliberately. The failed run is committed
as evidence — per the workspace rule, a miss is data.

## Failure two: a gate that couldn't pass

The 1h validation proved the re-auth fix (34 re-auths, zero stale refills, zero
torn pages, all 106k write read-backs verified) — and failed anyway, because a
binary `no_errors` gate makes a run with deliberate dependency drills unpassable
by construction. A `docker pause postgres` *must* produce refusals. So
`soak-sidecar.sh` now writes machine-readable windows per completed drill, and
the gate means "zero failures outside the announced windows" — inside is
evidence, not an excuse. The postgres pause's ~90 s of pool refusals after
resume stays in the record as an open resilience question.

## Failure three: the gate that passed anyway

The first drill-aware run (v2b) reported `held: true` — and was worthless:
`error_buckets` came back empty while 867 assertions had failed. The bucket
object lived in per-VU module state, which never reaches k6's `handleSummary`;
each VU is its own JS runtime, tagged sub-metrics need thresholds to exist, and
file writes are init-only. Verified all three live on k6 v2.3.0, then replaced
the mechanism: every failed assertion stamps `L05FAIL <epoch_s>` on k6's
console, `load.sh` tees the stream and splits the stamps against the windows —
with a failsafe that counts unlogged failures as *outside*. Re-validated on a
90 s drill: 4,409 failures split 2,361 in / 2,048 out of a deliberately tight
window, exact reconciliation.

The honest lesson: a gate that can't observe its evidence is worse than no gate
— it manufactures certainty. The v3 rerun of the same hour is the proof the
machinery now works end-to-end.

## What the working machinery then found

v3's gate failed honestly, twice over: 320,724 stamps proved the split was no
longer vacuous — and exposed a **scenario** bug (the pinned-entry read asked
generation 1 of random entries; only the first 100 live there) plus a shell bug
(the epochs hit macOS's ARG_MAX as one jq argv). v4's fixed scenario cut
failures 98.5% and surfaced a third harness bug (`--rawfile` hands jq a string,
`reduce` crashed) — and a real anomaly: 1,497 failures in the run's first two
minutes, before any drill, that a warm-server diagnostic could not reproduce.

**v5 — the answer.** 628,813 requests under a real drill rotation (valkey and
postgres pauses every five minutes): **3,296 failed assertions, every one inside
an announced window, zero outside**, stamps reconciling exactly with the
scenario's own counter, zero server warnings outside windows, zero stale
refills, zero torn pages, and every latency gate inside its bound. The gate
held. The v4 warmup anomaly stays on record as unexplained — and the stamps now
carry the failing check's name, so if it returns it will tell us what it was.
