+++
title = "Bash (( )) arithmetic code injection from untrusted JSON or env values"
description = "Bash (( )), $(( )), let, and [[ -lt ]] evaluate array subscripts as shell commands. Validate every integer before arithmetic or jq output can execute code."
date = 2026-11-23T09:30:00-05:00

[taxonomies]
tags = ["security", "reliability"]

[extra]
kind = "failure"
+++

Most engineers know `eval "$untrusted"` is dangerous. Far fewer realize that an ordinary Bash integer comparison like `if (( count > 0 )); then` can execute arbitrary shell commands if `count` came from a server reply, a `jq` query, a file, or an environment variable.

We found this exact vulnerability **twice in one day** during our 2026-11-20 security sweeps across workspace verification and load scripts. In both cases, a script parsed a numeric field from an HTTP JSON response with `jq -r '.count'` and handed it straight to `(( ... ))` or `[[ ... -lt ... ]]`.

## Why Bash arithmetic runs commands

In Bash, arithmetic contexts—`(( ... ))`, `$(( ... ))`, `let`, and the numeric comparison operators `-eq`, `-ne`, `-lt`, `-le`, `-gt`, `-ge` inside `[[ ... ]]`—recursively expand variable names and **array subscripts**.

If an attacker (or a compromised upstream endpoint, or a crafted fixture file) controls the string value of `count`, they don't need quotes or semicolons. They just pass an array subscript:

```bash
# Suppose an HTTP endpoint returns: {"count": "a[$(id >&2)]"}
count='a[$(id >&2)]'

# Every one of these executes `id >&2`!
(( count > 0 ))
x=$(( count + 1 ))
[[ $count -lt 10 ]]
```

Notice that quoting `"$count"` inside `[[ "$count" -lt 10 ]]` does **not** save you. Inside `[[ ... ]]`, `-lt` parses both operands in arithmetic context regardless of quotes.

## What actually gets evaluated

| Bash construct | Evaluates `a[$(cmd)]`? | Safe alternative |
|---|---|---|
| `(( var > 0 ))` | **Yes** | Validate `^[0-9]+$` first |
| `$(( var + 1 ))` | **Yes** | Validate `^[0-9]+$` first |
| `[[ $var -lt 10 ]]` | **Yes** | Validate `^[0-9]+$` first |
| `let "x = var"` | **Yes** | Avoid `let`; validate first |
| `[ "$var" -lt 10 ]` | No (errors on non-integer) | Still validate explicitly |

## The fix: a strict integer guard before any arithmetic

Every value coming from an environment variable, a file, a subprocess, or `jq` output must pass a plain-integer regex before touching arithmetic:

```bash
require_uint() {
    local name="$1"
    local val="$2"
    if [[ ! "$val" =~ ^[0-9]+$ ]]; then
        printf 'error: %s must be a non-negative integer (got %q)\n' "$name" "$val" >&2
        exit 1
    fi
}

count="$(jq -r '.count // empty' response.json)"
require_uint "count" "$count"

if (( count > 0 )); then
    printf 'ok: %d items\n' "$count"
fi
```

If negative integers are valid, use `^-?[0-9]+$`. And if you are parsing JSON with `jq`, you can also enforce the type inside `jq` itself (`jq -er '.count | if type == "number" and floor == . then . else error("not an int") end'`) *and* still run `require_uint` in Bash so the shell script defends itself even if `jq` is swapped or bypassed.

## Write a negative test for your own scripts

In our workspace rules, any security check or shell helper that parses outside data gets a known-bad input test. Feed `a[$(touch /tmp/pwned)]` into your script's parser and assert:

1. The script exits non-zero.
2. `/tmp/pwned` does not exist.

It takes five lines of test code and permanently closes a whole class of CI and ops-script RCE bugs.
