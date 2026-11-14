---
description: Serialize and deserialize C# objects with Newtonsoft.Json, customise names
  and settings, query JSON with LINQ to JSON, and stream large files.
imgSrc: /imgs/2023/DALL·E 2022-12-17 17.59.40 - book being placed into bookshelf in
  a library.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-26T23:24:40.000Z'
lastUpdated: 2026-11-14
tags: ["csharp", "dotnet"]
title: 'Newtonsoft.Json in C#: serialization, settings and LINQ to JSON'
---

Newtonsoft.Json (also called Json.NET) is a JSON library for .NET written by James Newton-King and released under the MIT licence. It converts C# objects to and from JSON, and it includes `JObject`/`JArray` types for reading and editing JSON without defining classes first.

Since .NET Core 3.0, .NET has also shipped its own serializer, `System.Text.Json`, and ASP.NET Core uses it by default. For new code, Microsoft recommends `System.Text.Json`. Newtonsoft.Json is still maintained, though. The current stable release is 13.0.4, and many existing libraries and codebases depend on it. Because of differences in default behaviour (for example, case sensitivity and how strictly it parses), switching an existing project over is not a drop-in change. Microsoft's [migration guide](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/migrate-from-newtonsoft) lists the differences.

The examples below use Newtonsoft.Json 13.0.4 and C# top-level statements, and they build without warnings on .NET 9.

## Installing

```bash
dotnet add package Newtonsoft.Json
```

## Serializing and deserializing

`JsonConvert.SerializeObject` turns an object into a JSON string, and `JsonConvert.DeserializeObject<T>` turns a JSON string back into an object. Attributes on the class control property names and how enums are written:

```csharp
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

var person = new Person { Name = "Jane Doe", Age = 28, Gender = Gender.Female };

string json = JsonConvert.SerializeObject(person, Formatting.Indented);
Console.WriteLine(json);
// {
//   "full_name": "Jane Doe",
//   "Age": 28,
//   "Gender": "Female"
// }

Person? back = JsonConvert.DeserializeObject<Person>(json);
Console.WriteLine($"{back?.Name}, {back?.Age}, {back?.Gender}");
// Jane Doe, 28, Female

public class Person
{
    [JsonProperty("full_name")]
    public string Name { get; set; } = "";

    public int Age { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public Gender Gender { get; set; }
}

public enum Gender { Male, Female }
```

Without `StringEnumConverter`, enums are written as numbers (`"Gender": 1`). When deserializing, property names are matched case-insensitively by default.

## Settings instead of attributes

When you can't or don't want to change the class, pass `JsonSerializerSettings`. This writes camelCase names and leaves out null properties:

```csharp
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

var settings = new JsonSerializerSettings
{
    ContractResolver = new CamelCasePropertyNamesContractResolver(),
    NullValueHandling = NullValueHandling.Ignore,
    Formatting = Formatting.Indented,
};

Console.WriteLine(JsonConvert.SerializeObject(new User { FirstName = "Ada" }, settings));
// {
//   "firstName": "Ada"
// }

public class User
{
    public string FirstName { get; set; } = "";
    public string? Nickname { get; set; }
}
```

By default, JSON properties that don't match any member are silently ignored. To reject them instead, for example to catch typos in a config file, set `MissingMemberHandling.Error`:

```csharp
var strict = new JsonSerializerSettings { MissingMemberHandling = MissingMemberHandling.Error };

try
{
    JsonConvert.DeserializeObject<User>(@"{""FirstName"":""Ada"",""Typo"":1}", strict);
}
catch (JsonSerializationException ex)
{
    Console.WriteLine(ex.Message);
    // Could not find member 'Typo' on object of type 'User'. Path 'Typo', line 1, position 26.
}
```

## LINQ to JSON

`JObject.Parse` gives you a mutable tree of `JToken`s. It's useful when the shape of the JSON varies, or when you only need a few values. Because `JToken` implements `IEnumerable<JToken>`, the normal LINQ operators work (you need `using System.Linq`, which the SDK's implicit usings already include):

```csharp
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

string doc = """
{
  "people": [
    { "name": "John Doe", "age": 30 },
    { "name": "Jane Doe", "age": 28 },
    { "name": "Alice", "age": 25 }
  ]
}
""";

JObject root = JObject.Parse(doc);

var names = root["people"]!
    .Where(p => (int)p["age"]! >= 28)
    .Select(p => (string?)p["name"])
    .ToList();
Console.WriteLine(string.Join(", ", names)); // John Doe, Jane Doe

// Tokens are mutable
root["people"]![0]!["age"] = 31;
Console.WriteLine(root["people"]![0]!.ToString(Formatting.None));
// {"name":"John Doe","age":31}
```

The explicit casts (`(int)`, `(string?)`) convert a `JToken` to a CLR value. They throw if the token can't be converted. `token.Value<T>()` does the same conversion.

## Streaming large files

`JsonConvert` works on strings, so the whole document has to fit in memory as text. For large files, read from a stream with `JsonTextReader` and a `JsonSerializer`. To process an array one element at a time without loading all of it:

```csharp
using Newtonsoft.Json;

var serializer = new JsonSerializer();

using var file = File.OpenText("people.json");
using var reader = new JsonTextReader(file);

while (reader.Read())
{
    if (reader.TokenType == JsonToken.StartObject)
    {
        var p = serializer.Deserialize<Entry>(reader);
        Console.WriteLine($"{p?.Name} is {p?.Age}");
    }
}

public class Entry
{
    public string Name { get; set; } = "";
    public int Age { get; set; }
}
```

This assumes `people.json` is a flat array of objects. If the objects have nested objects of their own, `Deserialize` reads each whole element, so the loop still only sees the top-level elements.

## Gotchas

- **`TypeNameHandling` is a security risk.** Setting it to anything other than `None` writes .NET type names into the JSON and creates those types on deserialization. With untrusted input, an attacker can choose which types get created. Leave it at `None`, or restrict it with a custom `ISerializationBinder`.
- **BSON has its own package.** `BsonReader` and `BsonWriter` in the main package are marked obsolete. Use `BsonDataReader` and `BsonDataWriter` from the separate `Newtonsoft.Json.Bson` package instead.
- **Dates.** By default, strings that look like dates are parsed into `DateTime` when you load a `JObject`, which can change offsets and precision. Set `DateParseHandling = DateParseHandling.None` (on `JsonSerializerSettings` or the reader) if you want the raw string.
- **Don't mix the two serializers' attributes.** `[JsonProperty]` (Newtonsoft) and `[JsonPropertyName]` (System.Text.Json) are different attributes, and each library ignores the other's.

## Further reading

- [Json.NET documentation](https://www.newtonsoft.com/json/help/html/Introduction.htm)
- [Serialization settings](https://www.newtonsoft.com/json/help/html/SerializationSettings.htm)
- [Newtonsoft.Json on NuGet](https://www.nuget.org/packages/Newtonsoft.Json)
