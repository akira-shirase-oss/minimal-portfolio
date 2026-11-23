+++
title = "Why set -o pipefail + grep -q breaks CI checks with SIGPIPE 141"
description = "Under set -o pipefail, piping into grep -q makes the upstream command die with SIGPIPE (141) on the first match—silently inverting if-checks in CI scripts."
date = 2026-11-23T10:00:00-05:00

[taxonomies]
tags = ["reliability", "security"]

[extra]
kind = "failure"
+++

Nothing feels safer in a Bash CI script than `set -euo pipefail`. Until you pipe a large file or command output into `grep -q` and watch your check **fail precisely because it found what it was looking for**—or worse, silently pass a forbidden-pattern check because the pipeline exited `141`.

We hit this on 2026-11-21 in [Intent Studio](@/intent-studio/_index.md). A check script used `set -o pipefail` with `producer | grep -q pattern`. When the pattern matched early in a large stream, `grep -q` did its job and exited immediately with `0`—closing the read end of the pipe. The upstream producer kept writing, received `SIGPIPE`, and died with exit code **141** (`128 + 13`).

Because `pipefail` returns the rightmost non-zero exit code in a pipeline, the entire pipeline exited **141** (failure).

## How this silently inverts security checks

The truly nasty version is inside an `if` statement checking for forbidden content (like leaked secrets, `MUTANT:` markers, or disallowed imports):

```bash
set -euo pipefail

# BROKEN: if `cat large.log` gets SIGPIPE (141) after grep -q matches early,
# the pipeline fails (non-zero), so the `if` branch NEVER RUNS!
if cat large.log | grep -q "FORBIDDEN_SECRET"; then
    echo "FAIL: secret found!" >&2
    exit 1
fi
echo "PASS: clean"
```

Read that again:

1. `large.log` contains `FORBIDDEN_SECRET` on line 3 (out of 5,000 lines).
2. `grep -q` matches line 3 and immediately exits `0`.
3. `cat` tries to write the rest of `large.log` to a closed pipe and dies with `SIGPIPE` (`141`).
4. `pipefail` sees `141` and marks the pipeline as **failed** (false).
5. The `if` statement skips the `exit 1` and prints **`PASS: clean`**.

The bigger your output gets (past the OS pipe buffer, typically 64 KB on Linux or 16–64 KB on macOS), the more reliably your check lies to you.

## The fix: never pipe into `grep -q`

If you already have a file, pass it directly to `grep -q`—no pipe, no `SIGPIPE`:

```bash
set -euo pipefail

# Check the input exists first so a missing file doesn't look "clean"
[[ -f "$report" ]] || { echo "FAIL: missing $report" >&2; exit 1; }

if grep -q "FORBIDDEN_SECRET" "$report"; then
    echo "FAIL: secret found in $report" >&2
    exit 1
fi
```

If the input comes from a command rather than a file, capture it to a temporary file first (so you also verify the producer exited `0`!) and then run `grep -q` on the file:

```bash
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# Producer's own exit code is checked cleanly here
my_tool --dump > "$tmp"

if grep -q "FORBIDDEN_SECRET" "$tmp"; then
    echo "FAIL: secret found" >&2
    exit 1
fi
```

## Prove every check script can actually go red

Our workspace rule since 2026-11-21 is simple: **a check script is not done until a test feeds it a known-bad input and asserts that it exits non-zero.**

- Feed a 200 KB file with the forbidden pattern on line 1 (large enough to exceed the OS pipe buffer).
- Assert the check script fails.
- And in GitHub Actions, remember that steps after a failing step are skipped unless you add {% raw %}`if: ${{ !cancelled() }}`{% endraw %}—otherwise a red check can silently hide downstream suites.
