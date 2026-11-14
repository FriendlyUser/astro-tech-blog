---
title: "Writing WebAssembly smart contracts in Rust: a NEAR key-value store"
pubDate: "2023-08-28T13:17:37.000Z"
lastUpdated: 2026-11-14
description: "Which blockchains run WebAssembly smart contracts, and how to write, build and deploy a small Rust key-value contract on NEAR."
tags: ["rust", "dapp", "web3"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2785952400.webp
---

A decentralized application (dApp) is usually a normal web front end talking to a smart contract: code that runs on a blockchain's nodes and keeps its state on chain. Several chains run that contract code as WebAssembly (Wasm), so you can write it in Rust, C++ or other languages that compile to Wasm instead of a chain-specific language like Solidity.

Wasm suits this job because it is almost entirely deterministic (chains restrict the few exceptions, such as NaN bit patterns from floating-point operations), sandboxed (a contract can only call the host functions the chain gives it), and compact enough to store on chain.

## Which chains run Wasm contracts

The original version of this post listed Ethereum's eWasm, EOSIO and Substrate. That list has aged badly:

- **Ethereum** never shipped eWasm. Ethereum contracts still run on the EVM.
- **EOSIO** was forked as Antelope, and the EOS network rebranded to Vaulta in 2025. Contracts are still C++ compiled to Wasm.
- **Polkadot**'s ink! language targeted Wasm through `pallet-contracts`, but ink! v6 moves to `pallet-revive`, which runs RISC-V code on PolkaVM instead of Wasm.

Chains where you can write Wasm contracts today include:

- [NEAR](https://docs.near.org/smart-contracts/what-is): Rust or JavaScript, compiled to Wasm.
- [CosmWasm](https://cosmwasm.com/): Rust contracts on Cosmos SDK chains that include the CosmWasm module.
- [Arbitrum Stylus](https://docs.arbitrum.io/stylus/gentle-introduction): Wasm contracts (Rust, C, C++) that run alongside EVM contracts on Arbitrum chains.
- [Antelope / Vaulta](https://docs.eosnetwork.com/): C++ contracts compiled to Wasm.

Each chain exposes its own host API, so a contract is not portable between them. You write against the chain's SDK, not raw Wasm.

## Example: a key-value store on NEAR

This contract stores string values by string key. It uses [`near-sdk`](https://crates.io/crates/near-sdk) 5.x (5.30.2 at the time of writing).

Create a library crate and add the SDK:

```bash
cargo new --lib kv_store
cd kv_store
cargo add near-sdk
```

NEAR contracts must be built as a `cdylib`, so add this to `Cargo.toml`:

```toml
[lib]
crate-type = ["cdylib", "rlib"]
```

Then replace `src/lib.rs`:

```rust
use near_sdk::{near, store::LookupMap};

#[near(contract_state)]
pub struct KeyValueStore {
    entries: LookupMap<String, String>,
}

impl Default for KeyValueStore {
    fn default() -> Self {
        Self {
            // b"e" is the storage prefix for this map's keys.
            entries: LookupMap::new(b"e"),
        }
    }
}

#[near]
impl KeyValueStore {
    pub fn set(&mut self, key: String, value: String) {
        self.entries.insert(key, value);
    }

    pub fn get(&self, key: String) -> Option<String> {
        self.entries.get(&key).cloned()
    }
}
```

`#[near(contract_state)]` makes the struct the contract's persisted state, and `#[near]` on the `impl` block exports each public method. Arguments and return values are passed as JSON. `LookupMap` stores each entry under its own storage key, so a call only reads the entry it needs instead of loading the whole map.

The earlier version of this example used `wasm_bindgen` and `#![no_std]`. That does not work: `wasm_bindgen` generates bindings for a JavaScript host, not a blockchain, and `String` and `Vec` are not available under `no_std` without the `alloc` crate.

## Build and deploy

Build with [`cargo-near`](https://github.com/near/cargo-near), which runs `cargo build` for the `wasm32-unknown-unknown` target and adds the ABI and size optimizations NEAR expects:

```bash
cargo near build
```

Deploy to testnet with [NEAR CLI](https://docs.near.org/tools/near-cli). Use a testnet account you created, and the `.wasm` path that `cargo near build` prints:

```bash
near create-account <your-account>.testnet --useFaucet
near deploy <your-account>.testnet <path-to-wasm>
```

Then call the contract. `set` changes state, so it must be signed by an account; `get` is a free view call:

```bash
near call <your-account>.testnet set '{"key": "greeting", "value": "hello"}' --useAccount <your-account>.testnet
near view <your-account>.testnet get '{"key": "greeting"}'
```

## Connecting a front end

The dApp part is a web page that calls the same methods through a JavaScript library, such as [`near-api-js`](https://github.com/near/near-api-js) plus a wallet selector so the user can sign `set` calls. View calls like `get` need no wallet.

## Gotchas

- Storage costs money. On NEAR, the contract account must hold enough tokens to cover the bytes it stores, so an unbounded key-value store needs a deposit or size limit per caller.
- Anyone can call `set`. A real contract checks `env::predecessor_account_id()` before writing.
- Changing the state struct after deployment needs a migration, because existing state was serialized with the old layout.

## Further reading

- [NEAR smart contract docs](https://docs.near.org/smart-contracts/what-is)
- [CosmWasm docs](https://cosmwasm.com/)
- [Arbitrum Stylus docs](https://docs.arbitrum.io/stylus/gentle-introduction)
- [WebAssembly specification](https://webassembly.github.io/spec/)
