+++
title = "I made an AI read the entire Rust Book. Then I tried to make it fail."
description = "It passed. But the most interesting part was the one bug it did write."
date = 2026-10-14

[extra]
# experiment, failure or release
kind = "experiment"
+++

AI can write Rust that looks perfect.

That's exactly what worries me.

Rust is the language where "looks right" and "is right" can be miles apart. Ownership, lifetimes, error handling, crates that change their API between versions. That's where AI-written Rust usually falls apart. You get code that's confident, clean and wrong.

So I tried something. I asked Claude (in Claude Code) to do what a serious human learner would do: read the whole official Rust Book, take notes, sit exams, grade itself, and fix whatever it got wrong.

Then I asked the question that actually matters: **does any of it carry over to real projects?**

## Step 1: Read the whole book

Not a summary. The full official Rust Book, all 23 parts, with examples checked against a real compiler (Rust 1.99).

Everything went into one main file: the rules, chapter notes, memory measurements, exam scores, and a log of every mistake.

## Step 2: The theory exam

Separate AI "examiner" agents wrote 138 questions across 9 exams, with hidden answer keys checked against the compiler.

Score: **136.5 / 138 (98.9%).**

The 1.5 points it lost were almost funny:

- It miscounted a line number because it skipped a blank line.
- It copied a line position from the book's example instead of the code in front of it.
- It quoted an error code that Rust has since retired.

Before grading, it predicted its own score: 133. It came in higher. I'll take a humble AI over an overconfident one.

## Step 3: Write code with no compiler

This is where most AI coding falls over.

36 coding tasks. 261 hidden tests it couldn't see. And one hard rule: **no compiler**. No running the code, no checking, no "let me try that again". Write it once and hand it in, like a whiteboard interview.

The topics were the hard ones: ownership and lifetimes, error handling across a whole app, threads, async, unsafe code, and real crates like tokio, serde, clap and nom.

Result: **254 / 261 tests passed on the first try (97.3%).** 35 of 36 tasks compiled.

All 7 lost tests came from the one task that didn't compile. The linter also flagged 4 style issues. In everything that did compile, there wasn't a single logic error. After fixes: 261 / 261, zero warnings.

But that one failure turned out to be the best part of the whole experiment.

## The bug that taught me something

Claude gave a helper method a name that Rust's built-in `Iterator` already uses. Rust picked the built-in one. In the exam that meant a compile error and a quick fix.

But I'd asked it to understand *why* a mistake matters, not just patch it. So it built an experiment to see what the same mistake looks like in a real project.

Here's a simple job queue with its own `count` method. The queue also implements `Iterator`, so it can hand out jobs one at a time:

```rust
impl Jobs {
    // "How many jobs are waiting?"
    fn count(&self) -> usize {
        self.items.len()
    }

    fn summary(&self) -> String {
        format!("{} jobs waiting", self.count()) // calls the count above
    }

    fn report(&mut self) -> usize {
        self.count() // same words... calls Iterator::count instead
    }
}
```

Run it:

```
3 jobs waiting
report() says 3
0 jobs waiting
```

`report()` returned the right number. And it quietly emptied the whole queue to get it.

Same two words, `self.count()`, two different methods. Which one runs depends on whether you're inside a `&self` method or a `&mut self` one.

It compiles with zero warnings. The default linter says nothing. Even the extra-strict lint groups miss it. A test that only checks the returned number passes.

That's silent data loss. The kind of bug that makes it to production.

It's like having two people named Sam in the same room. You call "Sam", the wrong one answers, and nobody notices, because someone did answer.

The catch is one opt-in lint, `clippy::same_name_method`, which flags it straight away. It's now on Claude's checklist for every Rust project.

## Step 4: "Prove it wasn't memorized"

Fixing a mistake is easy. Not repeating it in a different shape is the real test.

So a fresh examiner read the full list of past mistakes and built 8 brand-new tasks, each hiding one of those traps in disguise:

- the same name clash, now hiding behind a type that acts like a string
- text positions counted in three different units (bytes, characters and UTF-16)
- callbacks that could deadlock while a lock is held
- code that had to build on an older Rust version, where the "modern" suggestion doesn't exist yet
- a newer version of a real crate, whose API differs from the older version also installed

For each task the examiner also wrote a **decoy**: the plausible, confident answer an AI typically writes. The hidden tests had to catch it.

The decoys passed between 0 and 4 tests per task. Some deadlocked. Some didn't even compile.

Claude, first try, no compiler: **59 / 59.** Zero linter warnings.

## Plot twist: the examiner caught Claude's notes being wrong

While building that test, the examiner found a misleading line in Claude's own notes about how Rust 2024 handles locks inside `if let`.

The note was technically true, but it left out the part that matters: inside the `if let` block, the lock is still held. Someone following that note could write code that freezes.

Claude didn't argue. It tested it on the compiler, confirmed the examiner was right, and fixed it in all three places it appeared.

Honestly, this is the part I value most. It caught a mistake in its own knowledge, not just in its code.

## What carries over to real projects

The scores aren't the point. The point is what happens next time.

Every lesson is written down three ways: **what went wrong, why it matters on a real project, and how to prevent it.** Each one is backed by an experiment that proves it.

And there's now a "definition of done" that loads in every Rust project I open with Claude Code:

- tests pass
- the linter runs with zero warnings, including the name-clash check
- the project's minimum Rust version is checked before using newer features
- crate code is read from the exact installed version, never from memory
- no lock or borrow is held while calling someone else's code

## The honest part

This isn't proof that AI writes perfect Rust now.

- The examiners were AI agents, not human Rust experts. Everything was checked against the real compiler, but they're still AI.
- These were library-sized tasks, not a huge production codebase. Real projects will throw up new problems.
- It still made mistakes. That's the whole point. What changed is what happens after one.

## The takeaway

What separates a good developer from an average one isn't never making mistakes. It's not making the same mistake twice, and knowing *why* it was a mistake in the first place.

Turns out that's a pretty good bar for AI too.