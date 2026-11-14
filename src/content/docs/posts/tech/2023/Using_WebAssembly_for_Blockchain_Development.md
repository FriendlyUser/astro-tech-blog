---
title: "WebAssembly in blockchains: where Wasm runs smart contracts and runtimes"
pubDate: "2024-07-08T16:04:22.000Z"
lastUpdated: 2026-11-14
description: "Why some blockchains execute smart contracts or runtimes as WebAssembly, which chains do it (NEAR, CosmWasm, Antelope, Arbitrum Stylus, Polkadot), and the catches."
tags: ['dapp']
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/banana-spaceship.webp"
---

A blockchain needs a virtual machine that every node runs identically: given the same transaction and state, every node must produce the same result. Ethereum built its own VM (the EVM) for this. Several other chains chose WebAssembly (Wasm) instead, so contracts can be written in general-purpose languages like Rust, C++ or Go and run on an existing, well-specified VM.

## What Wasm brings

Wasm is a compact, typed bytecode format with a formal specification. Compilers for Rust, C/C++, Go (via TinyGo) and AssemblyScript can target it, and several mature engines can execute it (Wasmtime, Wasmer, wasmi). For a chain, that means:

- **Existing languages and tooling.** Contract authors use Rust or C++ with their usual compilers, test frameworks and libraries, instead of a chain-specific language.
- **Sandboxing.** A Wasm module can only touch its own linear memory and the host functions the chain explicitly imports into it (read storage, emit an event, call another contract). There's no ambient access to the file system or network.
- **Validation before execution.** Modules are type-checked when loaded, so malformed bytecode is rejected before it runs.
- **Speed.** Wasm can be compiled ahead of time or JIT-compiled to machine code, which is usually much faster than interpreting a stack-based VM. Some chains still interpret it (wasmi) because an interpreter is easier to make deterministic and to meter.

## The catches

Wasm wasn't designed for consensus, so chains have to add things the spec doesn't give them:

- **Determinism.** A few Wasm behaviours, notably the bit pattern of floating-point NaN results, are allowed to differ between engines. Chains either forbid floating-point instructions in contracts or configure the engine to canonicalise NaNs.
- **Gas metering.** Wasm has no notion of gas. Chains typically instrument the bytecode at upload time, inserting counters that charge gas per block of instructions, so that an infinite loop runs out of gas instead of halting the network.
- **Bounded resources.** Memory growth, stack depth and module size all need hard limits that every node enforces the same way.
- **Contract size.** Rust compiled to Wasm can be large; projects strip panicking/formatting code and run `wasm-opt` to fit size limits.

Wasm also doesn't give you cross-chain interoperability by itself. Two chains that both run Wasm still expose different host functions, storage models and account systems, so a contract written for one won't run on another without porting.

## Where Wasm is used

- **NEAR**: smart contracts are compiled to Wasm, written mainly in Rust or JavaScript/TypeScript using NEAR's SDKs.
- **CosmWasm**: a Wasm smart-contract module that Cosmos SDK chains can add; contracts are written in Rust.
- **Antelope (formerly EOSIO)**: the codebase behind EOS and related chains runs contracts written in C++ and compiled to Wasm.
- **Arbitrum Stylus**: an upgrade to the Arbitrum One and Nova Ethereum layer-2 networks, live on mainnet since September 2024, that runs Wasm contracts (Rust, C, C++) alongside EVM contracts, with the two able to call each other.
- **Polkadot / Polkadot SDK (formerly Substrate)**: the *runtime* (the chain's state-transition logic) is compiled to Wasm and stored on chain, which is how Polkadot-based chains upgrade without hard forks. Smart contracts are a separate story: the older `pallet-contracts` ran ink! contracts as Wasm, and chains such as Astar still use it, but Polkadot Hub's newer `pallet-revive` runs contracts on PolkaVM, a RISC-V-based VM, instead of Wasm.

### What about Ethereum?

Ethereum researched a Wasm-based VM called eWASM in the Ethereum 2.0 era, but it was never adopted. Ethereum mainnet still executes contracts on the EVM, including after the move to proof of stake in 2022. The closest thing to "Wasm on Ethereum" today is a layer 2 such as Arbitrum Stylus.

## When Wasm is the wrong choice

If you're building on Ethereum or any EVM chain, the ecosystem (Solidity, audit tooling, wallets, existing contracts) matters more than the VM, and Wasm doesn't help. Wasm contract platforms make most sense when you want Rust's type system and testing tools for contract code, or when you're building your own chain and want an existing VM rather than designing one.

## Further reading

- [WebAssembly specification](https://webassembly.github.io/spec/)
- [NEAR smart contracts](https://docs.near.org/smart-contracts/what-is)
- [CosmWasm documentation](https://cosmwasm.github.io/)
- [Arbitrum Stylus](https://docs.arbitrum.io/stylus/gentle-introduction)
- [Polkadot smart contracts overview](https://docs.polkadot.com/polkadot-protocol/smart-contract-basics/overview)
