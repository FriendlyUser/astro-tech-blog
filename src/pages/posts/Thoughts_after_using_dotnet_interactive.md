---
title: Initial Thoughts after using dotnet interactive
description: My Thoughts on what todo with jcenter/bintray going down.
alt: Bintray Removed
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Author from '../../components/Author.astro'

pubDate: Mon, 11 Dec 2021 13:00:00 GMT
---

# Summary

Recently, I have played a indie game known as Eternal Return which is a battle royale moba which combines elements from various other games. Instead of purchasing items from a shop you craft items and attempt to be the last survivor.


## Using the Api

Using the Eternal Return api, I was able to experiment with .net notebooks using .net interactive and plotly.net. .NET interactive is essentially jupyter notebooks for C#, this works well with my eternal return client available on github.

My main purpose for using the api was to analyze my ranked games.
Get a sense of where I die, who I die to and what my equipment is like on death.

First I 
* download all the supporting data from the api (similar to getting data dumps from league)
* pull games for an individual player (in this case me)
* analyze all the games and join the data into meaningful strings rather that enums

I found that interactive notebooks can be quite useful if you are using exclusively dotnet libraries or are very comfortable with C#.

```csharp
#i "nuget:https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet6/nuget/v3/index.json" 
#i "nuget:https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet-tools/nuget/v3/index.json" 
#r "nuget: BserClient, 1.4.0"
#r "nuget: Plotly.NET, 2.0.0-preview.16"
#r "nuget: Plotly.NET.Interactive, 2.0.0-preview.16"
```

Sample code to install the eternal return client with plotly.

Recently, dotnet interactive was upgraded to use dotnet 6.0, but luckily it still works with dotnet 5.0 packages.

The main disadvantages of using dotnet interactive include

* unstable api (plotly.net changes rapidly)
* lack of documentation (still in alpha) and not commonly used in data science
* github rendering is inconsistent with the vs code plugin.

![Sample plot](/imgs/2021/hyunwoo_deaths.png)

```csharp
    var chart = GenericChart
        .ofTraceObject(trace)
        .WithLayout(layout);
```

Plotting in `Plotly.NET.Interactive, 2.0.0-preview.6`

```csharp
    var chart = GenericChart
        .ofTraceObject(false, trace);

    chart = GenericChart.setLayout(layout, chart);
```

Plotting in `Plotly.NET.Interactive, 2.0.0-preview.16`.

For those familiar with plotly, it contains all the good plots available in plotly js and for dash.

For a serious commerical project, I would not recommend using dotnet interactive unless you are very familiar with C# and are comfortable being able to figure out errors on your own.

The lack of documentation will definitely turn away some junior developers.

Dotnet interactive is an effective tool for data analysis, although my use case was limited to bar graphs, I think its an good visualization tool.

## References

To view the full source code please view

* https://github.com/FriendlyUser/black-survival-interactive
* https://github.com/FriendlyUser/bser_client

And sign up for an eternal return api key at

https://developer.eternalreturn.io/