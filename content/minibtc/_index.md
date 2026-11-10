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
  { id = "P0", name = "foundations", about = "Workspace, contract docs, chain params, architecture checks." },
  { id = "P1", name = "keys and addresses", about = "secp256k1 via k256, strict-DER low-S signatures, Base58Check." },
  { id = "P2", name = "transactions and UTXOs", about = "Canonical codec, Sats money type, outpoint model." },
  { id = "P3", name = "script and sighash", about = "Bounded P2PKH interpreter, SIGHASH_ALL, execution limits." },
  { id = "P4", name = "blocks, merkle, mining", about = "Headers, merkle with the CVE-2012-2459 check, PoW, subsidy, retarget." },
  { id = "P5", name = "chainstate and reorgs", about = "UTXO set with undo data, most-work reorgs, coinbase maturity." },
  { id = "P6", name = "mempool", about = "Fee-rate ordering, RBF, ancestor/orphan limits, bounded eviction." },
  { id = "P7", name = "p2p", about = "Framing, handshake, scoring/banning, eclipse limits, headers-first sync." },
  { id = "P8", name = "wallet", about = "BIP39/32/44 verified against official vectors, encrypted keystore." },
  { id = "P9", name = "rpc and cli", about = "JSON-RPC server + typed client + the full command surface." },
  { id = "P10", name = "explorer", about = "Read-only HTML explorer: blocks, transactions, addresses, mempool." },
  { id = "P11", name = "mcp server", about = "11 tools, resources, prompts — spending gated on human approval." },
  { id = "P12", name = "attack lab and hardening", about = "All 15 blueprint attacks, fuzzing, property tests, million-op load runs." },
]
up_next = { milestone = "P12", step = "ship", title = "Done — the blueprint's own definition of finished is met" }

[[extra.planned]]
milestone = "P12"
step = "ship"
title = "Done — the blueprint's own definition of finished is met"
+++
