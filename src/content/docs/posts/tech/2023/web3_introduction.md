---
tags: ['web3', 'solidity']
title: "What web3 means, and a first Solidity smart contract"
description: "A short explanation of what people mean by web3, what a smart contract actually is, and a minimal Solidity contract you can deploy in Remix."
pubDate: Fri, 7 August 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3658824416.webp
---

"Web3" is the umbrella term for applications built on public blockchains such as Ethereum. Instead of a company's database holding your account balance or your posts, the state lives on a shared ledger that many independent nodes keep in sync, and the rules for changing it are programs (smart contracts) that anyone can read and call.

Ethereum co-founder Gavin Wood popularized the term in 2014. "Web 3.0" had already been used for a different idea, Tim Berners-Lee's semantic web, so the two get mixed up.

## How it differs from a normal web app

In a typical web app, the server is the source of truth: the company running it can change your data, lock your account or shut the service down. In a web3 app:

- State (balances, ownership records, votes) is stored on a blockchain, and changing it means sending a signed transaction that the network validates.
- Users identify themselves with a key pair held in a wallet, not a username and password stored by the service.
- The logic that decides what a transaction can do is a smart contract deployed on-chain. Once deployed, its code can't be edited, only replaced by deploying a new contract (or by an upgrade mechanism the authors built in up front).

That comes with real costs. Every write is a transaction that pays a gas fee, writes are slow compared to a database, everything on a public chain is visible to everyone, and a bug in a deployed contract can't simply be patched. Most "web3" products still rely on centralized pieces too: hosted frontends, RPC providers such as Infura or Alchemy, and exchanges.

The common use cases are decentralized finance (lending, exchanges), NFTs (on-chain ownership records for tokens), and DAOs, where token holders vote on proposals through a governance contract.

## Smart contracts

A smart contract is a program stored at an address on the blockchain. It has its own storage and functions that accounts can call by sending transactions. Every node runs the same code and gets the same result, so nobody needs to trust a single server to execute it honestly.

The usual examples (escrow, payments, voting) all follow the same pattern. The contract holds some state or funds, and its functions only allow changes when the coded conditions are met. For example, an escrow contract might release funds only after the buyer confirms delivery. Anything the contract needs from the outside world, like a shipment status or a price, has to be supplied by a transaction or an oracle service, because contracts can't make HTTP calls.

## Solidity

Solidity is the most widely used language for writing contracts for the Ethereum Virtual Machine (EVM). It's statically typed, with curly-brace syntax. The Solidity docs list C++, Python and JavaScript as influences.

Here's a minimal contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloWorld {
    string public greeting = "Hello, World!";

    function setGreeting(string calldata newGreeting) external {
        greeting = newGreeting;
    }
}
```

The contract has the following parts:

- `string public greeting` is stored in contract storage. Marking a state variable `public` makes the compiler generate a getter, so callers can read it with `greeting()`. A separate `getGreeting()` function isn't needed.
- `setGreeting` is `external`, so any account can call it. Calling it costs gas because it writes to storage. Reading `greeting()` from outside the chain is a free `eth_call`.
- `calldata` is the cheapest data location for an `external` function's read-only parameters.
- `pragma solidity ^0.8.0` means "any 0.8.x compiler". Since 0.8.0, arithmetic overflow reverts by default instead of silently wrapping.

As written, anyone can change the greeting. A real contract would usually restrict that, for example by storing the deployer's address in the constructor and checking `msg.sender` against it.

The quickest way to try this is [Remix](https://remix.ethereum.org/), a browser IDE. Paste the contract in, compile it, and deploy it to the built-in "Remix VM", which is a local in-browser chain. That needs no wallet and no real ETH. For a local project, Hardhat and Foundry are the common toolchains.

To call a contract from a JavaScript frontend, use [ethers.js](https://docs.ethers.org/) or [viem](https://viem.sh/). web3.js, which an earlier version of this post mentioned, was sunset by ChainSafe in March 2025 and is no longer maintained.

## Further reading

- [Ethereum developer docs](https://ethereum.org/en/developers/docs/)
- [Solidity documentation](https://docs.soliditylang.org/)
- [IPFS docs](https://docs.ipfs.tech/), often used to store files that are too large to put on-chain
