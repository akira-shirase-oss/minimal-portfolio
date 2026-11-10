+++
title = "The Coldcard seed bug, explained — and why your wallet's RNG is a consensus-grade decision"
description = "In November 2025 a 2021 build-config mistake gave Coldcard hardware wallets a weak RNG — seeds with ~40 bits of entropy instead of 128. ~1,816 BTC stolen. What actually broke, why entropy is an architectural decision, and how to test for it."
date = 2026-11-11

[extra]
kind = "experiment"
+++

**TL;DR:** A Coldcard firmware build from 2021 selected a weak software random number generator on older devices. Seed phrases that should have carried 128 bits of entropy carried as little as ~40. Attackers enumerated the reduced space and swept roughly **1,816 BTC from over 5,200 addresses** (TRM Labs). The bug wasn't in Bitcoin, the BIP39 standard, or user error — it was a build configuration nobody re-audited for four years.

## What actually broke

Three layers, each individually reasonable, composed into a catastrophe:

1. **The entropy source.** Older Coldcard devices fell back to a software RNG path — a PRNG seeded from limited OS entropy — instead of the hardware TRNG the device was designed around. A build flag picked the wrong one.
2. **The encoding hid it.** BIP39 mnemonics *encode* 128 bits regardless of how much entropy actually went in. Twelve words look identical whether they carry 128 bits or 40 — the deficit is invisible to the user and to every checksum.
3. **Nobody measured the output.** The seeds passed every BIP39 test — valid words, valid checksum, valid derivation. Entropy quality is not something the standard *tests*; it's something the *generator* must guarantee.

That's the Coldcard lesson in one sentence: **a wide encoding does not create entropy — it only reveals what the source provided.**

## Why 40 bits is already lost

Bitcoin's security model assumes ~2^128 work to guess a seed. At 40 bits, the work is ~2^40 — roughly a trillion times easier. With modern hardware, enumerating a 40-bit space is a weekend project, not a research program. Once an attacker's wordlist covers the space, every affected address is a balance waiting to be swept — which is exactly what the theft pattern showed: many small addresses, drained systematically.

The scariest part isn't the math — it's that **the bug was silent for four years**. Seeds generated in 2021 looked perfect. There was no error, no warning, no failed test. The only symptom was entropy you couldn't see.

## The disputed part (worth knowing)

The November disclosure also produced a public argument about *who found it first*: NVK argued an AI model caught what 15+ human reviews missed; Luke Dashjr and James O'Beirne pushed back, and O'Beirne says he flagged Coldcard's RNG back in May 2025. Whether the credit lands on a model or a human reviewer doesn't change the engineering lesson — **the bug survived fifteen human reviews**, which means review-checklists alone don't catch supply-chain RNG failures. You need tests that measure the output, not reviews that read the code.

## What this means for MiniBTC

Building a wallet meant confronting this exact failure class. Our posture, now encoded as attack-lab test `wallet_entropy.rs`:

- **Entropy comes only from the OS CSPRNG** — `bip39` crate → `rand_core` OsRng → `getrandom`. Never a seeded PRNG, never time/PID mixing.
- **The attack test proves the failure mode is real:** a simulated 32-bit-entropy source (hashed pool indices through the real BIP39 encoder) produced **8 duplicate mnemonics in 200,000 draws** — collisions at the birthday bound, exactly what an attacker needs. Our real generator produced 8,192 unique mnemonics with unbiased word distribution.
- **The honest limit:** ~8k samples *cannot* distinguish 128-bit from ~40-bit entropy — that needs ~2^20 draws. So the defense isn't the statistical test; it's the dependency choice plus `cargo deny`/audit in the verification chain for supply-chain drift.

## FAQ

**Was Bitcoin itself hacked?** No — the consensus layer, signature scheme, and BIP39 standard all worked as specified. The failure was entirely in one vendor's build configuration.

**Are all Coldcard seeds compromised?** Only devices that took the weak-RNG path in affected firmware builds — primarily older models. TRM's address clustering identified the blast radius; the fix was a firmware update plus migration guidance.

**How do I know my own wallet's entropy is real?** You mostly can't inspect it directly — which is why you choose wallets whose RNG path is auditable (OS CSPRNG or hardware TRNG, documented) and whose builds are reproducible. "It generates valid mnemonics" is not evidence of entropy quality.

**Could an AI have prevented this?** Arguably yes — a model (or a sufficiently paranoid reviewer) that asks "what happens when the RNG fallback path is taken?" and then *measures the output distribution* instead of reading code would have caught it. The May 2025 flag suggests a human got there first; the November argument is about credit, not capability.

**Does MiniBTC's wallet UI change the risk?** The web wallet keeps seeds in `Zeroizing` memory with TTLs and never displays them after creation — the same discipline as the CLI. Entropy quality is upstream of all of it: OS CSPRNG in, BIP39 encoding out.

*MiniBTC is a from-scratch Rust Bitcoin-style node on a private devnet — the attack-lab test described above is in the public repo (`akira-shirase-oss/projects/minibtc`), along with the full build log.*
