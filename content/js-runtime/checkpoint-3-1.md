+++
title = "Checkpoint 3.1: the loader is inside the fence"
description = "The module loader used to resolve any import to any file on disk — ops checked may_read but the module graph walked straight past it. Now JsrtModuleLoader gates every non-entry specifier at resolve() and load(), and a refusal is a real CapabilityError."
date = 2026-11-07T23:30:00Z

[extra]
kind = "experiment"
milestone = "M3"
step = "3.1"
short_title = "The loader gates"
tests = 51

[extra.summary]
goal = "Close the hole where a script could import any file regardless of declared read paths — module loading is a read and must be fenced like one."
built = "JsrtModuleLoader wraps FsModuleLoader and checks resolve()+load() against declared read paths plus the entry's own directory — implicit program-space for modules only; ops still see manifest grants only."
proof = ["import '../secret.js' outside the entry dir → exit 7 naming the path", "missing dep still exits 3 (absence is a load error, not a refusal)", "manifest grant opens the dir to both imports and reads", "deep dep can't launder an outside import", "symlink inside pointing out → 7", "dynamic import() refused, caught+uncaught variants pinned"]
code = "akira-shirase-oss (local, not yet pushed) · d71f6e4"
+++

The capability manifest gated every op — and none of it mattered, because
`FsModuleLoader` resolved `import '../anywhere.js'` without ever asking
`may_read`. A sandbox that gates reads but not imports is a gate with the
door open. M3.1 closes it.

**The design question was where the fence goes.** Gate `load()` only and
the refusal arrives after resolution — fine for correctness, but the
specifier that *shouldn't exist* was already decided. So the check runs at
both doors: `resolve()` rejects an out-of-fence specifier before it becomes
a specifier, and `load()` re-checks in case a resolved URL arrives from
somewhere resolve didn't see. Defense at both edges, not one.

**The subtlety that makes the taxonomy honest:** a refused import and a
missing file are different failures. `import '../nope.js'` where the file
doesn't exist must stay a *Load* error (3) — absence isn't a refusal we
invented; refusing to load a file that isn't there is the loader's job, not
the capability system's. So the gate canonicalizes first: unresolvable
paths pass through to the loader's own error, existing-but-outside paths
get `CapabilityError` and exit 7.

**And the convention that makes it usable:** the entry's own directory is
implicit program-space. `jsrt run app/main.js` imports `./lib.js` without a
manifest — the operator chose this program, its local graph comes with it.
Ops don't get that courtesy: `rt.readText` still sees only declared grants.
One fence for modules, a stricter one for reads — documented, not assumed.

The honest quirk worth writing down: dynamic `import()` refusals lose
their class at the V8 boundary — deno_core flattens the rejection to a
TypeError. Uncaught ones still exit 7 because the classifier recognizes
the loader's own refusal prefix. Caught ones see `TypeError` with the
refusal message — the refusal is real, the name is degraded, and the test
says so plainly.

**Lesson:** a permission model is only as strong as its least-checked
entry point. Ops were gated; the module graph wasn't — and the graph is
the bigger door. Audit every path bytes can take into the process, not
just the ones behind an API.
