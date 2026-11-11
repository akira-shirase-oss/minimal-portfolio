+++
title = "W1 · Lesson 1: What a CPU actually does"
description = "Fetch, decode, execute — the tiny loop a CPU runs forever, and why every if, for and function call ends up inside it."
date = 2026-11-11
weight = 1

[extra]
kind = "lesson"
week = 1
lesson = 1
status = "lesson shared"
+++

A CPU runs one tiny loop forever: fetch, decode, execute. That loop is all
"running code" means.

- **Fetch:** read the next instruction from memory. The **program counter (PC)**
  holds that instruction's address. It's a **register**, a tiny storage slot
  inside the CPU.
- **Decode:** work out what the instruction means, like "add these two numbers".
- **Execute:** do it. The **ALU**, the CPU's math unit, does the arithmetic.
  Then the PC moves to the next instruction, and a jump or an `if` just changes
  the PC.

Think of a cook with a finger on the current line of a recipe. The finger is the
PC, reading the line is fetch, understanding it is decode, and cooking is
execute.

Every `for`, `if` and function call in your Rust ends up as this loop, billions
of times a second.

## Try this

Paste this into [Compiler Explorer](https://godbolt.org/), pick Rust, and count
the assembly instructions — each one is one trip around the loop:

```rust
fn add(a: i32, b: i32) -> i32 { a + b }
```

Source: [Instruction cycle on Wikipedia](https://en.wikipedia.org/wiki/Instruction_cycle)
