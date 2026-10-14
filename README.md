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

## Preview on your computer

```
cd ~/Desktop/learning/blog
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

## Publishing

The site lives at https://akira-shirase-oss.pages.dev/ on Cloudflare Pages (project `akira-shirase-oss`). The source is the `main` branch of https://github.com/akira-shirase-oss/minimal-portfolio. Pushing to GitHub does **not** publish anything: the site is built here with Zola 0.23.6 (the same version as the local preview) and uploaded with Cloudflare's `wrangler` CLI, so what goes live is exactly what you checked.

To publish a new post:

```
git add -A
git commit -m "Add post: <title>"
git push
zola build
wrangler pages deploy public --project-name akira-shirase-oss --branch main --commit-hash "$(git rev-parse HEAD)" --commit-message "$(git log -1 --format=%s)"
```

The upload takes a few seconds, then open the page on https://akira-shirase-oss.pages.dev/ to check it's live.

One-time setup on a new machine: `npm install -g wrangler@4.148.0`, then `wrangler login`. The project already exists. Don't pass `--force` to any command: it was only needed once, to create the project as a classic Pages project.

The site moved here from GitHub Pages on 2026-10-14. GitHub Pages started two competing deploys on every push, and the wrong one won.
