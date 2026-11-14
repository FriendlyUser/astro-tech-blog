---
description: "What ASP.NET is, how classic ASP.NET on .NET Framework differs from ASP.NET Core, which programming models each offers, and a first minimal API to run."
imgSrc: /imgs/2023/4067359065.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-04-04T12:12:58.000Z'
lastUpdated: 2026-11-14
tags: ["aspnet", "csharp", "dotnet"]
title: "Introduction to ASP.NET: classic ASP.NET vs ASP.NET Core"
---

ASP.NET is Microsoft's framework for building web apps and HTTP APIs on .NET. The name covers two different products: the original **ASP.NET**, which runs on the Windows-only .NET Framework, and **ASP.NET Core**, a cross-platform rewrite that ships with modern .NET. If you start a project today, you want ASP.NET Core. This post explains the split, the programming models in each, and ends with a minimal API you can run.

## Two frameworks with one name

**ASP.NET** shipped with .NET Framework 1.0 in 2002 as the successor to classic Active Server Pages. It runs on Windows, is hosted in IIS, and is built on the `System.Web` assembly. The .NET Framework is now in maintenance: 4.8.1 is the last version, it still gets security fixes as part of Windows, and it gets no new features.

**ASP.NET Core** was released in 2016 as a redesign. It runs on Windows, Linux and macOS, is open source under the MIT licence ([dotnet/aspnetcore](https://github.com/dotnet/aspnetcore)), and ships with each .NET release. As of November 2026 the current release is .NET 11 (released November 10, 2026, Standard Term Support); .NET 10 is the Long Term Support release, supported until November 2028.

The two aren't source-compatible. Porting from ASP.NET to ASP.NET Core means rewriting anything that touches `System.Web`, such as `HttpContext.Current`, `Global.asax` and `web.config` modules.

## Programming models

### Classic ASP.NET (.NET Framework)

- **Web Forms**: pages (`.aspx`) built from server controls with an event model (`Button_Click`) and view state that tracks control state across postbacks. Designed to feel like Windows Forms. It was not ported to ASP.NET Core.
- **ASP.NET MVC**: controllers, actions and Razor views, with routing and model binding. Easier to unit-test than Web Forms.
- **ASP.NET Web API**: controllers that return data (JSON or XML) instead of views, for HTTP services.

### ASP.NET Core

- **MVC controllers**: MVC and Web API were merged into one framework; API controllers derive from `ControllerBase` and views are optional.
- **Razor Pages**: a page-centric model where each `.cshtml` page has its own handler class. Simpler than MVC for form-heavy sites.
- **Minimal APIs**: route handlers mapped directly to lambdas in `Program.cs`, with no controller classes. A good default for small services and JSON APIs.
- **Blazor**: components written in C# and Razor that run on the server (over a SignalR connection) or in the browser via WebAssembly.
- **SignalR** for real-time messaging over WebSockets, and **gRPC** for service-to-service calls.

## Hosting

ASP.NET Core apps contain their own web server, **Kestrel**, and run as an ordinary process (`dotnet MyApp.dll`). In production you can expose Kestrel directly, or put it behind a reverse proxy such as Nginx or YARP. On Windows, IIS can host the app in-process through the ASP.NET Core Module. Classic ASP.NET, by contrast, only runs inside IIS (or IIS Express during development).

## Languages

Classic ASP.NET supports C# and Visual Basic. ASP.NET Core is used almost entirely from C#, which every template and doc sample uses. F# works too (the Giraffe and Falco libraries are popular), but Visual Basic is not supported for ASP.NET Core web projects.

## A first minimal API

Install the [.NET SDK](https://dotnet.microsoft.com/download), then create an empty web project:

```bash
dotnet new web -o HelloApi
cd HelloApi
```

Replace `Program.cs` with:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var todos = new List<Todo>
{
    new(1, "Write the post"),
    new(2, "Run the sample"),
};

app.MapGet("/", () => "Hello World!");

app.MapGet("/todos", () => todos);

app.MapGet("/todos/{id:int}", (int id) =>
    todos.FirstOrDefault(t => t.Id == id) is { } todo
        ? Results.Ok(todo)
        : Results.NotFound());

app.Run();

record Todo(int Id, string Title);
```

Run it with `dotnet run`. The console prints the URL it's listening on (the port comes from `Properties/launchSettings.json`), and `/todos/1` returns `{"id":1,"title":"Write the post"}`. The web SDK's implicit `using` directives cover `WebApplication`, `Results` and LINQ, so no `using` lines are needed. Route parameters such as `{id:int}` bind to the lambda's parameters by name, and returned objects are serialised to camel-cased JSON.

## When to pick what

- **New projects**: ASP.NET Core, on the current LTS release if you want the longest support window.
- **Existing Web Forms or MVC 5 apps**: they keep running on .NET Framework 4.8.x. Migrating is a rewrite of the web layer, so it's usually done incrementally; Microsoft's guidance uses the YARP proxy to move routes one at a time.
- **Static content sites**: a full server framework is more than you need; a static site generator is simpler.

## Further reading

- [ASP.NET Core documentation](https://learn.microsoft.com/aspnet/core/)
- [Choose between ASP.NET and ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/choose-aspnet-framework)
- [Minimal APIs overview](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/overview)
- [.NET support policy](https://dotnet.microsoft.com/platform/support/policy/dotnet-core)
