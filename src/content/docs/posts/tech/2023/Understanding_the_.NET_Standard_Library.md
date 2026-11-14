---
description: "What .NET Standard is, how its versions map to .NET Framework and .NET, and when to target netstandard2.0 instead of a .NET 5+ TFM today."
imgSrc: /imgs/2023/454515535.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-05-12T13:35:03.000Z'
lastUpdated: 2026-11-14
tags: ["dotnet", "csharp"]
title: "What .NET Standard is and when to target it"
---

:::note
.NET Standard is not deprecated, but it is frozen: there will be no versions after 2.1. Since .NET 5, a single `netX.0` target framework covers most cases that .NET Standard used to. The main reason to target it today is sharing a library with .NET Framework.
:::

.NET Standard is a specification: a versioned list of APIs that every conforming .NET implementation (.NET Framework, .NET Core / .NET 5+, Mono, Xamarin, Unity, UWP) promises to provide. It contains no code of its own. If you compile a library against `netstandard2.0`, it can be referenced from any runtime that implements .NET Standard 2.0 or higher.

## The problem it solved

Before .NET Standard, each .NET platform shipped its own base class library, and the APIs didn't line up. The earlier answer was Portable Class Libraries (PCLs), where you picked a combination of platforms and got the intersection of their APIs. Each combination was its own "profile", which made targeting and versioning messy.

.NET Standard replaced the profiles with a single linear version number. You pick one version, and the set of runtimes that can use your library follows from it.

## Versioning rules

Two rules, from the official docs:

- **Additive.** Each version includes all APIs of the previous one. A library built for 1.4 also works on anything that implements 2.0.
- **Immutable.** Once a version ships, it doesn't change.

Higher versions give you more APIs but fewer runtimes. The two versions that matter in practice:

| Target | API count (of 37,118) | .NET Framework | .NET / .NET Core |
| --- | --- | --- | --- |
| `netstandard2.0` | 32,638 | 4.6.1+ (4.7.2+ recommended) | 2.0+ |
| `netstandard2.1` | 37,118 | Not supported | 3.0+ |

NuGet treats .NET Framework 4.6.1 as compatible with .NET Standard 2.0, but Microsoft notes several problems consuming such libraries from 4.6.1 and recommends 4.7.2 or later.

## Targeting it

A .NET Standard library is just a class library with a `netstandard` target framework moniker (TFM):

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
</Project>
```

Most widely used NuGet libraries multi-target: `netstandard2.0` for reach (including .NET Framework), plus a modern .NET TFM so .NET 5+ consumers get newer APIs:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>netstandard2.0;net10.0</TargetFrameworks>
  </PropertyGroup>
</Project>
```

NuGet picks the closest match for each consumer. A .NET 10 app gets the `net10.0` build, and a .NET Framework 4.8 app gets the `netstandard2.0` build.

## When to use it today

- **Sharing code with .NET Framework:** target `netstandard2.0`.
- **App-internal libraries on modern .NET:** target the same `netX.0` as the app. There's no reason to restrict yourself to the .NET Standard API set.
- **Reusable libraries that don't need .NET Framework:** Microsoft recommends skipping `netstandard2.1` and targeting .NET 5+ directly.
- **`netstandard1.x`:** avoid it. It pulls in a large graph of small NuGet packages, and since .NET 9 the SDK emits a build warning for 1.x targets.

## Gotchas

- Compiling against .NET Standard doesn't guarantee your code runs everywhere. The standard includes some APIs that throw `PlatformNotSupportedException` on certain runtimes. The platform compatibility analyzer in the .NET 5+ SDK catches many of these cases.
- New APIs reached .NET Standard slowly, because each one had to be implementable on every platform. That delay is the main reason Microsoft moved to the single .NET 5+ line.

## Further reading

- [.NET Standard overview (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/net-standard)
- [Cross-platform targeting guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting)
- [The future of .NET Standard](https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/)
