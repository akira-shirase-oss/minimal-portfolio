+++
title = "Checkpoint 5.2: the name is the content"
description = "rt.media — streamed, content-addressed uploads into a declared store. 64 KiB chunks, sha256 computed in flight, a mid-upload failure removes its partial, and 'uncertain' is never relabeled 'uploaded'."
date = 2026-11-10T01:15:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.2"
short_title = "rt.media"
tests = 77

[extra.summary]
goal = "A media store that obeys the capability law: streamed uploads, content-addressed names, and failure states that don't lie."
built = "manifest \"media\": {\"backend\":\"local\",\"root\",\"max_bytes\"} or --media-root/--media-max-mb; rt.media.put streams a read-granted file in 64 KiB chunks into the root under its sha256 name; tmp renamed on success, removed on any failure; rt.media.stat validates the name before it ever becomes a path."
proof = ["200KB source vs 1KB cap -> aborts mid-stream, exits 7 naming the grant, and the media dir contains zero partial files", "put('a') and put('b') with identical bytes -> same name, one file on disk", "media grant without a read grant on the source -> read denied: uploading does not bypass the read gate", "backend:'bunny' -> manifest parse error 'not implemented', never a silent fallback"]
code = "akira-shirase-oss (local, not yet pushed) · 6ae471d"
+++

`rt.media` exists because the webhook app will eventually receive a file
and need to put it somewhere that survives the process. The design
constraint was already written in the roadmap: an upload *streams* — it
never holds the whole file in memory — and a mid-upload failure reports
`uncertain`, never `uploaded`.

The local-disk backend implements the full contract today:

- **Streamed, not buffered.** `put` reads the source in 64 KiB chunks,
  feeds each through the sha256, writes each to a `.media-tmp-*` file
  inside the store root, `sync`s, and only then renames it to its final
  name. The store therefore only ever contains files whose name matches
  their content — a partial is impossible to *observe* because the tmp
  name is not a valid content name and it is removed on every failure
  path.
- **The name is the content.** `sha256` hex, computed in flight. Put
  the same bytes twice and the second call notices the destination
  exists, drops its tmp, and returns the same name — dedup for free,
  plus integrity for free: `stat` can always be trusted because a wrong
  file could never have landed under that name.
- **Capability law, twice.** The destination needs a declared `media`
  grant; the *source* still needs a read grant — handing a path to the
  upload op is a read, and `rt.media` is not a read-gate bypass. One
  subtlety pinned in a comment: the check is `is_read_allowed`, not
  `may_read`, because `may_read`'s 4 MiB cap exists for `readText`
  materialization, and a streamed upload never materializes.
- **`uncertain` is a reserved word.** The result struct carries
  `state: "stored"` — the only claim a local rename can honestly make.
  When a network backend lands, a mid-flight timeout will report
  `uncertain`; it will never say `uploaded` without the backend's own
  confirmation. That rule is in the type's doc comment where the next
  implementer will read it.

## What got deliberately not built

The Bunny.net edge. The roadmap row allowed "Bunny sandbox *or* local
backend" as the acceptance drill, and the honest version is: there are
no Bunny credentials in scope, and writing a reqwest PUT against an API
I can't drill would ship untested network code dressed as a feature.
Instead the manifest parser refuses `backend: "bunny"` with
`not implemented — only 'local' ships today` — the failure is loud, at
load time, and names the limitation. When credentials exist, the
`MediaBackend` seam (grant + per-op dispatch) is where the edge lands.

## Evidence

Seven end-to-end tests through the real binary: refusal without a
grant; a streamed put verified against `shasum -a 256`; stat hit/miss;
dedup producing one file on disk; a media-granted-but-read-denied
source refusing (the read gate holds); a 200KB source against a 1KB cap
aborting mid-stream with **zero residue** in the store; the
`--media-root` CLI path; and the `bunny` manifest failing at parse with
a host error, not a runtime surprise.

**Engineering lesson:** "don't ship what you can't test" is not a
testing rule, it's an API-design rule. The unimplemented backend is a
*parse error in the manifest format*, which means the gap is part of
the contract — visible to anyone who reads the schema, not buried in a
code path that looks finished until it hits the network.
