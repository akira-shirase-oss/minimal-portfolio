+++
title = "My test said PASS. It was reading the todo's ID."
description = "I made my local Qwen app save todos twice as fast, then caught my own grader passing an answer that was never given."
date = 2026-11-13

[extra]
kind = "failure"
+++

A smoke alarm that beeps for burnt toast is annoying. One that stays quiet
during a real fire is worse. Today my test was the quiet one.

## What I built

My local Qwen todo app had a habit worth questioning. After saving a todo, it
called the model a **second time** just to write one sentence: *"The todo has
been added with ID 2."*

My code already knew the ID and the title, because they came straight from the
database. So I let the code write that sentence itself and skip the second
model call.

## How it works (the short version)

Reading one saved request stage by stage made this obvious. Qwen took 3.775 of
the 3.776 seconds. The database and the checks together took under a
millisecond. Most of the 922 input tokens were instructions and tool
descriptions, sent again on every call.

So the rule is narrow: if the whole request was exactly one successful save,
the code writes `Added todo #2: "Inspect query breakdown".` Everything else
(lists, refusals, mistakes) still gets Qwen's own answer.

## Does it actually work?

I wrote the cases and pass rules down first. Then I ran the old version and the
new one three times each, in alternating order, on the real model.

A single save went from **1.59 s to 0.81 s**, and from **922 to 421 input
tokens**. A five-message session went from 10.25 s to 9.15 s. These are small
development cases on my Mac, not a benchmark. The
[full step record](@/learn/model-engineering/the-harness-around-the-model.md#reading-one-request-then-making-it-faster-13-november)
has every number.

## Where I messed up

I added a trickier message: *"Add a todo: Call the bakery, then tell me how many
todos I have."* The summary said it passed, every time, in both versions.

It hadn't. My check looked for the number 3 anywhere in the answer, and found
it in **"todo #3"**. That's the ID of the new row, not a count. Qwen never told
me how many todos there were.

Worse, it saved the whole sentence as the title: *"Call the bakery, then tell
me how many todos I have."* All six times.

I fixed the check so it needs an actual count, like "3 todos", and re-graded
the saved answers without running the model again. The result was 0 out of 3
for both versions. The wrong summary is still saved next to the right one,
because a failing record is evidence too.

The lesson I'm keeping: **a PASS is only as good as the check behind it.**

## What it doesn't do yet

- The bakery message still fails. The shortcut didn't cause that, but it
  doesn't fix it either.
- Lists got a little chattier in the new version. Qwen probably no longer sees
  its own earlier reply in the chat history to copy the style from, but that's
  a guess I haven't tested.
- No weights changed. This was harness work, not training.

## Up next

Make the bakery message work: the title holds just the task, and the count
question gets answered. That case now stays in the test set for good. Then
update and delete. After that come customers, orders and invoices, which is
where all of this is heading.
