---
title: Building a URL shortener dapp with Solidity, Nuxt and ethers
description: How my Nuxt URL shortener stored links in a Solidity contract, created them through MetaMask with ethers.js, and redirected short IDs to the stored URL.
pubDate: Saturday, 20 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["solidity", "dapp", "vue"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3267094508-short-ruler-in-the-grass.webp'
---

:::caution
This project was built on tools that are now end-of-life. Nuxt 2 reached end of life in June 2024 (Vue 2 at the end of 2023), and the contract was deployed to the Kovan testnet, which has been deprecated and is no longer served by major RPC providers. Sepolia is the usual testnet now. The contract targets Solidity 0.4.24, and the front-end code below uses the ethers v5 API. In ethers v6, `ethers.providers.Web3Provider` became `ethers.BrowserProvider`.
:::

This URL shortener keeps everything on-chain. A Solidity contract maps an incrementing ID to a URL. The Nuxt app has two pages: one sends a transaction to store a new URL and shows the resulting short link, and a dynamic `/:id` page looks up the ID and redirects.

## The contract

`createNewLink` increments `lastLinkId`, stores the caller's address and the URL under that ID, emits `LinkAdded` and returns the ID. `getLink` returns the creator and URL for an ID. The `linkExists` modifier reverts for IDs that were never written, which it detects by checking for an all-zero `userAddress`. The `Log` event is declared but never emitted.

```solidity
pragma solidity ^0.4.24;

contract e0x {
	event Log(string message);
	event LinkAdded(uint linkId, string url);

	struct LinkTemplate {
		address userAddress;
		string url;
	}

	uint lastLinkId;
	mapping (uint => LinkTemplate) public linkMapping;

	constructor() public {
		lastLinkId = 0;
	}

	function createNewLink(string url) public returns (uint) {
		lastLinkId++;
		linkMapping[lastLinkId] = LinkTemplate(msg.sender, url);
		emit LinkAdded(lastLinkId, url);
		return lastLinkId;
	}

	modifier linkExists(uint linkId) {
		// link with the given id does not exist
		if (linkMapping[linkId].userAddress == 0x0000000000000000000000000000000000000000) {
			revert();
		}
		_;
	}

	function getLink(uint linkId) linkExists(linkId) public constant
		returns (
			address,
			string
		) {
		LinkTemplate memory link = linkMapping[linkId];
		return (
			link.userAddress,
			link.url
		);
	}
}
```

The contract compiles with solc 0.4.24. On 0.5 and later, `constant` on functions has to become `view`, and the `string` parameter and return value need `memory` or `calldata`.

The return value of `createNewLink` isn't visible to a front end that sends a transaction, because transactions don't return values to the caller. The app reads the new ID from the `LinkAdded` event in the receipt instead.

## The redirect page

The redirect page needs no wallet, because reading contract state is free. It connects to an RPC endpoint, calls `getLink` with the `id` route parameter and sets `window.location.href`.

Anyone can store any string in the contract, and the form's URL check runs only in the browser. So the page checks the scheme before redirecting. Without that check, a stored `javascript:` URL would run script on the shortener's domain.

```vue
<template>
  <div class="loading-page">
    <p>Redirecting...</p>
    <Loader />
  </div>
</template>

<script>
import { ethers } from 'ethers'
import EthUrlABI from '../store/EthUrlABI'
import Loader from '~/components/Loader.vue'

const address = '0xa40d4c7fb56635a8a2a4d47ab7975bdcda57ac2a' // deployed e0x contract (Kovan)
// Kovan is gone: use an RPC URL for the network you deploy the contract to
const RPC_URL = 'https://YOUR_RPC_ENDPOINT'

export default {
  head: {
    title: 'Url Redirect Page'
  },
  components: {
    Loader
  },
  async mounted () {
    const id = this.$route.params.id
    if (!id) {
      return
    }
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(address, EthUrlABI, provider)
    try {
      const [, url] = await contract.getLink(id)
      const target = new URL(url)
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        throw new Error('Refusing to redirect to ' + target.protocol + ' URL')
      }
      window.location.href = target.href
    } catch (error) {
      console.error(error)
      window.alert('Invalid ID value')
    }
  }
}
</script>

<style scoped>
.loading-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  text-align: center;
  padding-top: 200px;
  font-size: 30px;
  font-family: sans-serif;
}
</style>
```

The original version created a random wallet and connected it to `ethers.getDefaultProvider('kovan')` just to make this call. A provider is enough for read-only calls.

## The main page

The main page has a URL input and a Send button. While the transaction is pending, it shows a loader and an Etherscan link, and when the transaction is mined it shows the short URL. Errors and status messages appear in a modal.

```vue
<template>
  <section class="container">
    <div>
      <app-logo />
      <h1 class="title">nuxt-shortener</h1>
      <h2 class="subtitle">Shorten your Urls here</h2>
      <div class="card">
        <div class="row">
          <div>
            URL:
            <input v-model="fullURL" class="url-field" title="fullURL" />
            <button class="addlink" :disabled="txnPending" @click="shorten">Send</button>
            <br />
            <Loader v-show="txnPending" />
            <p v-show="txnPending">Transaction being made</p>
            <a v-show="txnPending" target="_blank" :href="txnHashURL">View on Etherscan</a>
            <span v-show="shortURL !== null">View at: </span>
            <a v-show="shortURL !== null" :href="shortURL">{{ shortURL }}</a>
          </div>
          <modal
            v-show="isModalVisible"
            :title="modalTitle"
            :content="modalContent"
            @close="closeModal"
          />
        </div>
      </div>
    </div>
  </section>
</template>
```

The script asks MetaMask for account access with `eth_requestAccounts` when the page mounts, then builds a contract instance from the MetaMask signer. `shorten` validates the URL, sends `createNewLink` and waits for the receipt. It then reads the ID from the `LinkAdded` event.

```vue
<script>
import { ethers } from 'ethers'
import AppLogo from '~/components/AppLogo.vue'
import Loader from '~/components/Loader.vue'
import modal from '~/components/modal.vue'
import EthUrlABI from '~/store/EthUrlABI'

const address = '0xa40d4c7fb56635a8a2a4d47ab7975bdcda57ac2a' // deployed e0x contract (Kovan)
// Kovan is gone: point this at the block explorer for the network you deploy to
const EXPLORER_TX_URL = 'https://kovan.etherscan.io/tx/'

let contract

export default {
  components: {
    AppLogo,
    modal,
    Loader
  },
  data () {
    return {
      fullURL: '',
      shortURL: null,
      txnPending: false,
      txnHashURL: '',
      isModalVisible: false,
      modalTitle: null,
      modalContent: null
    }
  },
  async mounted () {
    if (!window.ethereum) {
      this.showModal('Non Dapp Browser Detected.', 'Oops, looks like you need to install MetaMask. See https://metamask.io/.')
      return
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
    } catch (error) {
      console.error(error)
      this.showModal('MetaMask Locked.', 'Please connect MetaMask and refresh.')
      return
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    contract = new ethers.Contract(address, EthUrlABI, provider.getSigner())
  },
  methods: {
    validURL () {
      try {
        const url = new URL(this.fullURL)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch (error) {
        return false
      }
    },
    async shorten () {
      if (!contract) {
        this.showModal('MetaMask Locked.', 'Please connect MetaMask and refresh.')
        return
      }
      if (this.fullURL === '') {
        this.showModal('Url Empty', 'Please enter in an url.')
        return
      }
      if (!this.validURL()) {
        this.showModal('Url Invalid', 'Please enter in a valid url.')
        return
      }
      let tx
      try {
        tx = await contract.createNewLink(this.fullURL)
      } catch (error) {
        console.error(error)
        this.showModal('Rejected Transaction', 'Darn, did I mention making links is free.')
        return
      }
      this.txnPending = true
      this.txnHashURL = EXPLORER_TX_URL + tx.hash
      try {
        const receipt = await tx.wait()
        const added = receipt.events.find(e => e.event === 'LinkAdded')
        const url = window.location.origin + '/' + added.args.linkId.toString()
        this.shortURL = url
        this.showModal('Link Added!', 'Congrats, your link is available at ' + url)
      } catch (error) {
        console.error(error)
        this.showModal('Transaction Failed', 'The transaction was not mined successfully.')
      } finally {
        this.txnPending = false
      }
    },
    showModal (title, content) {
      this.modalTitle = title
      this.modalContent = content
      this.isModalVisible = true
    },
    closeModal () {
      this.isModalVisible = false
    }
  }
}
</script>
```

What changed from the original version, and why:

- **Wallet detection.** It used `ethereum.enable()` and `window.web3`, and it called `new Web3(...)` without importing `web3`. It also called `web3.eth.sendTransaction({})` on load, a leftover from MetaMask's old boilerplate. MetaMask stopped injecting `window.web3` years ago, and `enable()` has been replaced by the `eth_requestAccounts` request.
- **Event history.** A `batchEvents` method used the web3.js 0.x `contract.at(...).allEvents().watch()` API, which doesn't exist in later web3.js versions, and it only logged the results. I removed it.
- **Finding the new link.** It registered a new `contract.on('LinkAdded')` listener on every click, then matched events by URL string. That leaked listeners and could confuse two people shortening the same URL. Reading the event from the transaction receipt avoids both problems.
- **URL validation.** I replaced the long regex with the `URL` constructor plus a scheme check, which matches the check on the redirect page.

## Gotchas

- Every link costs the creator gas, and the stored URLs are public. Anyone can read every URL by iterating IDs or scanning `LinkAdded` events.
- Links can't be edited or deleted. The contract has no function for either.
- The short ID is a sequential number, so short links are guessable.

## References

See https://github.com/FriendlyUser/nuxt-url-shorter
