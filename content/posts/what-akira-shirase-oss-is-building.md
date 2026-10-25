+++
title = "What I'm building at Akira Shirase OSS, and the cycle every step goes through"
description = "A CMS that can prove what it published, an uptime monitor that never fakes a green light, and one loop for every step: plan, build, prove, write it up, ship."
date = 2026-10-25T19:00:00Z
+++

Most portfolios show finished things. This one shows the work while it's happening, including the parts that break.

**Akira Shirase OSS** is where that work lives: an open-source organization on GitHub, with this site as its logbook. Here's what's being built, and the routine every piece goes through before it shows up here.

## Three rules

1. **Proof over features.** Something counts when its failures are tested and its numbers can be reproduced, not when its screen exists.
2. **Honest status.** Every page says what's done, what's planned and what's parked. "Unknown" is an allowed answer. "Fine" without evidence isn't.
3. **Useful first.** Each project needs at least one real user, starting with me.

## What's being built

**[Colophon CMS](@/colophon/_index.md)** is the main project. It's a content management system: the place where you write, review and publish a website's articles. It makes four promises:

- Kill it at any moment and nothing is lost.
- Every bug comes with a seed number that replays it exactly.
- You can see the whole site as it was at any release.
- "Published" only means published; the site update shows as pending until it's actually seen.

Rust on the server, Svelte for the editor, PostgreSQL as the only source of truth. Right now it's a written plan with a name and a logo: design is done, and the foundation (P0) is next. The plan is public at [akira-shirase-oss/colophon-cms](https://github.com/akira-shirase-oss/colophon-cms).

**[Service Monitor](@/service-monitor/_index.md)** keeps an eye on websites and tells you, honestly, when something breaks. It's in its third milestone ("remembering"), at checkpoint 2.8 with 441 tests, and it says "unknown" instead of guessing.

**[Teaching an AI Rust](@/posts/i-made-an-ai-read-the-rust-book.md)** was the groundwork: Claude Code studied the whole Rust Book, then took exams it couldn't see in advance. Final exam: 59/59. The knowledge base it built now guides the Rust in Colophon.

The common thread is software that tells the truth about its own state. The monitor won't show green without a real check. The CMS won't say "published" until the page is seen. Colophon may reuse proven pieces of Service Monitor later, but it doesn't wait for them.

## The cycle every step goes through

Every checkpoint in a build log goes around the same loop:

1. **Plan one small step.** Write down what it should do for a person, the rule that must stay true, how it can fail, and the test that proves it.
2. **Build it on a branch,** pairing with Claude Code. The risky parts get a line-by-line human review: database changes, sign-in, publishing, anything that talks to an outside service.
3. **Prove it.** Run the tests, including the failure cases. Measure real numbers. If it can't be shown, it doesn't count yet.
4. **Write it up here,** always under the same headings: what I built, how it works, does it actually work, where I messed up, what it doesn't do yet, up next.
5. **Merge and publish.** The site is built on my machine with the same Zola version as the preview and uploaded as-is, so what goes live is exactly what I checked.
6. **Move "up next".** The build log's faded steps always show what's ahead, and each disappears once its entry is published.

## The milestones

**Colophon CMS**, each milestone named after what it proves:

| | Milestone | Proves |
|---|---|---|
| D | design | The scope is cut, the plan is written, every decision has a reason |
| P0 | foundation | Pinned tools, a clean workspace, and editor output that Rust can verify |
| P1 | never lose an edit | Saves can't silently overwrite each other; projects can't see each other |
| P2 | publish exactly once | One reviewed change becomes one release, even if a process dies halfway |
| P3 | prove it reached the site | Caching can't serve the wrong thing; every publish has a receipt |
| P4 | time travel | Any release can be viewed and rolled back; uploads are safe |
| P5 | safe automation | Scripts and AI agents help without ever skipping review |
| P6 | running on its own | Backups, a real restore, a 24-hour stress test, version 0.1 |

**Service Monitor:** M0 one check · M1 checking on repeat · M2 remembering · M3 alerts · M4 a real dashboard · M5 running on its own.

## Where AI fits

Claude Code writes a lot of the code with me, and these build logs say so. Three limits keep that honest: the risky parts get read line by line, every number in a post is checked rather than remembered, and AI is never the selling point. The selling point is software that can prove it works.

If you want to follow along, [the build logs](@/colophon/_index.md) are the place, and the [RSS feed](/rss.xml) carries every post in full.
