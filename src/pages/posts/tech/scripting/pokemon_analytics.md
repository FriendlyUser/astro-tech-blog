---
title: Analytics on Pokemon using polygot notebooks
description: Using .NET scripting to analyze Pokemon data
pubDate: Saturday, 14 May 2023 13:00:00 GMT
tags: ["graphql", ".net", "polygot"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-25 21.48.12 - teddy bear on coach looking out the window at a tree.png'
---


For the first post to scrap data, see

https://friendlyuser.github.io/posts/tech/flutter/scrapping_data_for_pokedex/

This code is trying to retrieve a JSON array from the specified URL, parse it into a list of Pokemon objects, and then print out the names of the first 10 Pokemon objects in the list.

Here's a breakdown of what each part of the code is doing:


1. The HttpClient object is used to send HTTP requests and receive HTTP responses from a specified URI.
2. The GetAsync method sends a GET request to the specified URI and returns the response as a Task object. The Result property of the Task object is used to get the actual HttpResponseMessage object.
3. The Content property of the HttpResponseMessage object contains the body of the response, which is the JSON array in this case. The ReadAsStringAsync method is used to read the content as a string.
4. The JsonSerializer.Deserialize method is used to parse the JSON string into a list of Pokemon objects.
5. The loop iterates through the first 10 Pokemon objects in the list and prints out their names.

```csharp
// load json array from https://raw.githubusercontent.com/FriendlyUser/flutter_pokedex/main/scripts/clean_pokemon.json
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;

public class PokemonV2Pokemontype
{
    public PokemonV2Type pokemon_v2_type { get; set; }
}

public class PokemonV2Type
{
    public string name { get; set; }
    // public int move_damage_class_id { get; set; }
    public int generation_id { get; set; }
    public int id { get; set; }
}

public class Pokemon
{
    public string name { get; set; }
    public int id { get; set; }
    public int pokemon_species_id { get; set; }
    public List<PokemonV2Pokemontype> pokemon_v2_pokemontypes { get; set; }
    public string img_src { get; set; }
}

public class PokemonList
{
    public List<Pokemon> pokemon { get; set; }
}

// load json array from https://raw.githubusercontent.com/FriendlyUser/flutter_pokedex/main/scripts/clean_pokemon.json
var client = new HttpClient();
var response = client.GetAsync("https://raw.githubusercontent.com/FriendlyUser/flutter_pokedex/main/scripts/clean_pokemon.json").Result;
var content = response.Content.ReadAsStringAsync().Result;

// parse content into a list of Pokemon objects
List<Pokemon> pokemonList = 
                JsonSerializer.Deserialize<List<Pokemon>>(content);

// print out the first 10 pokemon
for (int i = 0; i < 10; i++)
{
    Console.WriteLine(pokemonList[i].name);
}
```

Then we install the depedencies and run the script

```csharp
#i "nuget:https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet7/nuget/v3/index.json" 
#i "nuget:https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet-tools/nuget/v3/index.json" 
#r "nuget: Plotly.NET, 3.0.1"
#r "nuget: Plotly.NET.Interactive, 3.0.2"
```

This code is using the #i and #r directives to install and reference NuGet packages in a .NET project.

The #i directive is used to install a NuGet package source, which is a location where packages can be found and downloaded. The first #i directive installs the package source for the .NET 7 runtime, and the second #i directive installs the package source for .NET tools.

The #r directive is used to reference a NuGet package in the project. The first #r directive references the Plotly.NET package, which is a library for creating interactive and animated charts and graphs in .NET. The second #r directive references the Plotly.NET.Interactive package, which provides interactive features for plots created with the Plotly.NET library.

These directives are typically used at the top of a .NET script file or in a paket.dependencies file to manage the packages used in a project.

```csharp
using System.Linq;
using Microsoft.FSharp.Core;
using Plotly.NET;
using static Plotly.NET.GenericChartExtensions;
using Plotly.NET.LayoutObjects;
// group the pokemon by type, can have duplicates

var groupedPokemon = new Dictionary<string, int>();

foreach (var pokemon in pokemonList)
{
    foreach (var type in pokemon.pokemon_v2_pokemontypes)
    {
        if (groupedPokemon.ContainsKey(type.pokemon_v2_type.name))
        {
            groupedPokemon[type.pokemon_v2_type.name] = groupedPokemon[type.pokemon_v2_type.name] + 1;
        }
        else
        {
            groupedPokemon.Add(type.pokemon_v2_type.name, 1);
        }
    }
}


void makePlot(Dictionary<string, int> dataDict, string xTitle, string yTitle, string title, int width = 1280) 
{
    var x = dataDict.Keys.ToArray();
    var y = dataDict.Values.ToArray();

    LinearAxis xAxis = new LinearAxis();
    xAxis.SetValue("title", xTitle);
    xAxis.SetValue("showgrid", false);
    xAxis.SetValue("showline", true);

    LinearAxis yAxis = new LinearAxis();
    yAxis.SetValue("title", yTitle);
    yAxis.SetValue("showgrid", false);
    yAxis.SetValue("showline", true);

    Layout layout = new Layout();
    layout.SetValue("xaxis", xAxis);
    layout.SetValue("yaxis", yAxis);
    layout.SetValue("title", title);
    layout.SetValue("width", width);

    Trace trace = new Trace("bar");
    trace.SetValue("x", x);
    trace.SetValue("y", y);
    trace.SetValue("mode", "markers");
    // trace.SetValue("name", characterName);

    var chart = GenericChart.ofTraceObject(true, trace).WithLayout(layout);

    // figure out how to save static files
    var data = GenericChart.toChartHTML(chart);
    DisplayExtensions.DisplayAs(data,"text/html");
}
makePlot(groupedPokemon, "Type", "Number", "Number of pokemon per type (up to generation viii", 1280);
```

This code is creating a bar chart using the Plotly.NET library to visualize the number of Pokémon of each type in the pokemonList collection.

Here's a breakdown of what each part of the code is doing:

1. The groupedPokemon dictionary is initialized to store the types of Pokémon as keys and the number of Pokémon of each type as values.
2. The foreach loop iterates over each Pokémon in the pokemonList and updates the groupedPokemon dictionary by incrementing the count for each type of Pokémon that the current Pokémon has.
3. The makePlot function is defined to take a dictionary of data, the titles for the x and y axes, a title for the chart, and an optional width parameter. The function creates a LinearAxis object for the x and y axes and sets various properties for them. It then creates a Layout object to specify the overall layout of the chart, including the x and y axes, the title, and the width.
4. A Trace object is created to specify the data for the chart and set various properties for the data series, such as the mode (which determines how the data points are plotted).
5. The GenericChart.ofTraceObject method is used to create a GenericChart object from the Trace object, and the WithLayout method is used to apply the layout to the chart.
6. The GenericChart.toChartHTML method is used to generate the HTML code for the chart, and the DisplayExtensions.DisplayAs method is used to display the chart as an HTML page in the console.


![pokedex](/imgs/2023/pokedex_types.png)


```csharp
// number of pokemon per generation

var groupedPokemonByGeneration = new Dictionary<string, int>();

foreach (var pokemon in pokemonList)
{
    if (groupedPokemonByGeneration.ContainsKey(pokemon.pokemon_v2_pokemontypes.First().pokemon_v2_type.generation_id.ToString()))
    {
        groupedPokemonByGeneration[pokemon.pokemon_v2_pokemontypes.First().pokemon_v2_type.generation_id.ToString()] = groupedPokemonByGeneration[pokemon.pokemon_v2_pokemontypes.First().pokemon_v2_type.generation_id.ToString()] + 1;
    }
    else
    {
        groupedPokemonByGeneration.Add(pokemon.pokemon_v2_pokemontypes.First().pokemon_v2_type.generation_id.ToString(), 1);
    }
}

makePlot(groupedPokemonByGeneration, "Generation", "Number", "Number of types by generation (up to generation viii)", 1280);
```


As you can see new types were adding in gen 6 and gen 2, believe its steel and fairy.

![pokedex](/imgs/2023/pokedex_types_by_gen.png)

```csharp
// starting letters for pokemon plot


var groupedPokemonByFirstLetter = new Dictionary<string, int>();

foreach (var pokemon in pokemonList)
{
    var firstLetter = pokemon.name.Substring(0, 1);
    if (groupedPokemonByFirstLetter.ContainsKey(firstLetter))
    {
        groupedPokemonByFirstLetter[firstLetter]++;
    }
    else
    {
        groupedPokemonByFirstLetter.Add(firstLetter, 1);
    }
}

// plot 
makePlot(groupedPokemonByFirstLetter, "First Letter", "Number", "Number of pokemon by first letter", 1280);
```

![pokedex](imgs/2023/pokedex_by_first_letter.png)

## References
https://friendlyuser.github.io/pokemon_stats/