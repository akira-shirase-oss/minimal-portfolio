+++
title = "Checkpoint P6: the soak kept teaching"
description = "The 24-hour soak failed, and kept failing usefully: a 12-hour session expiry the scenario didn't survive, a zero-error gate that made deliberate drills unpassable, and a drill-aware gate whose first verdict was vacuous because k6 VUs can't talk to handleSummary. Three harness bugs found and fixed; the product's postgres-pause refusals stay honestly open."
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
proof = ["24h soak: 19.9M requests, every latency gate passed, 867,613 L05 errors — evidence committed, not rerun away", "root cause: dev accounts' absolute 12h sessions; mixed.js now re-authenticates (34 mid-run re-auths, 0 stale refills, 0 torn pages)", "1h validation: 1.28M requests, all three drill types fired — pool refusals inside the postgres-pause window recorded, not hidden", "v2b gate was vacuous: buckets lived in per-VU state k6 never surfaces — replaced with console stamps; re-validated 4,409 failures split exactly in/out of a window", "postgres pause still refuses ~90s past resume: product resilience finding stays open, not tuned away"]
code = "akira-shirase-oss/colophon-cms · main @ 8b490cd"
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
