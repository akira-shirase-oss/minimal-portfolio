+++
title = "Checkpoint 6.5: the check strip"
description = "One cell per committed check, plus dashed gap cells for slots with no evidence — a paused window renders as a hole, never interpolated green."
date = 2026-11-06T12:42:00Z

[extra]
kind = "experiment"
milestone = "M6"
step = "6.5"
short_title = "Check strip"
tests = 101

[extra.summary]
goal = "An at-a-glance evidence timeline per monitor — not a vibe, a picture of what was actually observed."
built = "CheckStrip: one cell per committed check colored by outcome (pass=green, failing=red, missed/unknown=grey) plus dashed gap cells for slot-grid positions with no evidence."
proof = ["the pause-gap spec pauses a monitor mid-run over real scheduled slots; the resumed strip shows the hole exactly where evidence is absent"]
code = "akira-shirase-oss/monitoring-service · main @ 686c430"
+++

Fifth slice — the first visualization.

**Gap:** checks rendered as rows; there was no at-a-glance timeline.

**What changed:** `CheckStrip` sits above the detail page's check rows — one
cell per committed check, colored by outcome (pass=green, failing=red,
missed/unknown=grey), plus **dashed gap cells** for slot-grid positions with no
evidence. Missing observations render as holes, never interpolated green — the
strip is an evidence visualization, not a vibe. The cell model is a pure
TypeScript function so the DOM mapping is the only thing the browser test has
to believe.

**Proof:** the pause-gap spec pauses a monitor mid-run over real scheduled
slots, resumes it, and asserts the strip shows a gap cell exactly where
evidence is absent — a hole in the data renders as a hole in the picture.
