+++
title = "MiniBTC: the build log"
description = "A Bitcoin-style blockchain built from scratch in Rust — consensus, UTXO set, P2P, mining, an HD wallet, JSON-RPC, CLI, explorer and an MCP server that can inspect the chain and draft payments but never spend without a human. Built in the open on a private devnet."
sort_by = "date"
template = "series.html"
page_template = "series-page.html"

[extra]
status = "complete — all blueprint gates passed with committed evidence"
short_title = "MiniBTC"
milestones = [
  { id = "P0", name = "foundations", about = "Workspace, contract docs, chain params, architecture checks.", done = true },
  { id = "P1", name = "keys and addresses", about = "secp256k1 via k256, strict-DER low-S signatures, Base58Check.", done = true },
  { id = "P2", name = "transactions and UTXOs", about = "Canonical codec, Sats money type, outpoint model.", done = true },
  { id = "P3", name = "script and sighash", about = "Bounded P2PKH interpreter, SIGHASH_ALL, execution limits.", done = true },
  { id = "P4", name = "blocks, merkle, mining", about = "Headers, merkle with the CVE-2012-2459 check, PoW, subsidy, retarget.", done = true },
  { id = "P5", name = "chainstate and reorgs", about = "UTXO set with undo data, most-work reorgs, coinbase maturity.", done = true },
  { id = "P6", name = "mempool", about = "Fee-rate ordering, RBF, ancestor/orphan limits, bounded eviction.", done = true },
  { id = "P7", name = "p2p", about = "Framing, handshake, scoring/banning, eclipse limits, headers-first sync.", done = true },
  { id = "P8", name = "wallet", about = "BIP39/32/44 verified against official vectors, encrypted keystore.", done = true },
  { id = "P9", name = "rpc and cli", about = "JSON-RPC server + typed client + the full command surface.", done = true },
  { id = "P10", name = "explorer", about = "Read-only HTML explorer: blocks, transactions, addresses, mempool.", done = true },
  { id = "P11", name = "mcp server", about = "11 tools, resources, prompts — spending gated on human approval.", done = true },
  { id = "P12", name = "attack lab and hardening", about = "All 15 blueprint attacks, fuzzing, property tests, million-op load runs.", done = true },
  { id = "P13", name = "UI expansion", about = "Enriched read-only explorer + a local web wallet with in-memory sessions, CSRF and a human-gated send flow.", done = true },
  { id = "P13b", name = "wallet entropy hardening", about = "Coldcard-class weak-RNG attack test: low-entropy seeds collide; real generator verified full-width.", done = true },
]
up_next = { milestone = "done", step = "—", title = "P0–P13b complete — every blueprint gate passed with committed evidence" }
+++
