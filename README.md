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

## Add a build-log entry (Colophon CMS, Service Monitor)

There are two build logs: `content/colophon/` (the main project: milestones D, then P0–P6) and `content/service-monitor/` (M0–M5). Entries live in their log's folder, not in `posts/`. The home page draws one panel per log, in the order of `logs` in `content/_index.md`, each with its latest 3 entries; the terminal's `tail` line shows the newest entry of any log. `/colophon/` and `/service-monitor/` group every entry under its milestone. Previous/next links and the "Service Monitor build log › M0 · 0.4" line above the title are added automatically.

**A new build log** is a folder with an `_index.md` using `template = "series.html"` and `page_template = "series-page.html"` (copy `content/colophon/_index.md`), plus a line in `logs` and a `[[extra.now]]` block with `log = "<folder>/_index.md"` in `content/_index.md`. Give its milestone IDs colours in `static/style.css` (the `.m-…` rules), and set `track_columns` when it has more than six milestones.

The Colophon entries follow the same steps below, in `content/colophon/`, with `milestone = "P0"` and so on.

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
