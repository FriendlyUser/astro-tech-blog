---
title: Grabbing list of animes from my anime list using openapi and dotnet
description: Leveraging openapi and scrapping the openapi schema from redoc, I can generate a dotnet client to grab my anime list.
alt: my first blog post
tags: ["dotnet","git", "openapi"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 21 October 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-21 18.23.59 - list of paper.png'
---

# Grabbing list openapi spec from redoc

```python

import requests
import json


# grab 
# const __redoc_state =
def grab_spec_from_redoc(url = "https://myanimelist.net/apiconfig/references/api/v2"):
    r = requests.get(url)
    spec = r.text
    # iterate line by line
    for line in spec.splitlines():
        if "__redoc_state" in line:
            # grab the json
            raw_spec = line.split("= ")[1]
            # remove trailing ;
            raw_spec = raw_spec[:-1]
            break
    # parse json
    redoc_spec = json.loads(raw_spec)
    # go to data.openapi
    openapi_spec = redoc_spec["spec"]["data"]
    # write to file
    with open("spec.json", "w") as f:
        json.dump(openapi_spec, f)

if __name__ == "__main__":
    grab_spec_from_redoc()
```

Grabbing the openapi spec from the redoc script in js, we can easily save that to a json file.

For redoc, the openapi spec is stored in the `__redoc_state` variable. We can grab that variable using regex and save it to a json file.

Note that the openapi spec is stored in the `spec.openapi` variable and could possibly be invalid.

Afer saving the openapi spec to a json file, we can use the openapi generator to generate a dotnet client.

```bash
openapi-generator-cli generate -i myanime_spec.json -g csharp-netcore --additional-properties=targetFramework=net6.0 --additional-properties=nullableReferenceTypes=true
```

This will create folders under src/ called `Org.OpenAPITools` and `Org.OpenAPITools.Test`. We can reference the from `Org.OpenAPITools` to our project and use the generated client.

```csharp
dotnet new console -o src/Anime
dotnet sln add src/Anime
```

This will create a new console project under src/Anime and add it to the solution.

```csharp
// See https://aka.ms/new-console-template for more information
using System;
using System.Collections.Generic;
using System.Diagnostics;
using Org.OpenAPITools.Api;
using Org.OpenAPITools.Client;
using Org.OpenAPITools.Model;


// use AnimeRankingGet for Top Upcoming Anime and Top Airing Anime
string mal_api_key = Environment.GetEnvironmentVariable("MAL_CLIENT_ID");
Configuration config = new Configuration();
config.BasePath = "https://api.myanimelist.net/v2";
// Configure API key authorization: client_auth
config.ApiKey.Add("X-MAL-CLIENT-ID", mal_api_key);
// Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
// config.ApiKeyPrefix.Add("X-MAL-CLIENT-ID", "Bearer");
// Configure OAuth2 access token for authorization: main_auth
// config.AccessToken = "YOUR_ACCESS_TOKEN";

var apiInstance = new AnimeApi(config);

try
{
// Get anime details
Console.WriteLine("----------- UPCOMING -----------");
var upcoming = apiInstance.AnimeRankingGet("upcoming", 20);
// iterate across data
foreach (var item in upcoming.Data)
{
    Console.WriteLine(item.Node.Title);
}
Console.WriteLine("----------- END UPCOMING -----------");

Console.WriteLine("----------- airing -----------");
var airing = apiInstance.AnimeRankingGet("airing", 20);
// iterate across data
foreach (var item in airing.Data)
{
    Console.WriteLine(item.Node.Title);
}
Console.WriteLine("----------- END airing -----------");

}
catch (ApiException e)
{
Console.WriteLine("Exception when calling AnimeApi.AnimeAnimeIdGet: " + e.Message );
Console.WriteLine("Status Code: "+ e.ErrorCode);
Console.WriteLine(e.StackTrace);
}
// get top anime
```

Loosely following the instructions on the openapi generator ReadMe.md, we can generate a dotnet client and use it to grab the top anime and airing from myanimelist.

For my previous articles, I generated subtitled anime openings for anime, but I wanted to generate the anime openings for the top anime on myanimelist. Now I can, but I doubt I will get that many views.