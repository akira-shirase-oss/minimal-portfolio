+++
title = "How Bitcoin's UTXO model actually works — explained by implementing it"
description = "No accounts, no balances — just unspent transaction outputs. What the UTXO set is, why reorgs need undo data, how coinbase maturity stops inflation, and where the model breaks. Written from a from-scratch implementation."
date = 2026-11-10

[extra]
kind = "experiment"
+++

Every "explain Bitcoin" article says the same thing: *there are no accounts, there are only unspent transaction outputs.* True, but useless — it doesn't tell you what that means when you're writing the code.

I just implemented the whole thing in Rust for MiniBTC. Here's the model as it actually behaves under the hood, including the parts tutorials skip.

## The model in one paragraph

A transaction consumes **inputs** (references to previous outputs) and creates **outputs** (new spendable coins). The entire chain state is one set: `outpoint → output`, where an outpoint is `(txid, vout_index)`. A transaction is valid iff every input's outpoint exists in the set, hasn't been spent already in this block or mempool, and the script/signature checks pass. Validity is *stateless* — you don't need history, just the current set.

That's it. No balances. An "address balance" is just the sum of unspent outputs paying to that address's script.

## Why this is harder than it looks

**Undo data.** Blocks don't just add to the UTXO set — they remove spent outputs and add new ones, and coinbases mature over 100 blocks. When a reorg happens (a heavier chain appears), you must *exactly* reverse each disconnected block: restore every spent output, remove every created one, decrement coinbase maturity. Get this wrong and your node disagrees with the network about what money exists — silently.

In MiniBTC this is `connect_block`/`disconnect_block` with per-transaction undo records, and the test that matters: after a reorg, the UTXO set's fingerprint must equal a fresh replay of the new chain. Byte-for-byte. Not "close enough."

**Coinbase maturity.** Block rewards can't be spent for 100 blocks — this is what makes inflation attacks and self-spend races impossible. Spend a coinbase early and the block is invalid. It's a consensus rule, not a policy.

**Double-spend is a set operation.** Two transactions spending the same outpoint can't both be valid — the second finds its input already gone. The mempool enforces this before mining even sees the block.

## Where the model leaks

The UTXO model has real costs the account model doesn't:

- **Fees are implicit.** Fee = inputs − outputs. There's no fee field; you compute it. Change outputs, dust limits, and fee estimation are all wallet-side puzzles.
- **Privacy is per-output, not per-account.** Every UTXO is a distinct coin — which is why CoinJoin and CoinSwap exist, and why analysts cluster heuristics on change addresses.
- **Script is the account abstraction.** "Accounts" in Bitcoin are really just script templates (P2PKH, P2SH, SegWit, Taproot). The UTXO set stores scripts, not keys — the key lives in the spending signature.

## What implementing it taught me

The gap between "I understand UTXOs" and "my UTXO set survives a reorg" is where all the bugs live. The attack lab encodes fifteen of them — premature coinbase spends, double-spends racing through the mempool, reorg double-spends that try to un-confirm a payment, majority-work history rewrites.

The model is simple. The *invariants* are the hard part: exactly-once application, exact reversal, checked arithmetic, bounded everything.

*MiniBTC is a from-scratch Rust implementation of all of this — UTXO set, undo data, reorgs, maturity — on a private devnet. The code is public if you want to see what `disconnect_block` actually looks like.*
