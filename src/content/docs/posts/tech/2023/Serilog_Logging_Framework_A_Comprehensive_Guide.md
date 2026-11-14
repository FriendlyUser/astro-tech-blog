---
description: How to set up Serilog for structured logging in .NET, covering message templates, enrichers, sinks, filters, and keeping logging cheap.
imgSrc: /imgs/2023/2126341537_forest.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-24T00:59:46.000Z'
lastUpdated: 2026-11-14
tags: ["dotnet", "csharp"]
title: "Serilog in .NET: structured logging with sinks, enrichers and filters"
---

Serilog is a structured logging library for .NET. Instead of writing a flat string, each log event keeps its values as named properties, so a sink like Seq or Elasticsearch can query `UserId = 42` directly instead of you grepping text.

## Install and configure

Install the core package plus a sink for each destination you want:

```bash
dotnet add package Serilog
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.File
```

Configure the static `Log.Logger` once at startup and flush it on exit:

```csharp
using Serilog;

public class Program
{
    public static void Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.Console()
            .WriteTo.File("logs/myapp-.log", rollingInterval: RollingInterval.Day)
            .CreateLogger();

        try
        {
            Log.Information("Starting up");
            // Your application code here
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "Application terminated unexpectedly");
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }
}
```

With `RollingInterval.Day`, the File sink inserts the date before the extension, so this writes files like `logs/myapp-20261114.log`.

`Log.CloseAndFlush()` matters: sinks that buffer (files, network sinks) can lose the last events if the process exits without it.

## Writing structured events

The levels, from lowest to highest, are `Verbose`, `Debug`, `Information`, `Warning`, `Error` and `Fatal`. Pass values as arguments to a message template rather than building the string yourself:

```csharp
Log.Information("User {UserId} logged in at {LoginTime}", userId, DateTime.UtcNow);

// @ destructures an object into its properties instead of calling ToString()
Log.Information("Processed order {@Order}", order);
```

`UserId` and `LoginTime` are stored as properties on the event. If you write `Log.Information($"User {userId} logged in")` instead, the property names are lost and every distinct string becomes its own template, which defeats the point of using Serilog.

Pass exceptions as the first argument (`Log.Error(ex, "Payment failed for {OrderId}", orderId)`) so sinks get the full exception and stack trace as a separate field.

## Enriching events

Enrichers add properties to every event. `FromLogContext` is built in and lets you attach properties for a block of code; others, like `WithMachineName`, come from extra packages (`Serilog.Enrichers.Environment` in this case).

```csharp
using Serilog;
using Serilog.Context;

Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithMachineName() // from Serilog.Enrichers.Environment
    .Enrich.WithProperty("Application", "MyApp")
    .WriteTo.Console()
    .CreateLogger();

using (LogContext.PushProperty("RequestId", requestId))
{
    // Every event logged here carries RequestId
    Log.Information("Handling request");
}
```

## Sinks

Each destination is a separate NuGet package. Common ones:

- `Serilog.Sinks.Console`: console output.
- `Serilog.Sinks.File`: plain-text or JSON files, with rolling by time or size.
- `Serilog.Sinks.Seq`: sends events to a [Seq](https://datalust.co/seq) server.
- `Elastic.Serilog.Sinks`: Elastic's own sink for Elasticsearch 8.x and later. The older community package, `Serilog.Sinks.Elasticsearch`, is archived and deprecated on NuGet, so don't start new projects with it.

Adding a sink is one more `WriteTo` call. For example, sending events to a local Seq instance:

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.Seq("http://localhost:5341")
    .CreateLogger();
```

If you're shipping files to another system, write JSON rather than text so the properties survive. `Serilog.Formatting.Compact` provides a compact JSON format:

```csharp
using Serilog.Formatting.Compact;

Log.Logger = new LoggerConfiguration()
    .WriteTo.File(new CompactJsonFormatter(), "logs/myapp.clef")
    .CreateLogger();
```

## Filtering

`MinimumLevel` sets the floor for everything, and `MinimumLevel.Override` lets noisy namespaces log less:

```csharp
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .WriteTo.Console()
    .CreateLogger();
```

For filters based on property values, use `Filter` with the helpers in `Serilog.Filters.Matching`. This drops events from health-check requests:

```csharp
using Serilog;
using Serilog.Filters;

Log.Logger = new LoggerConfiguration()
    .Filter.ByExcluding(Matching.WithProperty("RequestPath", "/health"))
    .WriteTo.Console()
    .CreateLogger();
```

For anything more involved, the `Serilog.Expressions` package lets you write filters as text, for example `Filter.ByExcluding("RequestPath like '/health%'")`.

## ASP.NET Core

In ASP.NET Core, install `Serilog.AspNetCore` and register Serilog as the logging provider. It can read its configuration from `appsettings.json`, so you don't have to recompile to change levels:

```csharp
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog(lc => lc
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console());

var app = builder.Build();
app.UseSerilogRequestLogging(); // one summary event per HTTP request
app.Run();
```

Code that uses `ILogger<T>` from `Microsoft.Extensions.Logging` then logs through Serilog, and its message templates are kept as structured properties too.

## Keeping logging cheap

- Disabled levels cost very little, because Serilog checks the level before it renders anything. If computing an argument is expensive, guard it with `Log.IsEnabled(LogEventLevel.Debug)`.
- Slow sinks block the calling thread. Wrap them with `Serilog.Sinks.Async`, e.g. `.WriteTo.Async(a => a.File("logs/myapp-.log", rollingInterval: RollingInterval.Day))`, or pass `buffered: true` to the File sink. Both mean events still in memory are lost if the process crashes before `CloseAndFlush`.
- Use `{@Object}` on small DTOs only. Destructuring a large object graph on every request is slow and fills your log store.

## Further reading

- [Serilog wiki: Getting started](https://github.com/serilog/serilog/wiki/Getting-Started)
- [Message template syntax](https://messagetemplates.org/)
- [Serilog.AspNetCore](https://github.com/serilog/serilog-aspnetcore)
- [Elastic.Serilog.Sinks documentation](https://www.elastic.co/guide/en/ecs-logging/dotnet/current/serilog-data-shipper.html)
