---
description: "What .NET (formerly .NET Core) is made of, how releases and support work, how to build and publish an app, and which app types it supports."
imgSrc: /imgs/2023/1938616315.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-20T11:47:23.000Z'
lastUpdated: 2026-11-14
tags: ["dotnet", "csharp"]
title: ".NET Core overview: runtime, SDK, release cycle and app types"
---

:::caution
The ".NET Core" name was retired after .NET Core 3.1, which went out of support in December 2022. From .NET 5 onward the product is just called **.NET**. This post covers that same platform under its current name; ".NET Framework" is the older, Windows-only runtime.
:::

.NET is Microsoft's open-source, cross-platform runtime and SDK for building apps in C#, F#, and Visual Basic. It runs on Windows, macOS, and Linux, and it replaced the Windows-only .NET Framework as the place where new features land. .NET Framework 4.8.x is still supported on Windows, but it only gets fixes.

## What's in the box

- **Runtime (CoreCLR).** Loads your compiled IL, JIT-compiles it to machine code, and provides garbage collection, exception handling, and threading.
- **Base class libraries.** Collections, I/O, networking, `System.Text.Json`, LINQ, async/await support, and so on.
- **ASP.NET Core runtime.** A separate shared framework for web apps and APIs.
- **SDK and `dotnet` CLI.** Compilers, MSBuild, NuGet, project templates, and the `dotnet` command that drives them.

## Releases and support

A new major version ships every November. Even-numbered releases are Long Term Support (LTS, three years of support); odd-numbered releases are Standard Term Support (STS, two years). At the time of writing, .NET 10 (November 2025) is the current LTS release and .NET 11 (November 2026) is the current STS release. Check the [support policy page](https://dotnet.microsoft.com/platform/support/policy/dotnet-core) before choosing a version, since end-of-support dates are fixed in advance.

## Build, run and publish

The CLI is the same on every OS:

```bash
dotnet new console -o HelloDotnet
cd HelloDotnet
dotnet run
```

`dotnet new console` generates a `Program.cs` with top-level statements:

```csharp
Console.WriteLine("Hello, World!");
```

When you publish, you choose how the app ships:

```bash
# Framework-dependent: small output, needs the .NET runtime installed on the target
dotnet publish -c Release

# Self-contained: bundles the runtime for one platform, no install needed
dotnet publish -c Release -r linux-x64 --self-contained

# Native AOT: compiles ahead of time to a single native executable
dotnet publish -c Release -r linux-x64 -p:PublishAot=true
```

Native AOT (available since .NET 7) gives faster startup and lower memory use, which helps for CLI tools and serverless functions. The trade-off is that code relying on runtime reflection or dynamic code generation may not work; the compiler reports trimming and AOT warnings when it finds such code.

## What you can build

- **Web apps and APIs** with ASP.NET Core: MVC, Razor Pages, minimal APIs, Blazor, SignalR, and gRPC.
- **Console apps and background services** using the generic host (`Host.CreateApplicationBuilder`) and the Worker Service template.
- **Desktop apps.** WPF and Windows Forms run on .NET but only on Windows. For cross-platform UI, the options are .NET MAUI (Microsoft's successor to Xamarin.Forms, whose support ended in May 2024), or third-party frameworks such as Avalonia and Uno Platform.
- **Mobile apps** for Android and iOS through .NET MAUI or the underlying .NET for Android / .NET for iOS workloads.
- **Machine learning and IoT**, through ML.NET and the `System.Device.Gpio` and `Iot.Device.Bindings` packages for GPIO, I2C, and SPI devices.
- **Games**, mostly through engines: Godot supports C# on .NET, while Unity has historically run C# on Mono and IL2CPP and is in the middle of moving to CoreCLR.

## When it might not fit

- You maintain a large .NET Framework app that depends on Web Forms, WCF server, or other APIs that weren't ported. Migration is possible but can be a real project; see Microsoft's [porting guide](https://learn.microsoft.com/dotnet/core/porting/). (The older .NET Upgrade Assistant tool is deprecated in favour of the GitHub Copilot modernization agent in Visual Studio.)
- You need a cross-platform desktop UI that Microsoft supports on Linux. .NET MAUI doesn't target Linux, so you'd rely on Avalonia or Uno.

## Further reading

- [.NET documentation](https://learn.microsoft.com/dotnet/)
- [.NET support policy](https://dotnet.microsoft.com/platform/support/policy/dotnet-core)
- [Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot/)
