---
title: Url shortener with nuxt
description: react native template for a basic app
pubDate: Saturday, 20 June 2023 13:00:00 GMT
tags: ["solidity", "dapp"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3267094508_short_ruler_in_the_grass.png'
---

This is a Solidity contract that defines a simple contract for creating and retrieving a "link" (a URL). The contract has three events: Log, LinkAdded, and LinkExists. The Log event is not used in the contract, so it will never be emitted. The LinkAdded event is emitted when a new link is created, and it includes the ID of the link and the URL. The LinkExists event is not a real event, but rather a modifier that is used to ensure that a link with the given ID exists before allowing certain functions to be called.

The contract has a struct called LinkTemplate which represents a link and has two fields: userAddress, the address of the user who created the link, and url, the URL of the link. The contract also has a mapping called linkMapping which maps link IDs to LinkTemplate structs. The lastLinkId variable is used to keep track of the last link ID that was used.

The contract has a constructor which sets the lastLinkId to 0. The createNewLink function is used to create a new link by adding a new entry to the linkMapping mapping with a new link ID and the LinkTemplate struct for the new link. The getLink function is used to retrieve the user address and URL of a given link ID by looking up the LinkTemplate struct in the linkMapping mapping. The linkExists modifier is used to ensure that the link with the given ID actually exists before allowing the getLink function to be called.

```js
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
	    //link with the given hash does not exist
		if(linkMapping[linkId].userAddress == 0x0000000000000000000000000000000000000000) {
			revert();
		}
		_;
	}
	
	function getLink(uint linkId) linkExists(linkId) public constant
		returns(
			address,
			string
		) {
		    LinkTemplate memory link = linkMapping[linkId];
			return(
				link.userAddress,
			    link.url
			);
		}
}
```


This is a Vue.js single-page application (SPA) that uses the Ethereum network and a smart contract to redirect the user to a URL. The contract is called EthUrl and it is located at a specific Ethereum address. The contract has an Application Binary Interface (ABI) which is used to interact with the contract's functions. The contract is being used to retrieve the URL associated with a given ID.

The SPA has a single template with a div element containing a message and a Loader component that is displayed while the redirect is being processed. The Loader component is imported from another file.

The SPA has a single script that defines an exported default object with various properties. The mounted property is a hook that is called after the SPA is mounted to the DOM. It calls the initContract and redirect methods when the SPA is mounted. The initContract method is used to create a new random Ethereum wallet and connect it to the provider for the Ethereum network. The redirect method is used to retrieve the URL associated with the given ID using the getLink function of the EthUrl contract. If the ID is not provided or the getLink function fails, an error message is displayed.

The SPA also has a single style block that applies styles to the .loading-page class. This class is applied to the div element in the template and is used to style the loading page that is displayed while the redirect is being processed.

```vue
<template>
  <div>
    <div class="loading-page">
      <p>Redirecting...</p>
      <Loader />
    </div>
  </div>
</template>


<script>
  import { ethers } from 'ethers';
  import EthUrlABI from '../store/EthUrlABI'
  import Loader from '~/components/Loader.vue'
  const address = '0xa40d4c7fb56635a8a2a4d47ab7975bdcda57ac2a' // insert deployed EIP20 token address here
  let provider = ethers.getDefaultProvider('kovan');
  let wallet = ethers.Wallet.createRandom();
  wallet = wallet.connect(provider);
  let contract = new ethers.Contract(address, EthUrlABI, wallet);
  export default {
    head: {
      title: 'Url Redirect Page'
    },
    components: {
		  Loader
	  },
    mounted () {
        this.initContract()
        this.redirect()
    },
    methods: {
        initContract() {
          let address = "0xa40d4c7fb56635a8a2a4d47ab7975bdcda57ac2a";
          let abi = EthUrlABI
          wallet = ethers.Wallet.createRandom();
          wallet = wallet.connect(provider);
        },
        redirect(){
          var id =this.$route.params.id 
          if(!id){
              return
          }
          contract.getLink(id).then(url => {
              window.location.href = url[1];
          })
          .catch(error => {
              console.log(error)
              return window.alert("INVALID ID VALUE",error); 
          }) 
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

For the main page to create new urls, we can use the following code:

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
				<input
					class="url-field" 
					v-model="fullURL"
					title="fullURL"
					@change="validURL"
				/>
				<button class="addlink" @click="shorten" :disabled="txnPending">Send</button>
				<br />
				<Loader v-show="txnPending" />
				<!-- Link to etherscan based on network, do later, for now hardcode etherscan.-->
				<p v-show="txnPending">Transaction being made</p>
				<a target="_blank" v-show="txnPending" v-bind:href="this.txnHashURL">View on Etherscan</a>
				<span v-show="shortURL !== null">View at: </span>
				<a v-show="shortURL !== null" v-bind:href="this.shortURL">{{this.shortURL}}</a>
			</div>
			<modal
				v-show="isModalVisible"
				@close="closeModal"
				v-bind:title="modalTitle"
				v-bind:content="this.modalContent"
			/>
     	 </div>
		</div>
    </div>
  </section>
</template>
```

This is a template for a Vue.js component that includes a form for entering a URL and a button for shortening the URL. The form includes an input field for entering the URL and a Loader component that is displayed while a transaction is pending. When the user clicks the "Send" button, the shorten method is called. If a transaction is pending, the button is disabled and the Loader component is displayed.

The template also includes a modal component that can be displayed by setting the isModalVisible property to true. The modal has a title and content that are set using the modalTitle and modalContent properties, respectively. The modal has a close button that calls the closeModal method when clicked.



This is a script for a Vue.js component that interacts with an Ethereum smart contract to create shortened URLs. The component has several properties and methods that are used to manage the state of the component and interact with the contract.

The component has a data property that returns an object with several properties that are used to manage the state of the component. The fullURL property is a string that stores the user-entered URL. The urlValid property is a boolean that indicates whether the user-entered URL is valid. The shortURL property is a string that stores the shortened URL. The txnPending property is a boolean that indicates whether a transaction is pending. The txnHashURL property is a string that stores the URL for viewing the transaction on Etherscan. The isModalVisible, modalTitle, and modalContent properties are used to manage the modal component.

The component has a mounted hook that is called after the component is mounted to the DOM. It calls the detectWeb3, initContract, checkNetwork, and batchEvents methods. The detectWeb3 method is used to check for the presence of the Ethereum browser extension (e.g., MetaMask). The initContract method is used to create an instance of the EthUrl contract using the contract's ABI and address. The checkNetwork method is used to check that the user is connected to the correct Ethereum network. The batchEvents method is used to listen for events emitted by the contract.

The component has several methods for interacting with the contract and managing the component's state. The validURL method is used to validate the user-entered URL. The checkNetwork method is used to check that the user is connected to the correct Ethereum network. The shorten method is used to create a shortened URL using the createNewLink function of the EthUrl contract. The closeModal method is used to close the modal component. The showModal method is used to show the modal component.

```
<script>
// add check web3 and other features to make that the application can be loaded, could use my old 
// logic to check for network ids
import AppLogo from '~/components/AppLogo.vue'
import Loader from '~/components/Loader.vue'
import modal from '~/components/modal.vue'
import EthUrlABI from '~/store/EthUrlABI'
import {ethers} from 'ethers'
//import { Web3Provider } from 'ethers/providers';
let provider = ''  //= new ethers.providers.Web3Provider(web3.currentProvider);
let address = "0xa40d4c7fb56635a8a2a4d47ab7975bdcda57ac2a";
let contract //= new ethers.Contract(address, EthUrlABI, provider.getSigner());
export default {
	components: {
		AppLogo,
		modal,
		Loader
	},
	data() {
		return {
			fullURL: '',
			urlValid: false,
			shortURL: null,
			txnPending: false,
			txnHashURL: '',
			isModalVisible: false,
			modalTitle: null,
			modalContent: null
		}
	},
	mounted() {
		this.detectWeb3()
		this.initContract()
		this.checkNetwork()
		this.batchEvents(EthUrlABI, address)
	},
	methods: {
		validURL() {
			var re =/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
			if(this.fullURL !== '') {
				this.urlValid = re.test(this.fullURL)
			}
			console.log(re.test(this.fullURL))
			return re.test(this.fullURL)
		},
		checkNetwork() {
			console.log('CHECKING NETWORK');
			contract.getLink(1)
			.then((output) => {
				console.log('OUTPUT',output);
			})
			.catch((err) => {
				console.log('ERROR',err);
				console.log('Not logged into metamask, please relog and refresh.')
				this.modalTitle = 'Metamask Locked.'
				this.modalContent = 'Please login into metamask and refresh.'
				this.showModal()
			}); 
		},
		async detectWeb3() {
			console.log('stupid')
			if (window.ethereum) {
				window.web3 = new Web3(ethereum);
				try {
					// Request account access if needed
					await ethereum.enable();
					// Acccounts now exposed
					web3.eth.sendTransaction({/* ... */})
					// close any message that tells people to open metamask
					this.closeModal()
				} catch (error) {
				}
			} else if (window.web3) {
				window.web3 = new Web3(web3.currentProvider);
				// Acccounts always exposed
				web3.eth.sendTransaction({/* ... */})
				// close any message that tells people to open metamask
				this.closeModal()
			}
			// Non-dapp browsers...
			else {
				this.modalTitle = 'Non Dapp Browser Detected.'
				this.modalContent = 'Oops, looks like you need to install metamask. See https://metamask.io/.'
				this.showModal()
				console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
			}
		},
		initContract() {
			provider = new ethers.providers.Web3Provider(web3.currentProvider);
			contract = new ethers.Contract(address, EthUrlABI, provider.getSigner());
    		console.log('e0x Contract Initiated');
		},
		batchEvents(abi, address) {
			//batch listening of events
			const MyContract = web3.eth.contract(EthUrlABI);
			const myContractInstance = MyContract.at(address);
			const events = myContractInstance.allEvents({event: 'LinkAdded', fromBlock: 0, toBlock: 'latest'});
			
			events.watch(function(error, result){
				console.log(result);
				//console.log(result.args.url, result.args.linkId.toNumber(), result.blockNumber, result.transactionHash);
				console.log(error,result)
				/*
				var shortUrl = '{0}/s?id={1}'.f(window.location.origin, result.args.linkId.toNumber());
				var shorterUrl = shortUrl.replace('https://','');
				var shorterUrl = shorterUrl.replace('http://','');
				var row = "\
					<tr>\
						<td><p class='smaller'>{0}</p></td>\
						<td style='min-width:133px'><a class='small' target='_blank' href='{1}'><strong>{2}</strong></a></td>\
						<td><a target='_blank' href='https://ropsten.etherscan.io/block/{3}'><code>{3}</code></a></td>\
						<td><a target='_blank' href='https://ropsten.etherscan.io/tx/{4}'>link</a></td>\
					</tr>".f(result.args.url,shortUrl,shorterUrl,result.blockNumber,result.transactionHash);
					**/
					// console.log(row);
					// $("#tx-table").prepend(row);
			})
		},
		async shorten() {
			// this.detectWeb3();
			if(this.fullURL === ''){
				this.modalTitle = 'Url Empty'
				this.modalContent = 'Please enter in an url.'
				this.showModal()
				return 
			}
			if(!this.validURL()){
				this.modalTitle = 'Url Invalid'
				this.modalContent = 'Please enter in a valid url.'
				this.showModal()
				return 
			}
			try {
				const tx = await contract.createNewLink(this.fullURL)
				this.txnPending = true
				this.txnHashURL = 'https://kovan.etherscan.io/tx/' + tx.hash
			} catch(error) {
				this.modalTitle = 'Rejected Transaction'
				this.modalContent = 'Darn, did I mention making links is free.'
				this.showModal()
				console.log(error)
			}
			// add this functionality to vue dapp and ipfs dapp
			contract.on("LinkAdded", (linkId, linkUrl) => {
				if(linkUrl !== this.fullURL){
					console.log('NOT MY EVENT');
					return
				}
				var shortUrl = linkId.toNumber()
				// $("#info").prepend( "Short URL: <a target='_blank' href='{0}'>{0}</a><br>".f(shortUrl) );
				console.log("EVENT LISTENER", shortUrl, linkId.toNumber(), linkUrl);
				this.modalTitle = 'Link Added!'
				const url = window.location.href + linkId
				this.modalContent = 'Congrats, your link is available at ' + url
				this.showModal()
				this.txnPending = false
				this.shortURL = url
    		})
		},
		showModal() {
        	this.isModalVisible = true;
      	},
		closeModal() {
			this.isModalVisible = false;
		}
	}
}
</script>
```
## References

See https://github.com/FriendlyUser/nuxt-url-shorter