+++
title = "Checkpoint 2.2: management writes that can't lose a probe"
description = "PATCH/DELETE revalidate and bump generation atomically — an in-flight probe under the old generation is dropped as stale, and a monitor with evidence refuses to be deleted."
date = 2026-11-05T16:10:00Z

[extra]
kind = "experiment"
milestone = "M2"
step = "2.2"
short_title = "Generation-guarded writes"
tests = 61

[extra.summary]
goal = "Edit, pause and delete monitors without ever letting a stale in-flight probe write evidence under old config."
built = "PATCH/DELETE revalidate the merged monitor through create's rules and bump generation in the same UPDATE — stale observations drop on commit; DELETE is a conditional statement that refuses once evidence exists (D-008, D-009)."
proof = ["a_stale_observation_after_edit_is_dropped + patch/delete edge tests in tests/api.rs", "live: edit/pause/unpause bumped generation 2→3→4; stale-generation PATCH → conflict; delete-with-history → conflict"]
code = "akira-shirase-oss/monitoring-service · main @ eec162a"
+++

**What changed:** management writes became real. `PATCH`/`DELETE` revalidate
the merged monitor through the same rules as create, then bump `generation`
in the same UPDATE — an in-flight probe claimed under the old generation is
dropped as stale at commit. Edit and invalidation are **one committed fact**
(D-009): there is no moment where new config is live but old probes still
count.

And a monitor with recorded checks or incidents can't be deleted at all
(D-008): evidence isn't erasable through an API call. `DELETE` is a single
conditional statement that refuses once history exists — pause is the answer
the API hands back in the refusal message.

**Proof:** `a_stale_observation_after_edit_is_dropped` plus the patch/delete
edge tests in `tests/api.rs`. Live: CLI `edit`/`pause`/`unpause` bumped
generation 2→3→4, a stale-generation PATCH returned `conflict`, and
delete-with-history returned `conflict`.
