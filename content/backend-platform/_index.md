+++
title = "Backend Platform: the build log"
description = "A self-hosted control plane for small apps, in the Appwrite and Supabase direction, assembled from proven components: deployment, identity, data, files, jobs and diagnostics. Provisioning is reconciled, apps outlive the control plane, and upgrade, restore and export are drills. Parked as a future horizon. Rust, built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "parked (future horizon); B0 built, review says fix the spine first — its own memo recommends staying parked"
short_title = "Backend Platform"
# The milestones from the project's docs/ROADMAP.md.
milestones = [
  { id = "B0", name = "evidence memo and spine", about = "A memo that asks whether a platform is even the right answer, the engineering spine with CI, a fake provider, the partial-provisioning drill and the first load scenario." },
  { id = "B1", name = "control plane core", about = "The control database, project and environment lifecycle, per-project principals, envelope-encrypted secrets." },
  { id = "B2", name = "reconciled provisioning", about = "A lease-claimed worker and the starter's adapters: a database and role, a bucket with quotas." },
  { id = "B3", name = "starter deployment", about = "Digest-pinned release manifests and a rootless container runtime." },
  { id = "B4", name = "jobs and diagnostics", about = "One background job on the app's own database, and an OpenTelemetry collector with diagnosis views." },
  { id = "B5", name = "operate", about = "Upgrades, secret rotation, backup, restore and export, as tested drills." },
  { id = "B6", name = "load and isolation evidence", about = "A million control-API requests and a million app-facing requests, with isolation measured." },
  { id = "B7", name = "external validation and ship gate", about = "Three independent teams run the operations script." },
]
up_next = { milestone = "B0", step = "B0", title = "Fix the review's findings and correct the memo, then a decision; quiet-machine load runs owed" }
+++

**Backend Platform** is a self-hosted backend for one organization's small apps: deployment,
identity, data, files, background jobs and diagnostics behind one developer experience, built from
proven components rather than rewritten infrastructure. The point is to make small apps easier to
*run*, not just quicker to start.

What it is not: a shared login service for the other products here. They keep their own accounts and
databases on purpose, so one outage can't take all of them down.

## Where it stands

**Parked, as a future horizon.** On 2026-11-16 development started on every planned project, so the
first milestone, B0, was built: the engineering spine with CI, a drill for half-finished provisioning,
the first load scenario, and an evidence memo. The memo's answer, written from today's measurements,
is to **stay parked** and meet the need with a copyable starter template instead. Nothing past B0
starts unless that changes.

An independent review accepted the memo with corrections and sent the spine back to fix first: the
server's database role could get around the append-only event log, and two duplicate paths weren't
covered by the drill. Both load smokes ran on a busy laptop, missed their thresholds and are kept as
evidence. A quiet-machine baseline and the million-request run are owed.

The code is public at
[akira-shirase-oss/backend-platform](https://github.com/akira-shirase-oss/backend-platform).
