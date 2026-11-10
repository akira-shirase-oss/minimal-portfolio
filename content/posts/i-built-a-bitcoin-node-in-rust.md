+++
title = "I built a Bitcoin node from scratch in Rust — consensus, P2P, mining, wallet, the works"
description = "A complete Bitcoin-style blockchain in pure Rust: UTXO validation, headers-first sync, a miner, an HD wallet, JSON-RPC, a block explorer and an MCP server. What actually broke, what the attack lab caught, and what I'd do differently."
date = 2026-11-10

[extra]
kind = "experiment"
+++

Most "build a blockchain" tutorials stop at a hashmap of blocks and a `sha256` loop. I wanted the version where every shortcut is gone: a node that validates every transaction against a UTXO set, syncs headers-first over a real P2P protocol, reorgs on most-work, and refuses to spend a satoshi it can't prove.

The result is **MiniBTC** — eleven library crates, five binaries, ~30k lines of Rust, on its own private devnet. No mainnet, no real value, no shortcuts borrowed from `rust-bitcoin` internals. This post is the honest build log: what the architecture looks like, which bugs actually bit me, and what the security testing caught.

## The stack, layer by layer

The dependency order is the interesting part — each layer only trusts what's beneath it:

- **crypto** — Hash256/Hash160, Base58Check addresses, secp256k1 via `k256` with strict-DER signature parsing and low-S enforcement
- **primitives** — canonical binary codec (CompactSize, checked money type in satoshis — floats never touch money)
- **script** — a bounded P2PKH interpreter with sighash and execution limits
- **consensus** — pure validation rules: subsidy schedule, difficulty retarget, transaction rules
- **chainstate** — the UTXO set with per-transaction undo data, connect/disconnect, most-work reorgs
- **storage** — `redb` persistence, crash-safe commits, reindex
- **mempool** — fee-rate ordering, RBF, ancestor limits, bounded eviction
- **p2p** — Bitcoin-shaped framing, handshake, peer scoring/banning, eclipse limits, headers-first sync
- **miner** — block templates, PoW nonce search, subsidy + fees
- **wallet** — BIP39/32/44 verified against the official test vectors, encrypted keystore, coin selection
- **rpc / cli / explorer / mcp** — JSON-RPC server, typed client, read-only web explorer, and an MCP server that can inspect the chain and *draft* payments but never spend without a human

## The bugs that actually mattered

Tutorials don't tell you this part. Three real failures surfaced during development:

**1. A reorg propagation bug.** After a three-node demo where one node mined a heavier fork, an already-connected peer never followed the reorg — it had the headers but not the blocks. The fix wasn't in validation; it was in the sync/relay layer: already-connected peers needed the same inv→getdata→block path as fresh connections, plus keepalive handling so long syncs didn't look dead. Real networks hit this constantly; toy implementations never do.

**2. Strictness is a feature, not a cost.** The codec rejects non-canonical CompactSize encodings. Signatures must be low-S. The merkle tree rejects the CVE-2012-2459 duplication ambiguity. Every one of these is a historical Bitcoin CVE mapped to a test. "It parses" is not "it's valid" — the difference is where the attacks live.

**3. Money is integers, always.** `Sats` is a checked-integer newtype. No `f64` anywhere near an amount — a floating-point satoshi is a rounding bug waiting to become a theft.

## The attack lab

P12 of the roadmap is the part I'm proudest of: **fifteen automated attack scenarios**, one per historic Bitcoin failure or adversarial strategy — duplicate inputs, value overflow, merkle ambiguity, signature malleability, low-work blocks, coinbase overclaim, premature spends, eclipse limits, mempool floods, double-spend races, reorg double-spends, majority-work rewrites, selfish-mining economics.

Each is a test that *fails without the defense*. Plus four cargo-fuzz targets (~26M executions, zero crashes) and nine property tests (codec round-trips, merkle sensitivity, disconnect-exactness).

Then there's the newer one: after the November 2025 Coldcard disclosure — a build-config bug that swapped in a weak RNG and cut seed entropy to ~40 bits, ~1,816 BTC stolen — I added a wallet-side scenario. A simulated 32-bit-entropy source produces duplicate mnemonics at the birthday bound (8 collisions in 200k draws), while 8,192 real generated mnemonics are all unique with unbiased word distribution. The lesson isn't "test harder" — it's that **entropy source is an architectural decision**: ours comes from the OS CSPRNG through the `bip39` crate, never a seeded PRNG.

## The numbers

On an M2 Pro (laptop numbers, not capacity claims): codec 3.9M ops/s, wire 4.3M ops/s, P2P verify 22.5k scripts/s, mempool 734k admits/s, RPC 54.7k req/s — each scenario run at 1M+ operations with committed evidence. The three-node devnet demo runs 17 phases: convergence, partition/catch-up, a deliberate 55-block solo fork resolved by most-work, and a wallet-to-wallet payment confirmed through the live network.

## What I'd tell anyone attempting this

1. **Write the consensus rules as pure functions first.** Everything else — P2P, miner, wallet — is plumbing around `validate_block`.
2. **The UTXO set is the product.** A blockchain without correct undo data and reorgs is a log, not a ledger.
3. **Test the attacks, not just the happy path.** Every rule you skip is a CVE you inherit.
4. **BIP32 test vectors are your friends.** HD derivation is the easiest place to be confidently wrong — the official vectors caught two transcription bugs in my first pass.

The whole thing is public on GitHub (`akira-shirase-oss/projects/minibtc`) with the full decision log — including the places I deviated from Bitcoin deliberately (own genesis, own magic bytes, no SegWit/Taproot, explicit `--connect` peer discovery instead of DNS seeds).

*It's a learning project on a private devnet — it will never touch real Bitcoin. But every line of the validation path is the same math mainnet runs.*
