---
tags: ['csharp', 'dotnet']
title: "Introduction to C# and .NET: history, the dotnet CLI, and basic collections"
description: "A short history of C# and .NET, the dotnet CLI commands you'll use daily, List, Dictionary and tuple examples, and how .NET compares with Java."
pubDate: Fri, 24 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/118660664.png"
---
C# (pronounced "C sharp") is a statically typed, object-oriented language from Microsoft that runs on .NET. This post covers where it came from, what ".NET" means today, the `dotnet` command-line tool, and the three collection types you'll reach for first. It ends with a short comparison with Java.

## A short history of C#

Work on C# started at Microsoft in the late 1990s under Anders Hejlsberg, the original author of Turbo Pascal and chief architect of Delphi. The language was announced in 2000, and C# 1.0 shipped in early 2002 with Visual Studio .NET 2002 and .NET Framework 1.0. Its syntax comes from the C family, and early C# looked a lot like Java.

Since then it has gained a major feature in most releases: generics (C# 2.0, 2005), LINQ and lambdas (3.0, 2007), `async`/`await` (5.0, 2012), tuples and pattern matching (7.0, 2017), nullable reference types (8.0, 2019), and records and top-level statements (9.0, 2020). Since C# 9 (2020), a new version has shipped every November alongside each .NET release. At the time of writing, the newest is C# 15, which shipped with .NET 11 in November 2026. Microsoft's [C# version history](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-version-history) lists what each release added.

## What ".NET" means

The name covers two different runtimes, which is a common source of confusion:

- **.NET Framework** (2002) is the original, Windows-only runtime. It's still supported as part of Windows but only gets maintenance updates. Older WinForms, WPF and ASP.NET (non-Core) apps run on it.
- **.NET Core** (2016) was a cross-platform, open-source rewrite. From version 5 (2020) it dropped "Core" from the name and became just **.NET**. This is what new projects should target. Even-numbered releases are long-term support (LTS), odd-numbered ones are standard-term support (STS); .NET 10 (November 2025) is the current LTS.

Modern .NET runs on Windows, Linux and macOS. At its core is the runtime (the CLR, which JIT-compiles intermediate language to native code and manages memory with a garbage collector) and a large base class library: collections, I/O, networking, JSON, cryptography and so on. C#, F# and Visual Basic all compile to the same intermediate language, so libraries written in one can be used from the others.

You'll see .NET used for web APIs and sites (ASP.NET Core), desktop apps (WinForms and WPF, which are Windows-only), cross-platform mobile and desktop apps (.NET MAUI, which replaced Xamarin), cloud services, and games (Unity uses C# for scripting).

## The dotnet CLI

The [.NET SDK](https://dotnet.microsoft.com/download) installs the `dotnet` command, which works the same on every OS. The commands you'll use most:

| Command | What it does |
| --- | --- |
| `dotnet new console -n MyApp` | Create a project from a template (`console`, `webapi`, `classlib`, `xunit`, ...) |
| `dotnet build` | Compile the project or solution |
| `dotnet run` | Build and run the project |
| `dotnet test` | Run the tests in a test project |
| `dotnet add package <name>` | Add a NuGet package reference |
| `dotnet restore` | Download dependencies (`build`, `run` and `test` do this automatically) |
| `dotnet publish -c Release` | Produce a deployable build |

A full loop from nothing to a running program:

```bash
dotnet new console -n Hello
cd Hello
dotnet run
```

## Lists, dictionaries and tuples

The examples below are complete `Program.cs` files for a project created with `dotnet new console`. They use top-level statements, so there's no `Main` method or class to write.

### `List<T>`

`List<T>` is a resizable array of `T`. Indexing is O(1), and `Add` is amortized O(1).

```csharp
var numbers = new List<int>();
numbers.Add(1);
numbers.Add(2);
numbers.Add(3);

foreach (var number in numbers)
{
    Console.WriteLine(number);
}

Console.WriteLine($"First: {numbers[0]}, Count: {numbers.Count}");
```

### `Dictionary<TKey, TValue>`

`Dictionary<TKey, TValue>` is a hash table of unique keys:

```csharp
var ages = new Dictionary<string, int>
{
    ["John"] = 30,
    ["Jane"] = 25,
};
ages.Add("Jim", 35);

foreach (var (name, age) in ages)
{
    Console.WriteLine($"{name} is {age} years old.");
}

if (ages.TryGetValue("Alice", out var aliceAge))
{
    Console.WriteLine($"Alice is {aliceAge}");
}
else
{
    Console.WriteLine("No entry for Alice");
}
```

Two things trip people up: `Add` throws `ArgumentException` if the key already exists (use the indexer, `ages["Jim"] = 36`, to insert or overwrite), and reading a missing key with `ages["Alice"]` throws `KeyNotFoundException`. `TryGetValue` avoids both the exception and a second lookup. Also don't rely on iteration order; it isn't guaranteed.

### Tuples

Tuples group a few values without declaring a type. They're handy for returning more than one value from a method. C# tuples are `System.ValueTuple` structs, and you can name the elements:

```csharp
(string Name, int Age) GetPerson()
{
    return ("John", 30);
}

var person = GetPerson();
Console.WriteLine($"{person.Name} is {person.Age} years old.");

// Or deconstruct straight into variables
var (name, age) = GetPerson();
Console.WriteLine($"{name} is {age} years old.");
```

If the same group of values gets passed around in several places, a `record` (`record Person(string Name, int Age);`) is usually clearer than a tuple.

## .NET compared with Java

Both are mature, garbage-collected, JIT-compiled platforms used heavily for back-end and enterprise software, and either is a reasonable choice for most server work. The differences that tend to matter in practice:

- **Languages.** .NET supports C#, F# and Visual Basic. The JVM also hosts several languages: Java, Kotlin, Scala, Groovy and Clojure. Neither platform locks you into one language.
- **Cross-platform.** Both run on Windows, Linux and macOS. That has been true of Java from the start; for .NET it's true of .NET Core and modern .NET, not the older .NET Framework. Old claims that .NET is "designed for Windows" describe .NET Framework.
- **Ecosystem.** Java's ecosystem is older and larger, with several competing options for most things (Spring, Quarkus and Micronaut for web, for example) and a lot of big-data tooling (Kafka, Hadoop, Spark). .NET's is more centralized: Microsoft ships the main web framework (ASP.NET Core), ORM (Entity Framework Core) and tooling, which means fewer choices but less assembly required.
- **Tooling.** On .NET, the common IDEs are Visual Studio (Windows), JetBrains Rider, and VS Code with the C# Dev Kit. On Java, IntelliJ IDEA and Eclipse dominate.
- **Microsoft stack.** If you already run on Azure, SQL Server, or Active Directory / Entra ID, .NET's first-party libraries for them are a practical advantage.

If your team already knows one platform well, that usually outweighs any of the differences above. For a new project with no existing preference, it's worth building a small prototype in each and seeing which one fits your deployment and hiring situation.

## Further reading

- [C# documentation](https://learn.microsoft.com/dotnet/csharp/)
- [.NET CLI overview](https://learn.microsoft.com/dotnet/core/tools/)
- [.NET support policy](https://dotnet.microsoft.com/platform/support/policy/dotnet-core) for which versions are LTS and when they go out of support
