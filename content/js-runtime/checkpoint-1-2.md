+++
title = "Checkpoint 1.2: the module graph is real"
description = "Multi-file imports run, missing and malformed specifiers exit 3 naming the specifier, a syntax error in a dependency stays a syntax error — and circular imports evaluate in both entry directions."
date = 2026-11-07T17:15:00Z

[extra]
kind = "experiment"
milestone = "M1"
step = "1.2"
short_title = "Module semantics"
tests = 21

[extra.summary]
goal = "Real ESM semantics — imports between files, and load errors that name the failing specifier instead of blurring into generic exceptions."
built = "classify() now maps CoreErrorKind::JsBox — the structured Rust channel module-machinery errors arrive on — to Load (exit 3); five new lifecycle tests plus a host-level dependency-syntax test."
proof = ["missing dep → exit 3 with 'missing.js' in stderr; bad specifier 'ht!tp:bad' → 3 naming it; dep syntax error → 4; circular pair runs both directions → 0"]
code = "akira-shirase-oss (local, not yet pushed) · 8294ff8"
+++

A runtime that can't import isn't a runtime. The probe before the build
showed the semantics were *mostly* free — V8 and deno_core's FsModuleLoader
handle two-file graphs and circular imports per spec — but the classification
was wrong in exactly the way that matters at 3am.

**A missing dependency exited 5, not 3.** The stderr said `Failed to load
file:///tmp/m12/missing.js` — right message, wrong class. Debugging the
error kind showed why: module-machinery failures don't arrive as JS
exceptions at all. They come through `CoreErrorKind::JsBox`, a structured
Rust channel carrying concrete loader types — `LoadFailedError { specifier,
source }` for a missing file, `ImportPrefixMissing { specifier,
maybe_referrer }` for a malformed path. Both Displays already name the
failing specifier and the referrer, which is exactly what an operator needs.
`classify()` now maps `JsBox` to `Load` (with the registered op classes still
taking precedence), and the suite pins the difference: missing dep → 3 with
the specifier in stderr, bad specifier → 3 naming it, a syntax error
*inside* an imported file still exits 4.

**The honest hole stays documented.** This step proves semantics, not
enforcement: `FsModuleLoader` will still happily resolve an import to a file
outside the declared read paths — imports bypass `may_read` until M3.1's
custom loader closes it. That's written on the roadmap and the index, not
papered over.

**Lesson:** error taxonomies aren't decoration. "A file I needed wasn't
there" (load, 3) and "the script I ran threw" (exception, 5) are different
operator stories with different fixes — and the framework will happily hand
you both through whichever channel is nearest unless you look at the actual
kind.
