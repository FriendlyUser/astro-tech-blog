---
tags: ["js", "deno", "typescript"]
title: Downloading League of Legends match history with Deno and the Riot API
description: A Deno script that pages through a player's League of Legends match IDs with Riot's match-v5 API, plus why custom games don't show up.
pubDate: Fri, 25 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/262205434.png
---

:::caution[match-v4 has been removed]
The [original script](https://github.com/FriendlyUser/deno-riot-games-custom-games/tree/master) called `/lol/match/v4/matchlists/by-account/{accountId}`. Riot has since removed match-v4. Its replacement, match-v5, identifies players by PUUID instead of account ID, and it's served from regional hosts like `americas.api.riotgames.com` rather than platform hosts like `na1`. The code below uses match-v5.
:::

Riot Games publishes a REST API for League of Legends: player accounts, ranked data, match history and match details. Every request needs an API key in the `X-Riot-Token` header. You can get a development key from the [Riot Developer Portal](https://developer.riotgames.com/). It expires every 24 hours and is rate-limited to 20 requests per second and 100 requests per 2 minutes.

The goal of this script was to dump a player's whole match history to a JSON file so it could be analysed offline.

## Getting the match IDs

Match-v5 splits match history into two calls:

1. `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=100` returns up to 100 match IDs, newest first.
2. `GET /lol/match/v5/matches/{matchId}` returns the full match.

To get a PUUID, look up the player's Riot ID (`gameName#tagLine`) with account-v1.

```ts
// grab_matches.ts
const API_KEY = Deno.env.get("RIOT_API_KEY");
const RIOT_ID = Deno.env.get("RIOT_ID"); // e.g. "SomePlayer#NA1"
if (!API_KEY || !RIOT_ID) {
  throw new Error("Set RIOT_API_KEY and RIOT_ID");
}

// Regional routing host: americas, asia, europe or sea.
const REGION = "https://americas.api.riotgames.com";
const headers = { "X-Riot-Token": API_KEY };
const PAGE_SIZE = 100; // the maximum the endpoint allows

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function riotGet<T>(url: string | URL): Promise<T> {
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`${resp.status} from ${url}: ${await resp.text()}`);
  }
  return await resp.json() as T;
}

const [gameName, tagLine] = RIOT_ID.split("#");
const { puuid } = await riotGet<{ puuid: string }>(
  `${REGION}/riot/account/v1/accounts/by-riot-id/` +
    `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
);

const allMatchIds: string[] = [];
for (let start = 0; ; start += PAGE_SIZE) {
  const url = new URL(`${REGION}/lol/match/v5/matches/by-puuid/${puuid}/ids`);
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", String(PAGE_SIZE));

  const ids = await riotGet<string[]>(url);
  console.log(`start=${start}: ${ids.length} matches`);
  if (ids.length === 0) break;
  allMatchIds.push(...ids);

  // 1.5 s between calls keeps a development key under 100 requests / 2 minutes.
  await sleep(1500);
}

await Deno.writeTextFile("./allData.json", JSON.stringify(allMatchIds, null, 2));
console.log(`Wrote ${allMatchIds.length} match IDs`);
```

Put the key and Riot ID in a `.env` file:

```bash
RIOT_API_KEY=RGAPI-...
RIOT_ID=SomePlayer#NA1
```

Then run the script:

```bash
deno run --env-file=.env --allow-env --allow-net --allow-write=allData.json grab_matches.ts
```

The script needs `--allow-write` because it saves the results to disk. The original only granted env and net permissions, which isn't enough to write the file. `--env-file` loads `.env` without a third-party dotenv module, which replaces the old `deno.land/x/dotenv` import. The old `writeJson` helper from `deno.land/std/fs` was removed from the standard library, so the script now calls `JSON.stringify` and `Deno.writeTextFile` instead.

To get champion, KDA, items and so on, loop over `allMatchIds` and call `/lol/match/v5/matches/{matchId}`. That's one request per match, so a long history takes a while on a development key.

## Why custom games are missing

The point of the original project was to collect custom games, and they never showed up in the match list. Riot doesn't expose custom-game history through a normal API key, for privacy reasons. Its [League of Legends policies](https://developer.riotgames.com/docs/lol) say products may not publicly display a player's custom-match history unless the player opts in. Otherwise that data is only available to the player through Riot Sign-On (RSO).

If you're organising the custom games yourself, use the Tournament API. You generate tournament codes for the lobbies, and Riot sends a callback with the match ID when each game ends. You can then fetch that match with match-v5 like any other.

## References

- https://github.com/FriendlyUser/deno-riot-games-custom-games/tree/master
- [Riot Developer Portal: League of Legends docs](https://developer.riotgames.com/docs/lol)
