---
title: Tracking IPFS files with a Solidity contract and a Drizzle React table
description: "An old dapp of mine: a Solidity contract that records IPFS hashes and tags per owner, a simple sign-up contract, and a Drizzle React table that lists the files."
pubDate: Saturday, 2 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["solidity", "dapp", "react"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-26 21.10.41 - decentralized network diagram simple bobble heads.png'
---

:::caution
This code targets Solidity 0.4.24 and the Truffle/Drizzle stack, which is no longer maintained. Consensys [sunset Truffle and Ganache](https://consensys.io/blog/consensys-announces-the-sunset-of-truffle-and-ganache-and-new-hardhat) in September 2023 and recommends Hardhat, and the Drizzle repositories are archived. The React component uses legacy context (`contextTypes`), which React 19 removed. Treat this as a record of how the app worked, not a starting template.
:::

This dapp lets a user upload a file to IPFS and then record the IPFS hash, a short filename and up to five tags on Ethereum. A React front end built with Drizzle reads the records back and shows them in a table. There are two contracts (`FileList` and `Authentication`) and two React pieces (a Drizzle container and the table component).

## The FileList contract

Each owner address gets a fixed-size array of 1,000 `File` structs, and `lastIds` stores the next slot to write for that owner. `addFile` writes the struct, emits `tagsAdded` and `fileAdded` (Drizzle listens for events to refresh its cached state), and moves the counter forward. Once an owner reaches the last slot, the counter wraps to 0 and old entries are overwritten.

Filenames and tags are `bytes32`, so each one is limited to 32 bytes of UTF-8. The IPFS hash is a `string` because a CIDv0 hash (`Qm…`) is 46 characters.

Why is there a separate `getFileTags` function? The getter Solidity generates for a public mapping of structs leaves out array members. `files(owner, i)` returns `id`, `ipfshash`, `filename`, `owner` and `timestamp`, but not `tags`, so the tags need their own function.

```solidity
pragma solidity ^0.4.24;

contract FileList {
   struct File {
      uint256 id;
      string ipfshash;
      bytes32 filename;
      bytes32[5] tags;
      address owner;
      uint256 timestamp;
   }
   uint256 public constant maxAmountOfFiles = 1000;
   // Owner => files
   mapping(address => File[maxAmountOfFiles]) public files;
   // Owner => next slot to write
   mapping(address => uint256) public lastIds;

   /// @dev main event for smart contract, needed for drizzle to update list of files
   event fileAdded (uint256 fileid, string ipfshash, bytes32 _filename);
   event tagsAdded (bytes32[5] tags);

   /// @dev Add a file to the list
   /// @param ipfshash an ipfshash returned after an image is finished uploaded
   /// @param _filename name of file as a bytes32 as filenames should be short
   /// @param tags array of bytes32 used for sorting/searching files (e,g. blockchain, school, textbook)
   /// @notice updates mappings files and lastIds
   function addFile(string ipfshash, bytes32 _filename, bytes32[5] tags) public {
      uint256 id = lastIds[msg.sender];
      files[msg.sender][id] = File(id, ipfshash, _filename, tags, msg.sender, now);
      emit tagsAdded(tags);
      // emit event, also needed for drizzle
      emit fileAdded(id, ipfshash, _filename);
      // wrap around after the last slot (index maxAmountOfFiles - 1)
      if (id + 1 >= maxAmountOfFiles) lastIds[msg.sender] = 0;
      else lastIds[msg.sender] = id + 1;
   }

   /// @dev return the tags for a specific file
   /// @param owner --- address of person who uploaded the file
   /// @param _index --- the file desired, (first file uploaded, second , etc ...)
   function getFileTags(address owner, uint256 _index) external view returns (bytes32[5]) {
      return files[owner][_index].tags;
   }
}
```

The original version incremented the counter until it equalled `maxAmountOfFiles` and only then reset it, so the 1,001st upload tried to write index 1000 of a 1,000-element array and reverted. The version above wraps after index 999.

## The Authentication contract

This contract keeps a `bytes32` username and a creation timestamp per address, plus a public `allUsers` list of every address that has signed up. "Logging in" is a `view` call that returns the caller's name, or reverts if the caller has no account. Nothing is secret here: the wallet that signs the transaction is the identity, and all of this data is readable on-chain by anyone.

- `signup(name)` creates the account if it doesn't exist and returns the stored name.
- `update(name)` changes the name and emits `UserUpdated`.
- `destroy()` deletes the user's record and emits `UserDeleted`. The address stays in `allUsers`.

```solidity
pragma solidity ^0.4.24;

/// @author David Li <davidli012345@gmail.com>
/// @dev basic authentication contract
/// @notice tracks list of all users
contract Authentication {
  struct User {
    bytes32 name;
    uint256 created_at;
  }

  event UserCreated(address indexed _address, bytes32 _name, uint256 _created_at);
  event UserUpdated(address indexed _address, bytes32 _name);
  event UserDeleted(address indexed _address);

  mapping (address => User) private users;

  // public array that contains list of all users that have registered
  address[] public allUsers;

  modifier onlyExistingUser {
    // Check if user exists or terminate
    require(users[msg.sender].name != 0x0);
    _;
  }

  modifier onlyValidName(bytes32 name) {
    // Only valid names allowed
    require(name != 0x0);
    _;
  }

  /// @return username
  function login()
  public
  view
  onlyExistingUser
  returns (bytes32) {
    return users[msg.sender].name;
  }

  /// @param name the username to be created.
  /// @dev if the caller has no account yet, create one; either way return the stored name
  /// @return username of created user
  function signup(bytes32 name)
  public
  onlyValidName(name)
  returns (bytes32) {
    if (users[msg.sender].name == 0x0) {
      users[msg.sender].name = name;
      users[msg.sender].created_at = now;

      allUsers.push(msg.sender);
      emit UserCreated(msg.sender, name, now);
    }
    return users[msg.sender].name;
  }

  /// @param name updating username
  /// @dev updating user name
  /// @return updated username
  function update(bytes32 name)
  public
  onlyValidName(name)
  onlyExistingUser
  returns (bytes32) {
    users[msg.sender].name = name;
    emit UserUpdated(msg.sender, name);
    return users[msg.sender].name;
  }

  /// @dev destroy existing username (the address stays in allUsers)
  function destroy()
  public
  onlyExistingUser {
    delete users[msg.sender];
    emit UserDeleted(msg.sender);
  }
}
```

`signup` and `update` were originally marked `payable`. Neither uses `msg.value` and there's no withdraw function, so any ether sent with those calls would have been stuck in the contract. I removed `payable`.

Both contracts compile with solc 0.4.24. To port them to Solidity 0.8, at minimum: replace `now` with `block.timestamp`, add data locations (`string memory` or `string calldata`, `bytes32[5] memory`) to parameters and return types, and bump the pragma.

## Connecting a component to Drizzle

`drizzleConnect` from `drizzle-react` works like `connect()` from react-redux: `mapStateToProps` picks the accounts, contracts and Drizzle status out of the Drizzle store and passes them to `Home` as props, and the component re-renders when that state changes.

```js
import Home from './Home'
import { drizzleConnect } from 'drizzle-react'

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts,
    drizzleStatus: state.drizzleStatus
  }
}

const HomeContainer = drizzleConnect(Home, mapStateToProps)

export default HomeContainer
```

## The file table

`FileTable` gets the Drizzle instance from (legacy) React context, reads `lastIds` for the owner, then calls `files(owner, i)` and `getFileTags(owner, i)` for each slot. Filenames and tags come back as hex-encoded `bytes32`, so they go through `web3.utils.hexToUtf8`. All-zero tags are shown as `N/A`.

The first version of this component pushed rows into a plain array from inside unawaited promises and never called `setState`, so the table usually rendered empty. This version awaits the calls and stores the rows in state:

```js
import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { IPFSURL } from '../util/constants'
import EthAddress from './EthAddress'
import ErrorBoundary from './ErrorBoundary'

const EMPTY_BYTES32 = /^0x0+$/
const TAG_CLASSES = ['is-success', 'is-info', 'is-danger', 'is-link', 'is-primary']

class FileTable extends Component {
  constructor (props, context) {
    super(props, context)
    this.drizzle = context.drizzle
    this.state = { table: [] }
  }

  async componentDidMount () {
    const { web3, contracts } = this.drizzle
    const fileList = contracts.FileList.methods
    const owner = this.props.fileOwnerAddress

    // Counts files written so far; after a wrap-around it only covers the newest slots.
    const lastIds = Number(await fileList.lastIds(owner).call())
    const table = []
    for (let i = 0; i < lastIds; i++) {
      // The struct getter omits the tags array, so fetch tags separately.
      const [fileItem, tags] = await Promise.all([
        fileList.files(owner, i).call(),
        fileList.getFileTags(owner, i).call()
      ])
      table.push({
        id: fileItem.id,
        ipfshash: fileItem.ipfshash,
        owner: fileItem.owner,
        filename: web3.utils.hexToUtf8(fileItem.filename),
        timestamp: new Date(Number(fileItem.timestamp) * 1000).toLocaleString(),
        tags: tags.map(tag => (EMPTY_BYTES32.test(tag) ? 'N/A' : web3.utils.hexToUtf8(tag)))
      })
    }
    this.setState({ table })
  }

  render () {
    const networkId = this.props.web3.networkId === undefined ? 1 : this.props.web3.networkId
    return (
      <div className='container'>
        <ErrorBoundary>
          <h2>Files Table</h2>
          <table className='table'>
            <thead>
              <tr>
                <th><i className='fas fa-file' /> FileName</th>
                <th><i className='fas fa-user' /> Owner Eth Address</th>
                <th><abbr title='Unique identifier on the InterPlanetary File System'><i className='fas fa-hashtag' /> Ipfs Hash</abbr></th>
                <th><i className='fas fa-clock' /> TimeStamp</th>
                <th><i className='fas fa-tag' /> Tags</th>
              </tr>
            </thead>
            <tbody>
              {this.state.table.map(ipfsRow =>
                <tr key={ipfsRow.id}>
                  <td>{ipfsRow.filename}</td>
                  <td>
                    <EthAddress
                      address={ipfsRow.owner}
                      visibleCharacters={12}
                      networkId={networkId}
                      etherscan
                    />
                  </td>
                  <td>
                    <a href={IPFSURL + ipfsRow.ipfshash} target='_blank' rel='noopener noreferrer'>View File</a>
                  </td>
                  <td>{ipfsRow.timestamp}</td>
                  <td>
                    <div className='tags'>
                      {ipfsRow.tags.map((tag, j) =>
                        <span key={j} className={'tag ' + TAG_CLASSES[j]}>{tag}</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ErrorBoundary>
      </div>
    )
  }
}

FileTable.contextTypes = {
  drizzle: PropTypes.object
}

export default FileTable
```

`contextTypes` is how `drizzle-react` exposed the Drizzle instance to class components. It only works up to React 18. The table loads once on mount, so new uploads appear after a reload. For live updates, Drizzle's `cacheCall` keeps contract reads in its store and refreshes them when the contract changes.

## Gotchas

- Everything stored here (filenames, tags, IPFS hashes, usernames) is public on-chain. Because the IPFS hashes are public, anyone can fetch the files while they're still pinned.
- Each `files`/`getFileTags` read is a separate RPC call, so the table makes two calls per file. With hundreds of files, an indexer or reading the `fileAdded` event logs would be faster.
- If you rebuild this today, Hardhat or Foundry replace Truffle, and ethers or viem replace Drizzle and web3.js.
