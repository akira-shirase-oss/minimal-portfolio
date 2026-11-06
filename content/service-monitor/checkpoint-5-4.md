+++
title = "Checkpoint 5.4: a release that was actually installed"
description = "Fresh-prefix install drill passed end to end — migrations, livez/readyz/version, dashboard, auth — with README and RUNBOOK rewritten to what the system actually is."
date = 2026-11-06T02:30:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.4"
short_title = "Release"
tests = 88

[extra.summary]
goal = "Another developer installs it, gets a useful alert, and can distinguish a target outage from missing monitoring data — the ship gate."
built = "Installable artifact + docs: fresh-prefix install drill (migrations → /livez /readyz /version → dashboard → auth); GET /version reports the binary's own version; README rewritten; RUNBOOK verify steps check /version; e2e gate fixed for config-less playwright runs."
proof = ["install drill: fresh prefix → migrations ran → livez+readyz+version answered → dashboard served → auth held (401/200)", "4/4 browser specs on the fixed gate"]
code = "akira-shirase-oss/monitoring-service · main @ 2cf5e53"
+++

**What changed:** `scripts/deploy.sh` → `releases/<sha>/bin` + `current`
symlink, `data/` outside releases — run on a fresh prefix end to end:
migrations ran, `/livez` `/readyz` `/version` answered, the dashboard served,
auth held (401/200). `GET /version` reports the binary's own version — the
only honest answer after an upgrade or rollback. README rewritten to what the
system actually is (it still said "scaffold"); the RUNBOOK's verify steps now
check `/version`. The e2e gate was fixed to run config-less so a fresh
checkout can prove itself.

**Proof:** the install drill passed on a clean prefix, and 4/4 browser specs
ran on the fixed gate. That closes the ship gate: another developer can
install it, get a useful alert, and distinguish a target outage from missing
monitoring data.
