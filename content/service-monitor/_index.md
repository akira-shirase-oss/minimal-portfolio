+++
title = "Service Monitor: the build log"
description = "A monitor that keeps an eye on your websites and tells you, honestly, when something breaks. Written in Rust, built in the open, one tested step at a time."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "in progress"
# How lists elsewhere on the site name this build log.
short_title = "Service Monitor"
# The roadmap, in build order. Each entry in this folder says which milestone it belongs
# to (`milestone`), its step label (`step`) and a short title for lists (`short_title`).
milestones = [
  { id = "M0", name = "one check", about = "A single check, tested against four kinds of failure." },
  { id = "M1", name = "checking on repeat", about = "Checks every minute with no overlaps, watches a real Node.js app under load, gets its first dashboard, and takes turns so it never piles onto a struggling site." },
  { id = "M2", name = "remembering", about = "Saves everything, so a restart never loses track of an outage." },
  { id = "M3", name = "alerts", about = "Tells you when something breaks: first by webhook, then by email." },
  { id = "M4", name = "a real dashboard", about = "A dashboard, maintenance windows and a public status page." },
  { id = "M5", name = "running on its own", about = "Its own server, backups, and a 24-hour stress test." },
]
# The checkpoint being built right now (shown as "next" in its milestone).
up_next = { milestone = "M2", step = "2.5", title = "Restarts that don't lie" }

# What's still ahead, shown faded under each milestone. A step leaves this list on
# its own once its entry is published (or while it's `up_next`). Steps get numbers
# when their milestone is planned; until then they show as "planned".
# (Arrays of tables last: a bare key after them would belong to the last one.)
[[extra.planned]]
milestone = "M2"
step = "2.6"
title = "Keeping a week, summing up the rest"

[[extra.planned]]
milestone = "M2"
step = "2.7"
title = "Disk limits and backups"

[[extra.planned]]
milestone = "M2"
step = "2.8"
title = "Telling certificate problems apart"

[[extra.planned]]
milestone = "M3"
title = "Every alert saved with its incident"

[[extra.planned]]
milestone = "M3"
title = "Signed webhooks"

[[extra.planned]]
milestone = "M3"
title = "One email adapter"

[[extra.planned]]
milestone = "M3"
title = "Retries that know when to stop"

[[extra.planned]]
milestone = "M3"
title = "Testing a channel before you need it"

[[extra.planned]]
milestone = "M4"
title = "Logging in"

[[extra.planned]]
milestone = "M4"
title = "Adding and editing monitors from the dashboard"

[[extra.planned]]
milestone = "M4"
title = "Maintenance windows"

[[extra.planned]]
milestone = "M4"
title = "A public status page"

[[extra.planned]]
milestone = "M5"
title = "A status page that lives somewhere else"

[[extra.planned]]
milestone = "M5"
title = "Upgrades and rollbacks"

[[extra.planned]]
milestone = "M5"
title = "A 24-hour stress test"

[[extra.planned]]
milestone = "M5"
title = "A first real pilot"
+++

**Service Monitor** keeps an eye on your websites and services. Every minute, it checks that they answer properly. When one stops answering, you get one alert, with the evidence. When it's back, you get one "all good". No alert storms.

It's the first piece of a bigger plan: tools that make AI apps easier to run, and easier to fix when they break.

I'm building it in Rust with Claude Code, and writing up every step here, including the mistakes.

## The rules it lives by

- **No green without proof.** If it didn't check, it says "unknown", never "fine".
- **One check, one try.** No hidden retries that hide problems or pile onto a struggling service.
- **Everything has a limit:** time, retries, memory and disk.
- **Written in Rust,** where every piece of data has exactly one owner and things clean up after themselves.
- **No bragging without numbers.** No speed or memory claims until a 24-hour test backs them up.

Early days: nothing here is production-ready yet.
