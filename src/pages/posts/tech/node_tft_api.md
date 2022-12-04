---
title: Teamfight tactics Client api made in node
description: A quick summary of my client library for tft made in node.js
alt: Bintray Removed
layout: '@/templates/BasePost.astro'
pubDate: Wed, 23 Dec 2022 13:00:00 GMT
tags: ["node.js", "javascript"]
imgSrc: '/imgs/2022/dall-e/corgiUpInATree.jpeg  '
imgAlt: 'Image post 6'
---


The Riot API is a set of APIs developed by Riot Games that provide access to data and information about their games, such as League of Legends and Teamfight Fight Tactics. These APIs allow developers to access game data, player information, match history, and other data to build applications and tools that enhance the player experience. The Riot API is available for use by registered developers, and requires an API key for access to its data and services.


```js
export interface RiotInterface {
  REGION_URL: RegionalUrls | string,
  PLATFORM_URL: PlatformUrls | string,
  getAllTftMatchesByPuuid(encryptedPUUID: string): Promise<Array<number>>
  getTftByMatchId(matchId: string): Promise<TFTMatch>
  // summoner info endpoints
  getTftSummonerByName(summonerName: string): Promise<SummonerObj>
  getTftSummonerByAccount(account: string): Promise<SummonerObj>
  getTftSummonerByPuuid(puuid: string): Promise<SummonerObj>
  getTftSummonerById(id: string): Promise<SummonerObj>
}
```

This interface appears to define the RiotInterface, which is a collection of methods that can be used to access information about TFT matches and summoners. The interface defines four methods for accessing summoner information, and two methods for getting information about TFT matches. It also defines two constant properties, REGION_URL and PLATFORM_URL, which specify the URLs for accessing the TFT APIs for different regions and platforms.


```js
 public async getTftByMatchId(matchId: string = null): Promise<TFTMatch> {
    if (!matchId) throw new Error('matchId cannot be null')
    // wNAH--jmUok3Ln2Gbt0VHl_qfJhk8OJEFmC5o_fWyr3eD4D1e34x2WIfeGY8i_7kfmZ9fPrQtH-hCg
    const matchData: TFTMatch = await fetch(
      `https://${this.REGION_URL}/tft/match/v1/matches/${matchId}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: TFTMatch) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return matchData
  }
```

This is a method within the RiotInterface interface that is used to retrieve a TFT match by its match ID. The method takes a matchId parameter, which is used to specify the ID of the match to retrieve. If no matchId is provided, the method will throw an error.

The method uses the fetch API to send a GET request to the TFT API to retrieve the match data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a TFTMatch object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```js
 // blank array, send error message
  public async getAllTftMatchesByPuuid(encryptedPUUID: string = null): Promise<Array<number>> {
    if (!encryptedPUUID) throw new Error('encryptedPUUID cannot be null')
    // wNAH--jmUok3Ln2Gbt0VHl_qfJhk8OJEFmC5o_fWyr3eD4D1e34x2WIfeGY8i_7kfmZ9fPrQtH-hCg
    const makeIds: Array<number> = await fetch(
      `https://${this.REGION_URL}/tft/match/v1/matches/by-puuid/${encryptedPUUID}/ids`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: Array<number>) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return makeIds
  }
```

This is a method within the RiotInterface interface that is used to retrieve the IDs of all TFT matches for a specific summoner, identified by their player unique ID (PUUID). The method takes an encryptedPUUID parameter, which is used to specify the PUUID of the summoner to retrieve match data for. If no encryptedPUUID is provided, the method will throw an error.

The method uses the fetch API to send a GET request to the TFT API to retrieve the match data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as an array of match IDs.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```js
 const userInfo: SummonerObj = await fetch(
      `https://${this.PLATFORM_URL}/tft/summoner/v1/summoners/by-name/${summonerName}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: SummonerObj) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return userInfo
  }
```

This is a method within the RiotInterface interface that is used to retrieve information about a summoner by their summoner name. The method takes a summonerName parameter, which is used to specify the name of the summoner to retrieve data for.

The method uses the fetch API to send a GET request to the TFT API to retrieve the summoner data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a SummonerObj object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```js
public async getTftSummonerByAccount(accountId: string = 'VYHdpIsp43b0woR8kx0_crrwd5lMfP4H0ot6290JlTpOjus'): Promise<SummonerObj> {
    const userInfo: SummonerObj = await fetch(
      `https://${this.PLATFORM_URL}/tft/summoner/v1/summoners/by-account/${accountId}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: SummonerObj) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return userInfo
  }
```

This is a method within the RiotInterface interface that is used to retrieve information about a summoner by their account ID. The method takes an accountId parameter, which is used to specify the account ID of the summoner to retrieve data for. If no accountId is provided, the method will use a default value.

The method uses the fetch API to send a GET request to the TFT API to retrieve the summoner data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a SummonerObj object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```ts
public async getTftSummonerById(id: string = '0D5n4exiMYZSO4V9FK_W8Pia_GPZyQyKheDLuKGN94YTP24'): Promise<SummonerObj> {
    const userInfo: SummonerObj = await fetch(
      `https://${this.PLATFORM_URL}/tft/summoner/v1/summoners/${id}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: SummonerObj) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return userInfo
  }
```

This is a method within the RiotInterface interface that is used to retrieve information about a summoner by their summoner ID. The method takes an id parameter, which is used to specify the summoner ID of the summoner to retrieve data for. If no id is provided, the method will use a default value.

The method uses the fetch API to send a GET request to the TFT API to retrieve the summoner data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a SummonerObj object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```js
 public async getTftAdvLeague(leagueName: AdvLeague | string = AdvLeague.challenger): Promise<LeagueListDTO> {
    const userInfo: LeagueListDTO = await fetch(
      `https://${this.PLATFORM_URL}/tft/league/v1/${leagueName}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: LeagueListDTO) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return userInfo
  }
```

This is a method within the RiotInterface interface that is used to retrieve information about an advanced TFT league. The method takes a leagueName parameter, which is used to specify the name of the league to retrieve data for. If no leagueName is provided, the method will use a default value of AdvLeague.challenger.

The method uses the fetch API to send a GET request to the TFT API to retrieve the league data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a LeagueListDTO object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```js
public async getTftLeagueById(leagueId: string): Promise<LeagueListDTO> {
    const userInfo: LeagueListDTO = await fetch(
      `https://${this.PLATFORM_URL}/tft/leagues/${leagueId}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: LeagueListDTO) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return userInfo
  }
```
This is a method within the RiotInterface interface that is used to retrieve information about a TFT league by its league ID. The method takes a leagueId parameter, which is used to specify the ID of the league to retrieve data for.

The method uses the fetch API to send a GET request to the TFT API to retrieve the league data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a LeagueListDTO object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

```js
public async getTftMatches(encryptedSummonerId: string): Promise<LeagueListDTO> {
    const userInfo: LeagueListDTO = await fetch(
      `https://${this.PLATFORM_URL}/tft/league/v1/entries/by-summoner/${encryptedSummonerId}`,
      this.makeFetchOptions()
    )
    .then( (resp: any) => {
      return resp.json() 
    })
    .then( (jsonObj: LeagueListDTO) => {
      return jsonObj
    })
    .catch( (err: any) => {
      // do logging
      throw new Error('Failed to Get Data from Riot TFT API')
    })
    return userInfo
  }
```

This is a method within the RiotInterface interface that is used to retrieve information about a TFT summoner's matches. The method takes an encryptedSummonerId parameter, which is used to specify the summoner's encrypted ID.

The method uses the fetch API to send a GET request to the TFT API to retrieve the summoner's match data. The fetch options are specified using the makeFetchOptions method, which is not shown here. The fetch request returns a Promise, which is resolved with the JSON response from the TFT API. This response is then parsed and returned as a LeagueListDTO object.

If there is an error with the fetch request, the method will throw an error and log the failure to retrieve the data from the TFT API.

The full source code is available at:

https://github.com/FriendlyUser/node-tft/tree/master