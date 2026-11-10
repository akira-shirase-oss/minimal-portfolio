# 404human: portfolio and blog

A text-only portfolio and blog built with [Zola](https://www.getzola.org) 0.23.6, a single program (installed at `~/.local/bin/zola`) that turns Markdown files into a plain, fast website. There's no theme and no tracking. The only JavaScript is a small script in `templates/base.html` for the light/dark toggle, which remembers the reader's choice and otherwise follows their system setting. The look is a calm "job log": monospace labels, a blinking cursor after the name, a pulsing "running" dot, and a reading bar on posts. Blinking and pulsing switch off for readers who turn motion off. The site also makes `sitemap.xml`, `robots.txt` and an RSS feed (`rss.xml`) automatically.

## Write a new post

1. Create a file in `content/posts/`, for example `content/posts/my-next-post.md`. The file name becomes the link: `/posts/my-next-post/`.
2. Start it with this header, then write the post in Markdown:

   ```
   +++
   title = "Your title"
   description = "One line that shows under the title and in link previews on X."
   date = 2026-10-20
   draft = true

   [extra]
   kind = "experiment"
   +++

   Your first paragraph...
   ```

3. Set `kind` to `experiment`, `failure` or `release`. It shows as a coloured tag (rust, red or green) next to the title. Leave the `[extra]` lines out for no tag.
4. Delete the `draft = true` line when it's ready to go live. Drafts only show up when you preview with `zola serve --drafts`.

Code blocks get colours when you name the language, e.g. ```` ```rust ````. A typo in the language name stops the build, so you'll see it straight away.

## How posts should sound

Human first, casual and easy to read. The Rust Book post is the model.

- **Open with a human moment, not the technology:** "You can't test a smoke alarm without smoke."
- **Explain every technical term in everyday words the first time,** or leave it out. An analogy beats jargon (a bouncer at the door, a delivery driver).
- **Keep paragraphs short:** 1 to 3 sentences, one idea each.
- **Show code only when it's the point,** keep it short, and say in plain words what it does.
- **Keep numbers exact and caveats honest.** Say "I", and a little humour is welcome.
- **Build-log entries use these headings, in order:** What I built · How it works (the short version) · Does it actually work? · Where I messed up · What it doesn't do yet · Up next.

## Learning chapters and the blog

`/learn/` lists ordered learning tracks. The first is **Model engineering from the
beginning**, under `content/learn/model-engineering/`. Its chapter index is
`_index.md`, its full plan is `roadmap.md`, and its first worked explanation is
`weights-predictions-and-loss.md`. `templates/learn.html`, `learning-track.html`,
and `learning-page.html` use the existing site style. Navigation, the home page,
`llms.txt`, the sitemap, and the dated-page RSS feed include the new material.

- **Chapters** explain a concept in order, with plain definitions, small worked
  numbers, code when useful, sources, and exercises. Explain every mathematical
  symbol. Put exercise answers in `<details>` so readers can predict first.
- **Blog posts** in `content/posts/` tell the personal story: what was confusing,
  what was tried, what happened, and what the evidence supports. Link to the
  chapter for the full explanation instead of duplicating it.
- **Status is literal.** A written chapter is not a completed experiment or a
  passed understanding check. Planned experiments stay labelled. Never invent a
  training run, failure, benchmark, user experience, or result to fill a post.
  Cite actual code revisions and stored evidence when a lab has run.
- **Keep revision material current.** The user requested ongoing portfolio notes
  for revision. At meaningful lesson milestones, update the covered explanations,
  a quick revision summary, exercises, the roadmap, and relevant cross-links.
  Add dated blog updates or reflections when useful. Keep individual learner
  answers and assessment history in the private local checkpoint. Use `updated`
  dates for revised pages and publish through the existing Wrangler CLI workflow.

Chapter 3, `our-first-training-loop.md`, keeps the first executable one-weight
example as text, code, and recorded results. The user requested removing the
interactive section: do not add the canvas lab, its controls, or its client
script back without a new request. The small local trainer lives in the separate
`model-engineering/labs/` learning folder; the chapter includes a runnable copy.

As of 2026-11-07 the learning route is project-based: build small working pieces,
inspect real outputs/failures, and explain concepts in context. Chapter 9 records
the first local Qwen tool-use slice. Numbered topics are references, not a rigid
quiz prerequisite chain. The public site remains text and code; the local runner
is not a new client-side website feature.

The 2026-11-09 agreement makes topics 4–8 the next sequence: learning failures,
data, a tiny language model, resumable training, and adapting an existing model.
The assistant implements experiments and handles calculations; explanations focus
on what each part does, why it matters, and what actual results show. Deep math
derivations are optional. Revisit broader harness work after this pass. Keep the
portfolio updated as lessons happen: explanations, small examples, relevant code,
recorded results, and quick revision summaries. A new plan does not complete a
chapter or justify inventing an experiment. The roadmap and track index record
the current sequence; individual learner answers stay in the private checkpoint.

Chapter 4 now records its first synthetic overfitting comparison. Run
`node tools/compare-overfitting.mjs` to fit a line and an interpolating curve to
the same fixed observations. It saves `perf/results/first-overfitting-comparison.json`
with source/data identity and per-case results, refusing to overwrite the first
record. `node tools/compare-underfitting.mjs` adds a fitted constant-time model
using the same data and unchanged earlier comparison evidence. Its first result
is protected too; an optional result-path argument supports later distinct runs.
`node tools/compare-training-stability.mjs` compares learning rates 0.1, 0.25,
and 0.3 using an unchanged snapshot of the earlier one-weight trainer. It records
steady loss reduction, repeated bouncing, and growing loss. Like the underfitting
runner, it accepts a fresh result path for a later run without overwriting the
first trace. Chapter 4 now has examples of underfitting, overfitting, and unstable
updates. These are small mathematical examples, not neural-network or Qwen
training. Data preparation is the next topic.

Chapter 5 now has its first synthetic labeled-data audit. Run
`node tools/audit-training-data.mjs` to inspect the ten fixed support messages in
`perf/fixtures/support-intent-v1.json`. It preserves retained records, duplicate
relationships, and review reasons in `perf/results/first-training-data-audit.json`.
Pass a fresh result path to record a later run without overwriting the first.
The audit itself does not train a model or create a data split. The following
lesson adds a split demonstration; broader human review and coverage remain work
to revisit throughout the model builds.

The 2026-11-10 split lesson is a separate run: `node tools/compare-data-splits.mjs`
uses a fixed fixture derived from the retained audit examples. It creates three
partitions of distinct messages, preserves excluded copies, and compares leaky and
separate validation views using one unchanged exact-message lookup. Its test
partition is evaluated once; it is a teaching fixture, not an independent final
benchmark. The original audit and missing/conflicting records are not changed.
Recorded outputs are in `perf/results/first-data-split-comparison.json`. Pass a
fresh result path for later runs. Chapter 5 now introduces the three data roles
and duplicate leakage; broader data review continues alongside later builds.

Chapter 6 begins with text preparation. `node tools/inspect-text-tokens.mjs`
uses `tools/character-tokenizer.mjs` and the fixed `tiny-text-tokens-v1.json`
fixture to build a training-only character vocabulary, round-trip text, and
prepare next-token targets within each document. It records and preserves an
unknown-character failure rather than changing the vocabulary from a probe.
The first result is `perf/results/first-text-tokenization.json`; pass a fresh
result path for later runs. This is tokenization and target preparation, not
predictive-model training or generation.

The next chapter-6 piece, `node tools/inspect-next-token-probabilities.mjs`, fits
an exact-prefix count model using those training documents. It records raw
counts, probabilities, greedy and fixed-draw choices, an unseen-prefix abstention,
and a separate hypothetical comparison of probability-sensitive losses. Results
are in `perf/results/first-next-token-probabilities.json`; use a fresh path for
later runs. This predictor fits counts and performs inference; neural weights,
held-out quality measurement, and a full generation loop remain ahead.

`node tools/inspect-score-update.mjs` adds one real parameter update for the
fixed prefix `cat `. Eight free scores start at zero; softmax turns them into
probabilities, and one full-batch gradient step uses both observed continuations.
It preserves before/after scores, probabilities, gradients and mean training loss
in `perf/results/first-next-token-score-update.json`. Pass a fresh path for later
runs. This updates parameters for one context; neural context processing, learned
representations, held-out quality and a full text model remain ahead.

To add a chapter, create a Markdown page inside the track with `date`, `weight`
(reading order), and `[extra]` fields `kind = "chapter"`, `chapter = <number>`,
and an honest `status`. Add its `page = "@/learn/<track>/<file>.md"` link to the
matching entry in `_index.md`'s `extra.chapters`. Entries with no `page` are
shown as **planned**, with no dead links. Update the roadmap when the plan
changes. The page template derives previous/next links from available chapter
numbers, so the roadmap does not become chapter zero.

A new track is a subfolder of `content/learn/` with its own `_index.md`, `weight`,
`sort_by = "weight"`, `template = "learning-track.html"`, and
`page_template = "learning-page.html"`. Supply `extra.status`, `extra.roadmap`,
and `extra.chapters` as in the first track. It appears on the Learning index and
home page automatically. Keep future chapters as index entries until there is
real material to write.

## Add a build-log entry (Colophon CMS, Service Monitor, jsrt)

There are three build logs: `content/colophon/` (the main project: milestones D, then P0–P7 with the lettered R, M, W, E + DX in build order), `content/service-monitor/` (M0–M7) and `content/js-runtime/` (M0–M7, roadmap complete). Entries live in their log's folder, not in `posts/`. The home page draws one panel per log, in the order of `logs` in `content/_index.md`, each with its latest 3 entries; the terminal's `tail` line shows the newest entry of any log. `/colophon/`, `/service-monitor/` and `/js-runtime/` group every entry under its milestone. Previous/next links and the "Service Monitor build log › M0 · 0.4" line above the title are added automatically.

**A new build log** is a folder with an `_index.md` using `template = "series.html"` and `page_template = "series-page.html"` (copy `content/colophon/_index.md`), plus a line in `logs` and a `[[extra.now]]` block with `log = "<folder>/_index.md"` in `content/_index.md`. Give its milestone IDs colours in `static/style.css` (the `.m-…` rules), and set `track_columns` when it has more than six milestones.

The Colophon and js-runtime entries follow the same steps below, in `content/colophon/` and `content/js-runtime/`, with `milestone = "P0"` / `"M7"` and so on.

1. Create `content/service-monitor/checkpoint-0-4.md` with this header:

   ```
   +++
   title = "Checkpoint 0.4: Your title"
   description = "One line for the subtitle and link previews."
   date = 2026-10-15T12:00:00Z

   [extra]
   kind = "experiment"
   milestone = "M0"
   step = "0.4"
   short_title = "Your title"
   # Rust tests in the workspace at this checkpoint (drawn as the home page's sparkline).
   tests = 49
   +++
   ```

   The time in `date` keeps entries from the same day in order. It isn't shown. `tests` is
   the real count from that checkpoint's test run; leave it out for an entry with no code.
2. In `content/service-monitor/_index.md`, move `up_next` to the checkpoint after this one (or delete the line when nothing is in progress). A new milestone only needs a line in `milestones`. The `[[extra.planned]]` tables at the end list what's still ahead, shown faded under each milestone: a step disappears from the page by itself once its entry is published or while it's `up_next`, so the list only changes when a plan changes. Steps of a milestone that isn't planned yet have no `step` and show as "planned"; give them numbers when that milestone's checkpoints are agreed.
3. Publish as below.

## How the site looks, and why (the "control room")

Redesigned on 2026-10-15: the home page draws the work like a small control room.
(A colourful variant borrowing from another portfolio was tried the same day and
reverted at Akira's request: "keep your interactive version, without the reference".)

- **Every number on the home page comes from the posts**, never typed in: the status
  rows, the build-log strip (one bar per entry; hover or focus names it in the readout),
  the milestone track and the test sparkline (`tests` in each entry).
  `templates/partials/log-panel.html` draws the strip, track and sparkline, on the home
  page and on the build log's own page.
- **Words you can edit** are in `content/_index.md`: the intro (the headline types itself
  after `$ whoami`), `now` (the status rows) and `projects`.
- **Motion and JavaScript are extras.** `static/site.js` (under 4 KB) types the headline,
  ticks the clock and fills the strip's readout. With JavaScript off, or with "reduce
  motion" on, every page is complete and still.
- **Checked in headless Chrome** at 390 and 1280 px, light and dark: no sideways scroll,
  rows and labels on one baseline (measured 0.00 px).

## Preview on your computer

The homepage's Running now, Projects, and Numbers tables keep their columns on
desktop and become labelled rows at widths of 680px or less. The same values are
rendered once, with no JavaScript needed for this layout. Real column headers
remain available to assistive technology. Other wide tables scroll within the
page; their first column is no longer pinned over neighbouring text.

```
cd ~/Desktop/Learning/akira-shirase-oss/minimal-portfolio
zola serve
```

Open http://127.0.0.1:1111. The page reloads by itself every time you save a file. Press Ctrl+C to stop.

## Edit the portfolio

All in `content/_index.md`:

- **Intro:** the text under the `+++` header at the bottom of the file.
- **Now:** the `now = [ … ]` list. Each line shows with a green "running" status.
- **Projects:** one `[[extra.projects]]` block per project, newest first. Copy a block to add one:

  ```
  [[extra.projects]]
  name = "Project name"
  about = "One line on what it does."
  link = "https://…"   # or "@/posts/<file>.md" for one of your posts; leave out for no link
  year = 2026
  status = "shipped"   # one or two words: live, shipped, in progress, write-up…
  ```

Elsewhere:

- **Writing** (the post list) fills itself from `content/posts/`, newest first.
- **Contact links** (X, GitHub, email): the `[extra]` part of `zola.toml`. The Contact section only appears once at least one is filled in.
- **Site name, description and author:** the top of `zola.toml`.
- **Colours, fonts and spacing:** `static/style.css`.

## Search engines, link previews and AI assistants

Most of this runs by itself on every build:

- **Structured data.** Every page carries a small JSON-LD block (`templates/partials/json-ld.html`) saying who writes here, what the page is (a post, the build log, the home page), when it was written and where it sits (breadcrumbs). Google and AI answer engines read it to credit and date posts correctly.
- **`/llms.txt`**, a plain-text guide to the site for AI assistants: what the site is, every post with its one-line description, and the main pages. Zola builds it like a feed (`feed_filenames` in `zola.toml`, template `templates/llms.txt`), so a new post shows up in it automatically.
- **Sitemap and feed.** `/sitemap.xml` dates every page (`templates/sitemap.xml`); the RSS feed carries every post in full.
- **One address.** Every page names its address on 404human.dev as the canonical one, and `static/_headers` tells search engines not to index the copies on `www.` and `pages.dev`.
- **Link previews.** One card for every page: `static/img/social-card.jpg` (1,200 × 630). Its text is described in `card_alt` in `zola.toml`.
  A post can have its own card: write it as a 1,200 × 630 HTML page in `art/cards/<slug>.html`, render it with
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot=card.png file://$PWD/art/cards/<slug>.html`,
  convert it with `sips -s format jpeg -s formatOptions 88 card.png --out static/img/cards/<slug>.jpg`, and set
  `card = "img/cards/<slug>.jpg"` and `card_alt` under the post's `[extra]`.
- **Telling search engines about a new page.** `static/88793c8c28db63d8c932b12a31586101.txt` is the site's
  [IndexNow](https://www.indexnow.org) key (Bing, Yandex and others; Google reads `sitemap.xml` instead). After
  deploying a new post, send its address:
  `curl -s -o /dev/null -w '%{http_code}\n' "https://api.indexnow.org/indexnow?url=https://404human.dev/posts/<slug>/&key=88793c8c28db63d8c932b12a31586101"`
  (200 or 202 means it was accepted).

Three things are done by hand:

- **Pictures.** Every picture the site serves (the avatar, the 404 scene, the link-preview card, the favicons) comes from `art/desk-source.jpg`. After changing that picture or the card's words, run `python3 tools/make_images.py` (it needs Pillow and the Noto Sans fonts), check the results, and commit them.
- **Pictures in posts.** Give every `<img>` its `width`, `height` and `alt`, plus `loading="lazy" decoding="async"` unless it's at the very top of the post: the page then never jumps while pictures load, and pictures further down only load when someone scrolls to them.
- **Old addresses.** If a page moves, give it `aliases = ["/old/address/"]` in its front matter *and* add the old address to `static/_redirects`, so it answers with a real permanent redirect (301) instead of Zola's redirect page.

`static/_headers` also sets caching: a year for the stylesheet and script (their links change whenever their content does), a month for pictures and icons.

## Publishing

The site lives at **https://404human.dev/** (also `www.404human.dev`), on Cloudflare Pages (project `akira-shirase-oss`, whose own address https://akira-shirase-oss.pages.dev/ serves the same site). The source is the `main` branch of https://github.com/akira-shirase-oss/minimal-portfolio. Pushing to GitHub does **not** publish anything: the site is built here with Zola 0.23.6 (the same version as the local preview) and uploaded with Cloudflare's `wrangler` CLI, so what goes live is exactly what you checked.

To publish a new post:

```
git add -A
git commit -m "Add post: <title>"
git push
zola build
wrangler pages deploy public --project-name akira-shirase-oss --branch main --commit-hash "$(git rev-parse HEAD)" --commit-message "$(git log -1 --format=%s)"
```

The upload takes a few seconds, then open the page on https://404human.dev/ to check it's live.

One-time setup on a new machine: `npm install -g wrangler@4.148.0`, then `wrangler login`. The project already exists. Don't pass `--force` to any command: it was only needed once, to create the project as a classic Pages project.

The site moved here from GitHub Pages on 2026-10-14. GitHub Pages started two competing deploys on every push, and the wrong one won.
