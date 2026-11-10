+++
title = "Checkpoint P12: the whole chain, attacked, fuzzed and loaded"
description = "Every blueprint phase landed: 15 attack scenarios automated and passing, four fuzz targets at ~26M executions with zero crashes, nine property invariants, a 6M-operation load run, and a three-node devnet that survives a deliberate fork — resolved by most-work, with a two-wallet payment confirmed through the live network."
date = 2026-11-10T11:30:00Z

[extra]
kind = "experiment"
milestone = "P12"
step = "ship"
short_title = "Attack lab + ship gate"
tests = 153

[extra.summary]
goal = "Prove the thing is honest under attack, not just correct on the happy path — then run the blueprint's own definition of done end to end."
built = "tests/attacks (historic + network suites + proptest invariants), tests/attacks/fuzz (tx_decode, block_decode, wire_payload, script_exec), apps/minibtc-load (codec/wire/script/mempool/chain/rpc scenarios), scripts/devnet-demo.sh (3-node partition/fork/payment proof)."
proof = [
  "attack lab: 8 historic-bug + 7 network/economic scenarios — dup inputs, value overflow, merkle ambiguity, sig malleability, low-work blocks, coinbase overclaim, premature spend, timestamp tricks, eclipse limits, malformed P2P, selfish-mining economics, mempool flood, double-spend race, reorg double-spend, majority-work rewrite — all rejected correctly",
  "fuzz: tx_decode 9.13M execs, block_decode 7.69M, wire_payload 5.04M, script_exec 4.45M — zero crashes, zero panics",
  "proptest: codec fixed-points, checked money ops, merkle determinism+sensitivity, HD derivation stability, script/mempool no-panic, disconnect restores UTXO exactly",
  "load @ ca4de1f (M2 Pro, laptop numbers): codec 3.9M ops/s, wire 4.3M ops/s, script 22.5k verifies/s, mempool 734k admits/s, chain 2.2M validations/s, rpc 54.7k req/s — 1M ops each, all PASS",
  "devnet demo @ 46055ad: 120 blocks converge on 3 nodes; partition→catch-up; N3 mines a 55-block solo fork; all nodes reorg to most-work at height 215; wallet A→B 10 BTC confirmed at height 216 — 17/17 phases",
  "gates: cargo fmt --check, clippy --workspace --all-targets -D warnings, cargo test --workspace --locked — all green at ef0772d",
]
code = "akira-shirase-oss/projects/minibtc · main @ ef0772d (local only — remote push not configured)"
+++

The blueprint's finish line was never "it mines a block." It was: three or
more nodes sharing one chain; two wallets sending through the CLI; a
deliberate fork resolved by most-work; every Tier-1 security rule covered
by a passing attack test; and an AI assistant that can inspect the chain
and draft payments through MCP — with spending gated on a human running
`--confirm` outside the conversation.

All of it now runs on committed evidence. The attack lab encodes all
fifteen blueprint scenarios — the historic Bitcoin bugs (duplicate inputs,
value overflow, the CVE-2012-2459 merkle ambiguity, signature malleability,
low-work blocks, coinbase overclaim, premature coinbase spends) and the
network/economic attacks (eclipse and diversity limits, malformed P2P
payloads, selfish-mining economics, mempool flood with bounded eviction,
double-spend races, reorg double-spends, majority-work history rewrite).
Every one is rejected the way Bitcoin rejects it.

The fuzz campaign ran ~26.3 million executions across four targets —
transaction and block decoding, raw wire payloads, and script execution —
with zero crashes. Nine property tests pin the invariants that matter:
codecs are fixed points, money arithmetic is checked, merkle roots are
deterministic and mutation-sensitive, HD derivation is stable, the
mempool stays bounded, and disconnecting blocks restores the UTXO set
exactly.

The load run is the workspace standard made literal: one million
operations per scenario — codec round-trips, wire framing, full P2PKH
script verification, mempool admission under eviction pressure, UTXO
validation, and a million authenticated JSON-RPC requests against a live
node — all past threshold, report committed with machine and commit.

And the demo is the part you can watch: `scripts/devnet-demo.sh` stands up
three nodes, converges 120 blocks, partitions one, extends the chain,
reconnects for headers-first catch-up, then isolates a node that mines a
55-block private fork — heavier than the public chain — and watches all
three reorg onto it by most-work. A wallet send of 10 BTC confirms in the
next block on every node. Seventeen phases, seventeen passes.

One honest caveat recorded in the evidence: an earlier demo run died on a
transient localhost transport error mid-fork — the script now retries
transport flakes (bounded, three attempts) while RPC-level errors still
fail fast, and both transcripts are committed. Laptop throughput numbers
are development observations, not capacity claims.

What is deliberately *not* claimed: this is a teaching system, not
Bitcoin. It shares the design — UTXO model, compact-size canonical
encoding, proof-of-work, difficulty retarget, BIP32/39/44 wallets — but
runs its own genesis, its own magic bytes, and its own devnet. No real
value, no real network, ever.
