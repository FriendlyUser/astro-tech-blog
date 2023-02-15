---
tags: ['deno']
title: Using the league of legends api to get games via deno
description: In this post I will show you how to use the league of legends api to get games via deno.
pubDate: Fri, 25 April 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/262205434.png
---
The League of Legends API (Application Programming Interface) is a set of web-based protocols and tools provided by Riot Games, the developer of League of Legends, that allow third-party developers to access data and functionality related to the game.

Using the API, developers can retrieve data such as summoner profiles, match histories, and current game information. This data can be used to build custom websites, mobile applications, or other tools that provide League of Legends players with additional features and functionality beyond what is available in the game itself.

The League of Legends API provides both REST (Representational State Transfer) and real-time streaming endpoints, making it easy for developers to access the data they need. However, to use the API, developers must first obtain an API key from Riot Games and comply with their terms of service.


``` 
import { writeJson } from "https://deno.land/std/fs/mod.ts"
import "https://deno.land/x/dotenv/load.ts"

const player_id = Deno.env.get('ACCOUNT_ID')
const region_url = 'https://na1.api.riotgames.com'
let riot_URL = new URL(`${region_url}/lol/match/v4/matchlists/by-account/${player_id}`)

enum HTTP {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}

interface MatchlistDto {
  startIndex: number
  totalGames: number
  endIndex: number
  matches: Array<any>
}

function makeFetchOptions(
    riotKey = Deno.env.get('RIOT_API_KEY'),
    method: HTTP = HTTP.GET
): object {
  return {
      method: method,
      headers: { 
        "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept-Language":  "en-US,en;q=0.9",
        'X-Riot-Token': riotKey
      }
  }
}

function appendMatchHistory(riot_endpoint: string): Promise<MatchlistDto> {
  const riotKey = Deno.env.get('RIOT_API_KEY')
  console.log(riotKey)
  const options = makeFetchOptions(riotKey)
  return fetch(riot_endpoint, options)
  .then( (resp: any) => {
    console.log(resp)
    return resp.json() 
  })
  .then( (matchData: MatchlistDto) => {
    return matchData
  })
}

const max_iterations = 1000
let bIndex = 0
let eIndex = 100
let current_url = riot_URL
let riot_endpoint = null
let allMatches = []
let customGames = []

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

for (let i = 0; i < max_iterations; i++) {
    console.log(`beginIndex: ${bIndex} endIndex: ${eIndex}`)
    riot_endpoint = current_url.toString()
    const newMatches = await appendMatchHistory(riot_endpoint)
    await sleep(1500)
    current_url.searchParams.delete('beginIndex')
    current_url.searchParams.delete('endIndex')
    const {matches} = newMatches
    if (matches.length == 0) {
      console.log(`ENDING SCRIPT AT ${eIndex} with ${matches.length}`)
      break
    }
    // startIndex becomes endIndex
    bIndex = eIndex
    eIndex = eIndex + 100
    allMatches.push(newMatches.matches)

    // get new url
    current_url.searchParams.append('beginIndex', String(bIndex))
    current_url.searchParams.append('endIndex', String(eIndex))
}

await writeJson(
  "./allData.json",
  allMatches
); 
 ```

This is a TypeScript/JavaScript script that retrieves a player's match history data from the Riot Games API and writes it to a JSON file.

The script imports two modules: "fs" from the Deno standard library and "dotenv" from a third-party package on Deno's module repository. It then uses the `dotenv` module to load environment variables, including the player's account ID and the Riot Games API key.

The script defines an interface `MatchlistDto` which specifies the shape of the data returned by the Riot Games API for a player's match history. It also defines an `HTTP` enum and a `makeFetchOptions` function that creates an options object for use with the `fetch` function, including the Riot Games API key in the request headers.

The main function of the script is `appendMatchHistory`, which takes a Riot Games API endpoint URL and returns a Promise that resolves to the player's match history data. The function uses `fetch` to make a GET request to the endpoint, passing in the options object created by `makeFetchOptions`. The response is then converted to JSON and returned as a Promise.

The script sets up a loop that iteratively retrieves the player's match history data from the Riot Games API in batches of 100, with a delay of 1.5 seconds between each batch to avoid hitting the API rate limit. The script appends each batch of match data to an array, which is then written to a JSON file using the `writeJson` function from the `fs` module.

Note that this script requires the `--allow-env` and `--allow-net` flags to be passed to Deno when running the script, in order to allow it to access environment variables and make HTTP requests to the Riot Games API, respectively.


The League of Legends API does not return custom game data because custom games are not tracked in the same way that public matches are. Custom games are generally created by players for fun, rather than being part of the official competitive play system, so they are not included in the public match history data that is available through the API.

Custom games are typically played with friends or other invited players, and the rules and settings can be customized by the game's creator. Since custom games are not part of the official competitive system, they are not included in the public leaderboards or statistics that are available through the API.

However, it's worth noting that Riot Games does provide some limited access to custom game data through their Tournament API, which allows developers to create custom tournaments and track match data for those tournaments. This API is specifically designed for use in creating custom tournament experiences, and is not intended to be used for general match data retrieval.



## References
- https://github.com/FriendlyUser/deno-riot-games-custom-games/tree/master
