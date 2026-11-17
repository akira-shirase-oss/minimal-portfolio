+++
title = "Personal Voice Agent: the build log"
description = "A push-to-talk voice assistant for the Mac that keeps what it heard, what it guessed and what it did as three separate records, and can't act in your name without asking. On-device speech and model, a Rust session service, nothing sent off the machine. Built in the open."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "first release built, not shippable: four review rounds, the last merge not yet reviewed; live mic drills owed"
short_title = "Voice Agent"
# The project's own roadmap (docs/ROADMAP.md). Its first release is V0–V2 as one unit (D-012),
# so this log treats it as one milestone.
milestones = [
  { id = "V0–V2", name = "first release", about = "The spine (a pure session domain and a crash-safe turn ledger), push-to-talk audio with a turn-fenced player, and an on-device conversation, with everything a machine can check proven and the live microphone drills still owed." },
  { id = "V3", name = "memory and personal voice", about = "Memory you can review, trace to its source and delete, and a personal-voice profile gated on consent and a usage-rights review." },
  { id = "V4", name = "controlled tools", about = "One reversible local tool, then reviewed external actions that name their recipient and leave an audit record." },
]
up_next = { milestone = "V0–V2", step = "drills", title = "A review of the last merge, then the live microphone drills" }
+++

**Personal Voice Agent** is a voice assistant that learns how you talk without taking actions in your
name that you didn't approve. You hold Space on a Mac, talk, and it answers out loud.

Three things are kept apart on purpose: what it **heard** (the transcript), what it **inferred** (the
model's draft reply) and what it **executed** (anything it actually did). In the first release the
third list is always empty, because there are no tools yet. Speaking or sending something on your
behalf is a separate permission, and it's closed.

Everything runs on the Mac: Apple's on-device speech recognition, language model and voice, plus a
small Rust service that owns the conversation, its deadlines and the record of each turn. No cloud
provider, no API keys, no stored audio.

## Where it stands

Started on 2026-11-16. The first release (V0–V2) is built and its automated checks pass. It is **not
usable yet**. Four independent review rounds and their fixes closed the crash, microphone, disk and
revocation findings; the last merge hasn't been reviewed. The completion-claim guard now has a held-out
score: 7% of claims get no disclosure, all of them in answers to plain questions. The live microphone
drills need a person, the model misses its speed budget, and the million-unit runs haven't run.

The code is public at
[akira-shirase-oss/personal-voice-agent](https://github.com/akira-shirase-oss/personal-voice-agent).
