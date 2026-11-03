+++
title = "Checkpoint W.0–3: websites built from content"
description = "The CMS can now build a website, not just articles: pages, a menu and a theme are ordinary content; sections come from a fixed library and styling from design tokens — no arbitrary CSS. The same pinned-release, atomic-promotion machinery that serves the blog builds and publishes the site, so the feature adds nothing to the hot path."
date = 2026-11-03T14:00:00Z

[extra]
kind = "release"
milestone = "W"
step = "builder"
short_title = "Websites built from content"

[extra.summary]
goal = "Let people compose ordinary CMS content into a website — fixed section layouts and design tokens, never arbitrary CSS — without giving up a single publishing invariant."
built = "An installable site scaffold (pages, navigation, theme types and seeded entries), a shared renderer that turns entries into safe HTML, a Look tab that renders the live draft and maps clicks back to the form, and a build adapter that emits pages at their slugs beside the articles."
proof = ["a published release builds a site where every page, menu link and colour comes from one pinned generation", "a canvas click in the Look tab opens the exact section in the form", "the full publish → build → promote round trip runs against the real server", "a million requests through the starter's API surface with no misses"]
code = "akira-shirase-oss/colophon-cms · main @ debd9b5"
+++

Since the last checkpoint the project moved lineages: the capabilities that had proved themselves on the older
branch were ported onto the newer codebase one at a time — typography floor, empty-collection deletion,
email-and-password accounts, mirrored references, import and export, locales and localization groups, and the
Studio polish — each with its own migration and tests rather than one risky merge. Then the feature that arc was
preparing for: a website builder.

## What I built

- **A site is content.** One installable scaffold adds `pages` (with a `sections` page-builder field limited to a
  fixed section library), `navigation` and `theme` collections, seeds a Home page, menu and palette, and is
  idempotent — installing it twice changes nothing. Sections are fixed kinds (hero, features, gallery, testimonial,
  FAQ, call to action): a page is data, never a layout language.
- **One renderer, every surface.** `packages/site-renderer` turns entry JSON into HTML strings: text and
  attributes are escaped, links must be `http`/`https`, answers in the FAQ go through a bounded Markdown subset,
  and styling arrives as CSS custom properties from the theme — so a strict content-security policy can forbid
  inline styles. The Studio's canvas and the plain-TypeScript build consume the same code; there is no second
  implementation to drift.
- **A Look tab, not a second editor.** Pages and the theme entry render the *live draft* in an iframe — rebuilt
  200ms after the last keystroke, zero new API calls — and clicking a section lands on its place in the form. The
  theme view is a design sheet: type, buttons and scheme rows with the stylesheet's real colour pairs checked
  against WCAG AA before a save can ship a weak pair.
- **The build is a release.** The site build reads `pages`, `navigation` and `theme` pinned to one generation —
  a menu link and the page it names can never come from different releases — emits `/{slug}/index.html` plus a
  linked `site.css`, resolves menu references to published pages only, and promotes atomically. A project with no
  site collections produces the original blog output; nothing new runs on the request path.

## Does it actually work?

- **Publish → build → promote, for real:** a Playwright spec drives install, a reviewed changeset and a publish
  against the running server, then runs the actual build and promotes it — `/` serves the first menu page,
  `/home/` sits at its slug, `site.css` carries the theme's tokens.
- **Click-to-edit is wired, not faked:** the spec clicks a rendered section inside the canvas and asserts the
  matching form item opens.
- **14 build tests** cover routes, menu resolution, theme variables, palette fallback, file collisions and mixed
  releases, and the renderer's 29 cover escaping, the link policy and every section kind.
- **A million requests** through the starter's API surface passed with the same thresholds the other read paths
  hold — the builder adds no request-path cost; the build is out-of-band work that promotes a directory.
