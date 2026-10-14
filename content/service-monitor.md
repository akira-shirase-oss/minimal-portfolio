+++
title = "Service Monitor: the build log"
description = "A self-hosted HTTP monitor in Rust that never shows green without evidence. Built in the open, one tested checkpoint at a time."
date = 2026-10-14
+++

**Service Monitor** watches the health URLs of your services. When repeated checks fail, you get one alert with the evidence. When they recover, you get one recovery alert. It's the first infrastructure piece of a bigger plan: tools for running AI applications reliably.

I'm building it in Rust with Claude Code, and writing up every checkpoint here, including what went wrong.

## The rules it lives by

- **Never green without evidence.** A missed check is a *gap*, shown as unknown. It's never counted as a pass.
- **One check = one attempt.** No hidden retries, no catch-up bursts after downtime.
- **Everything is bounded:** time, queues, retries, memory and disk.
- **All of the logic is Rust,** with ownership as the architecture: each piece of state has one owner, shared config is immutable, and resources are released by `Drop`.
- **Measure, then claim.** No performance numbers until a 24-hour soak test backs them.

## The plan

- **M0 · one check:** a single bounded HTTP check, tested against four kinds of failure. *In progress.*
- **M1 · bounded loop:** repeated checks, cancellation, no overlap.
- **M2 · durable state:** SQLite, incidents that survive a restart.
- **M3 · alerts:** a signed webhook, then email.
- **M4 · usable product:** dashboard, maintenance windows, public status page.
- **M5 · independent operation:** separate status host, backups, a 24-hour soak test.

## Checkpoints

- **Day 0:** [Before writing my Rust monitor, I read the libraries' source. It found 4 traps.](@/posts/service-monitor-read-the-source-first.md)
- **0.1:** [Deleting a retry path at compile time](@/posts/service-monitor-checkpoint-0-1.md). The scaffold. 0 clippy warnings.
- **0.2:** [Rust types that can't hold bad data](@/posts/service-monitor-checkpoint-0-2.md). 20 tests, 2/2 deliberate breakages caught.
- **0.3:** [127.0.0.1 has a lot of disguises](@/posts/service-monitor-checkpoint-0-3.md). The URL safety policy. 35 tests, 3/3 attacks caught.
- **0.4:** A Rust test server that fails on purpose. *Next.*

## Status

Early. Nothing here is production-ready, and no claims about speed or memory are made until the soak test runs.
