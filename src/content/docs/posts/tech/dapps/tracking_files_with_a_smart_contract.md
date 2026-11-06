---
title: Tracking files with a smart contract
description: react native template for a basic app
pubDate: Saturday, 2 June 2023 13:00:00 GMT
tags: ["solidity", "dapp"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-26 21.10.41 - decentralized network diagram simple bobble heads.png'
---

## Smart Contracts

This Solidity contract is a simple file list that stores information about files that are uploaded to it. It uses a struct called File to store each file's information, which includes a unique ID, the file's IPFS hash, the file's name, an array of tags, the owner's address, and a timestamp.

The contract has a mapping called files, which maps an address (the owner's address) to an array of File structs. It also has another mapping called lastIds, which stores the last ID used for each owner's File array.

The contract has two events: fileAdded and tagsAdded. The fileAdded event is triggered when a new file is added to the list, and it includes the file's ID, IPFS hash, and name as parameters. The tagsAdded event is triggered when tags are added to a file, and it includes the file's tags as a parameter.

The contract has two public functions: addFile and getFileTags. The addFile function allows a user to add a new file to the list by providing the file's IPFS hash, name, and tags. It stores the new file in the files mapping and increments the lastIds value for the owner. The getFileTags function allows a user to retrieve the tags for a specific file by providing the owner's address and the file's index in the owner's File array. It returns the file's tags as an array of bytes32 values.

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
   // Owner => last files id
   mapping(address => uint256) public lastIds;
   // consider mapping hash to set of tags
   
   /// @dev main event for smart contract, needed for drizzle to update list of files
   event fileAdded (uint256 fileid, string ipfshash, bytes32 _filename);
   event tagsAdded (bytes32[5] tags);

   /// @dev Add a file to the list
   /// @param ipfshash an ipfshash returned after an image is finished uploaded
   /// @param _filename name of file as a bytes32 as filenames should be short
   /// @param tags array of bytes32 used for sorting/searching files (e,g. blockchain, school, textbook)
   /// @notice updates mappings todos and lastIds
   function addFile(string ipfshash, bytes32 _filename, bytes32[5] tags) public {
 
      File memory myFile = File(lastIds[msg.sender], ipfshash, _filename, tags,  msg.sender, now);
      // explicitly store tags
      myFile.tags = tags;
      emit tagsAdded (myFile.tags);
      // store new file in mapping

      files[msg.sender][lastIds[msg.sender]] = myFile;
      // emit event, also need for drizzle
      emit fileAdded(lastIds[msg.sender],ipfshash,_filename);
      if(lastIds[msg.sender] >= maxAmountOfFiles) lastIds[msg.sender] = 0;
      else lastIds[msg.sender]++;
   }
   
   /// @dev return the tags for a specific file 
   /// @param owner --- address of person who uploaded the file 
   /// @param _index --- the file desired, (first file uploaded, second , etc ...)
   function getFileTags(address owner, uint256 _index) external view returns (bytes32[5]) {
       return files[owner][_index].tags;
  }
}
```

This Solidity contract is an authentication contract that allows users to sign up, log in, update their information, and delete their accounts.

The contract has a struct called User that stores a user's name and the timestamp of when the user was created. It has a mapping called users that maps an address (the user's address) to a User struct. It also has an array called allUsers that stores the addresses of all users that have signed up.

The contract has four events: UserCreated, UserUpdated, UserDeleted, and UserLoggedIn. The UserCreated event is triggered when a new user is created and includes the user's address, name, and creation timestamp as parameters. The UserUpdated event is triggered when a user updates their name and includes the user's address and new name as parameters. The UserDeleted event is triggered when a user deletes their account and includes the user's address as a parameter. The UserLoggedIn event is triggered when a user logs in and includes the user's address as a parameter.

The contract has four public functions: login, signup, update, and destroy. The login function allows a user to log in to their account by returning their name. The signup function allows a user to create a new account by providing their name. It checks if the user already exists and, if not, creates a new user and stores it in the users mapping. The update function allows a user to update their name by providing a new name. It updates the user's name in the users mapping. The destroy function allows a user to delete their account. It removes the user's information from the users mapping and emits the UserDeleted event.


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
  
  // make info public???
  mapping (address => User) private users;
  
  // public array that contains list of all users that have registered 
  address[] public allUsers;
  modifier onlyExistingUser {
    // Check if user exists or terminate

    require(!(users[msg.sender].name == 0x0));
    _;
  }

  modifier onlyValidName(bytes32 name) {
    // Only valid names allowed

    require(!(name == 0x0));
    _;
  }
  
  /// @return username
  function login() 
  public
  view 
  onlyExistingUser
  returns (bytes32) {
    return (users[msg.sender].name);
  }
  
  /// @param name the username to be created. 
  /// @dev checks if user exists
  /// If yes return user name 
  /// If no, check if name was sent 
  /// If yes, create and return user 
  /// @return username of created user
  function signup(bytes32 name)
  public
  payable
  onlyValidName(name)
  returns (bytes32) {

    if (users[msg.sender].name == 0x0)
    {
        users[msg.sender].name = name;
	    users[msg.sender].created_at = now;
        
        allUsers.push(msg.sender);
        emit UserCreated(msg.sender,name,now);
        return (users[msg.sender].name);
    }

    return (users[msg.sender].name);
  }
  
  /// @param name updating username
  /// @dev updating user name 
  /// @return updated username 
  function update(bytes32 name)
  public
  payable
  onlyValidName(name)
  onlyExistingUser
  returns (bytes32) {
    // Update user name.

    if (users[msg.sender].name != 0x0)
    {
        users[msg.sender].name = name;
        
        emit UserUpdated(msg.sender,name);
 
        return (users[msg.sender].name);
    }
  }
  
  /// @dev destroy existing username 
  function destroy () 
  public 
  onlyExistingUser {
    delete users[msg.sender];
    emit UserDeleted(msg.sender);
  }
}
```

This code is a part of a Drizzle-React application. It exports a component called HomeContainer, which is connected to the Drizzle store using the drizzleConnect function from the drizzle-react library. The drizzleConnect function takes a component (in this case, the Home component) and a function called mapStateToProps as arguments and returns a new component that is connected to the Drizzle store.

The mapStateToProps function maps the state of the Drizzle store (which includes the accounts, contracts, and drizzleStatus properties) to the props of the Home component. This allows the Home component to access the state of the Drizzle store and use it to display information about the Ethereum accounts and contracts in the application.

The HomeContainer component will be re-rendered whenever the state of the Drizzle store changes, which allows it to stay up-to-date with the latest information from the Ethereum network.


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

This code is a React component that displays a table of files stored in a Solidity contract. It receives the contract's address and the owner's address as props and uses them to retrieve information about the files from the contract.

The component uses the Drizzle context and the drizzle-react library to interact with the contract. It has a constructor function that initializes the component's state and binds the contract's methods and properties to the component. It also has a componentDidMount lifecycle method that is called when the component is mounted to the DOM. In this method, the component retrieves the last ID of the files stored in the contract for the owner's address and uses a loop to retrieve information about each file. It then stores the file information in a table and updates the component's state with the table.

The component has a timeConverter helper function that converts a Unix timestamp to a human-readable date and time string. It also has a loadTableRow function that generates a table row for a file by mapping the file's information to table cells.

Finally, the component has a render method that generates the HTML for the component. It uses the loadTableRow function to generate a table row for each file in the table and displays the table to the user.





```js
import React, { Component } from 'react'

import { IPFSURL } from '../util/constants'
import EthAddress from './EthAddress'

import ErrorBoundary from './ErrorBoundary'

class FileTable extends Component {
  /**
     *
     * @param {props} props the standard props object in react
     * @param {context} context the drizzle context object used to manage contract state
     */
  constructor (props, context) {
    super(props, context)
    this.drizzle = this.context.drizzle
    this.web3 = this.props.web3
    this.contracts = this.props.contracts
    this.fileListAddress = this.drizzle.contracts.FileList.methods
    this.fileArray = []
    this.state = {
      lastIds: 0,
      table: [],
      fileOwnerAddress: this.props.fileOwnerAddress
    }
  }
  componentDidMount () {
    // consider using cacheCall to store the actual table, so that it updates
    this.drizzle.contracts.FileList.methods.lastIds(this.state.fileOwnerAddress).call()
      .then((lastIds) => {
        this.setState({
          lastIds: lastIds
        })
      })
    var table = []
    // looks like an struct within an array can't be stored so easily
    // var tags = []
    // improve error handling when zero files are added
    this.drizzle.contracts.FileList.methods.lastIds(this.state.fileOwnerAddress).call()
      .then((lastIds) => {
        // eslint-disable-line no-loop-func
        for (let i = 0; i < lastIds; i++) {
          this.drizzle.contracts.FileList.methods.files(this.state.fileOwnerAddress, i).call()
            .then((fileItem) => {
              // add file item to table, missing tags
              fileItem.filename = this.drizzle.web3.utils.hexToUtf8(fileItem.filename)
              fileItem.timestamp = this.timeConverter(fileItem.timestamp)
              /** Can't return bytes from struct array, maybe split this into into another loop?. */
              this.drizzle.contracts.FileList.methods.getFileTags(this.state.fileOwnerAddress, i).call()
                .then((tags) => {
                  // console.log(tags)
                  // convert all non 0 bytes tag fields to hex
                  for (var j = 0; j < 5; j++) {
                    if (tags[j] !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                      // console.log(tags[j])
                      tags[j] = this.drizzle.web3.utils.hexToUtf8(tags[j])
                    } else {
                      // console.log(tags[j])
                      tags[j] = 'N/A'
                    }
                  }
                  fileItem.tags = tags
                  console.log(tags)
                })
              // console.log(fileItem)
              // add fileItem to table
              table.push(fileItem)
            })
        }
      })
    // consider modification all timestamps (now => unix timestamp)
    // also modify tags to shorter them to string
    // so have another function cleanup table and then set this.fileArray

    this.fileArray = table
  }
  timeConverter (unixTimeStamp) {
    var a = new Date(unixTimeStamp * 1000)
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    var year = a.getFullYear()
    var month = months[a.getMonth()]
    var date = a.getDate()
    var hour = a.getHours()
    var min = a.getMinutes()
    var sec = a.getSeconds()
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec
    return time
  }
  loadTableRow (index) {
    this.drizzle.contracts.FileList.methods.files(this.state.fileOwnerAddress, 0).call()
      .then((fileItem) => {
        return fileItem
      })
  }

  render () {
    // See https://menubar.io/reactjs-tables
    return (
      <div className='container'>
        <ErrorBoundary>
          <h2> Files Table </h2>
          <table className='table'>
            <thead>
              <tr>
                <th><i className='fas fa-file' /> FileName</th>
                <th><i className='fas fa-user' /> Owner Eth Address</th>
                <th><abbr title='Unique Identifier on the interplanetery file system'> <i className='fas fa-hashtag' /> Ipfs Hash </abbr> </th>
                <th><abbr title='Unix Timestamp'> <i className='fas fa-clock' />  TimeStamp</abbr></th>
                <th><i className='fas fa-tag' /> Tags</th>
              </tr>
            </thead>
            <tbody>
              {this.fileArray !== undefined &&
                 this.fileArray.map(ipfsRow =>
                   <tr>
                     <td key={ipfsRow.filename}>{ipfsRow.filename}</td>
                     <td>
                       <EthAddress
                         address={ipfsRow.owner}
                         visibleCharacters={12}
                         networkId={this.props.web3.networkId === undefined ? 1 : this.props.web3.networkId}
                         etherscan
                       />

                     </td>
                     <td><a href={IPFSURL + ipfsRow.ipfshash} target='_blank'>
                        View File </a>
                     </td>
                     <td>{ipfsRow.timestamp}</td>
                     {/** Return inputted Tags */
                       (ipfsRow.tags !== undefined && ipfsRow.tags.length > 3) &&
                       <td>
                         <div className='tags'>
                           <span className='tag is-success'>{ipfsRow.tags[0]}</span>
                           <span className='tag is-info'>{ipfsRow.tags[1]}</span>
                           <span className='tag is-danger'>{ipfsRow.tags[2]}</span>
                           <span className='tag is-link'>{ipfsRow.tags[3]}</span>
                           <span className='tag is-primary'>{ipfsRow.tags[4]}</span>
                         </div>
                       </td>
                     }
                   </tr>
                 )}
            </tbody>
          </table>
        </ErrorBoundary>
      </div>

    )
  }
}
```