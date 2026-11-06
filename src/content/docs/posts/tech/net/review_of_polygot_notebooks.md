---
title: Review of Polygot Notebooks
description: My thoughts of polygot notebooks after writing a book with them
alt: my first blog post
tags: ["polygot", "csharp"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 21 December 2024
imgSrc: '/imgs/2023/590655340.png'
---

Polygot notebooks are a fanastic way to do data science. They allow you to use multiple languages in a single notebook. My personal preference is the vs code extension formerly .net interactive offered as a vs code extension.

Using the code from https://towardsdev.com/how-to-rank-software-engineers-using-bash-c8b1bd8885fb,

I can grab the data from the CSV file and put it into a list of strings.
```cs
using System.IO;
using System.Linq;
using System.Globalization;
using CsvHelper;
using System;

// Read data from CSV file
var records = new List<dynamic>();
using (var reader = new StreamReader("data/changes_by_file.csv"))
using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
{
    records = csv.GetRecords<dynamic>().ToList();
}

// Extract data for chart
var counts = records.Select(r => r.Count);
var file = records.Select(r => r.File);

// export authors as list of string
var countsList = counts.ToList();
// get value from counts
var fileList = file.ToList();
```

The script reads data from a CSV file located at "data/changes_by_file.csv" using CsvHelper library to parse the CSV file. It creates a list of dynamic objects where each object represents a row in the CSV file.

After reading the data, it extracts two columns from the CSV file: "Count" and "File" by projecting them into separate lists using Linq.

Finally, it exports the counts list and file list as separate variables called countsList and fileList, respectively, by converting them to a list using ToList() method.


```fsharp
#!share --from csharp countsList
#!share --from csharp fileList
open Plotly.NET
let intList = countsList |> Seq.cast<string> |> List.ofSeq |> List.map System.Double.Parse
intList |> List.map (fun x -> double x)
let newKeys = fileList |> Seq.cast<string> |> List.ofSeq
let column = Chart.Column(values = intList, Keys = newKeys)
column
```

The script above first loads the Plotly.NET package and then performs some data manipulation and plotting.

The script uses the shared variables "countsList" and "fileList" from a C# notebook (using the #!share magic command) to create a column chart using the Plotly.NET library.

First, it converts the countsList from a list of strings to a list of doubles using Seq.cast<string> |> List.ofSeq |> List.map System.Double.Parse.

Then, it creates a new list called newKeys by casting the fileList to a list of strings.

Next, it creates a new column chart using the Chart.Column method of the Plotly.NET package. It passes in the values from the intList and keys from the newKeys list.

Finally, the column object is displayed in the output.

[!aspnet](imgs/2023/tech/newplot.png)


## Conclusion

Overall polyglot notebooks can be fairly good for data science, do not recommend using the C# bindings Plotly.NET for data science, and prefer using F# for data science.

More content like this is available in my book on amazon kdp.

[![C# Programming](https://m.media-amazon.com/images/I/414HUhz-9gL.jpg)](https://www.amazon.com/dp/B0BY18F7HB) 