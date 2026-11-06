+++
title = "Checkpoint 5.1: the store is a capability, not a convenience"
description = "rt.kv — embedded SQLite behind a declared manifest line. The declared file is the namespace, the quota is the file's own bytes, and no grant means every call throws CapabilityError."
date = 2026-11-10T00:30:00Z

[extra]
kind = "experiment"
milestone = "M5"
step = "5.1"
short_title = "rt.kv"
tests = 70

[extra.summary]
goal = "Persistent script state that obeys the capability law: get/put/delete/list over embedded SQLite, declared per entry point."
built = "rusqlite + bundled SQLite behind a \"kv\" manifest line ({path, max_bytes}) or --kv/--kv-max-mb; one lazily-opened connection per run in OpState; sync ops; quota = db file's own bytes."
proof = ["run A writes, run B reads — the store is durable, not a per-run cache", "no kv line in the manifest -> every rt.kv call exits 7 naming 'kv denied'", "1-byte quota: the write refuses as CapabilityError naming file bytes, projection, and grant", "list('user/') returns only exact-prefix entries, key-sorted"]
code = "akira-shirase-oss (local, not yet pushed) · 47e01b1"
+++

The first stdlib module had to answer the question every later one
inherits: how does persistent state fit a runtime whose entire security
story is "the manifest decides"? The answer that survives contact with
the rest of the design: **the declared file is the namespace.** A
manifest says `{"kv": {"path": "data/app.kv", "max_bytes": 67108864}}`,
the ops ask `may_kv()`, and a script with no declared store finds no
state cell in `OpState` — every `rt.kv` call throws `CapabilityError`,
same door as `rt.readText` outside its paths.

Two manifests pointing at one path share a store. That is not a bug to
be namespaced away — it is the point. A webhook app wants its dedup
table to outlive the process that wrote it; a per-script-run namespace
would make the store a cache with extra steps. The unit of ownership is
the declared file, and the manifest is the ownership record.

## The decisions that shaped it

- **Bundled SQLite, not system sqlite.** A host-owned store cannot
  depend on a library the operator never installed. rusqlite's `bundled`
  feature compiles SQLite into the binary — the dependency story stays
  "the runtime has a store," full stop.
- **Sync ops, deliberately.** `rt.kv.get` blocks the isolate for the
  microseconds a local-file read takes. Wrapping that in `spawn_blocking`
  would trade real complexity for fake async — the honest contract is
  "this is a local file, it is fast, it can stall you the way a local
  file can." If a serve workload later proves kv latency matters under
  concurrency, that evidence will justify the change — not aesthetics.
- **Quota is the file's own size.** Not key count, not payload bytes
  summed — the bytes on disk the operator actually budgets. Enforced at
  write time with a page of slack in the projection; a breach refuses
  as `CapabilityError` naming file bytes, projected bytes, and grant.
- **`list(prefix)` is an exact-prefix scan.** `substr` matching, key
  order, a limit — not LIKE. A prefix is a prefix; letting `%`/`_` mean
  something inside a "prefix" would be a footgun with a polite name.
- **Lazy open.** A script that never touches `rt.kv` never creates the
  file. The grant is permission, not a side effect.

## What the tests pin

Six end-to-end tests through the real binary: refusal without a grant
(exit 7, "kv denied"), a put/get/delete roundtrip, **persistence across
runs** — run B reads run A's write, which is the property that makes
this a store and not a cache — the quota refusal, the exact-prefix list,
and the `--kv`/`--kv-max-mb` CLI path for manifests that don't declare
one.

The op-boundary lesson from M1.3 showed up again: `op2` doesn't take
`Option<String>` as a return, so `rt.kv.get` misses return an honest
`null` via `serde_json::Value` rather than an empty-string convention
scripts would have to guess.

One boundary worth stating: contention. Two jsrt processes sharing one
store file get SQLite's own semantics — serialized writes, `SQLITE_BUSY`
when a transaction is held. v1 lets that surface as a `HostError` naming
the sqlite error rather than pretending the runtime serializes cross-
process access it doesn't control. A real contention drill belongs to
M6's webhook app, where two supervised runs share the declared store.

**Engineering lesson:** the namespace question resolved itself once the
ownership unit was named honestly. "Per-script namespace" sounded like
isolation; what the app actually needs is per-*declared-store* sharing —
the manifest line is the namespace, and everything else is a detail.
