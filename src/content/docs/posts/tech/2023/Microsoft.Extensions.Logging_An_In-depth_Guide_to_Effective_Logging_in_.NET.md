---
title: "Microsoft.Extensions.Logging: configuring providers, filters and structured logs in .NET"
pubDate: "2023-12-22T01:55:57.000Z"
lastUpdated: 2026-11-14
description: "How Microsoft.Extensions.Logging works: ILogger, providers, category filters, appsettings config, message templates and the LoggerMessage generator."
tags: ["csharp", "dotnet"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/microsoft-extensions-logging-an-in-depth-guide-to-effective-logging-in-net.webp"
---

`Microsoft.Extensions.Logging` is the standard logging API in .NET. Your code writes to `ILogger`, and one or more *providers* decide where the messages go (console, debug output, Event Log, or a third-party sink like Serilog or Application Insights). ASP.NET Core and the Generic Host set it up for you; console apps can use it with a couple of lines.

## The pieces

- **`ILogger` / `ILogger<T>`** – what you call: `LogTrace`, `LogDebug`, `LogInformation`, `LogWarning`, `LogError`, `LogCritical`. `ILogger<T>` uses the full type name of `T` as the log *category*.
- **`ILoggerFactory`** – creates loggers for a category and fans each message out to every registered provider.
- **`ILoggerProvider`** – a destination. The built-in ones are Console, Debug, EventSource and EventLog (Windows only). There's no built-in file provider; use a third-party one such as Serilog or NLog for files.
- **Filter rules** – not an interface but configuration: minimum levels per category prefix and optionally per provider, set in code with `AddFilter` or in `appsettings.json`.

## In ASP.NET Core and hosted apps

`WebApplication.CreateBuilder` (and `Host.CreateApplicationBuilder`) already register the Console, Debug, EventSource and, on Windows, EventLog providers, and read filter rules from the `Logging` section of configuration. Adjust it through `builder.Logging`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();                 // drop the defaults
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);  // global minimum
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);

var app = builder.Build();
```

The same rules usually live in `appsettings.json`, which is easier to change per environment:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    },
    "Console": {
      "LogLevel": {
        "Default": "Debug"
      }
    }
  }
}
```

When several rules match, the most specific category prefix wins, and a provider-specific section (here `Console`) overrides the general one for that provider.

Inject `ILogger<T>` wherever you need it:

```csharp
using Microsoft.AspNetCore.Mvc;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        _logger.LogInformation("Index action called");
        return View();
    }
}
```

## In a console app

Add the `Microsoft.Extensions.Logging.Console` package (use the version that matches your .NET version) and create a factory yourself:

```csharp
using Microsoft.Extensions.Logging;

using ILoggerFactory factory = LoggerFactory.Create(builder => builder
    .AddConsole()
    .SetMinimumLevel(LogLevel.Debug));

ILogger logger = factory.CreateLogger("Program");

logger.LogInformation("Processing order {OrderId} for {Customer}", 42, "alice");
```

Dispose the factory before the process exits (the `using` does that here). The console provider writes on a background thread, and disposing flushes it.

## Practices worth following

### Use message templates, not string interpolation

```csharp
// Good: OrderId and Customer are kept as named properties
logger.LogInformation("Processing order {OrderId} for {Customer}", orderId, customer);

// Avoid: the values are baked into a string, and it's formatted even if Information is disabled
logger.LogInformation($"Processing order {orderId} for {customer}");
```

Placeholders are matched to arguments by position, not by name. Providers that support structured logging (Application Insights, Serilog sinks, OpenTelemetry exporters) store `OrderId` and `Customer` as fields you can query.

### Use the `LoggerMessage` source generator on hot paths

Since .NET 6, `[LoggerMessage]` generates a strongly typed logging method that checks the level before doing any work and avoids boxing the arguments:

```csharp
using Microsoft.Extensions.Logging;

public static partial class Log
{
    [LoggerMessage(EventId = 1001, Level = LogLevel.Information,
        Message = "Order {OrderId} shipped")]
    public static partial void OrderShipped(ILogger logger, int orderId);
}

// usage
Log.OrderShipped(logger, 42);
```

### Add context with scopes

```csharp
using (logger.BeginScope("Batch {BatchId}", batchId))
{
    logger.LogInformation("Starting batch");
}
```

Every message logged inside the block carries `BatchId`. The console provider only prints scopes if you enable `IncludeScopes` in its formatter options; structured providers usually record them automatically.

### Pick levels deliberately

Use `Information` for normal application events, `Warning` for things that went wrong but were handled, and `Error` for failures that need attention. Keep `Debug` and `Trace` off in production unless you're investigating something, and turn them on for a single category rather than globally.

### Don't log secrets or personal data

Passwords, tokens, card numbers and personal information shouldn't end up in logs, which tend to be retained longer and accessed more widely than the database.

## Further reading

- [Logging in .NET](https://learn.microsoft.com/dotnet/core/extensions/logging)
- [Logging in ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/logging/)
- [Compile-time logging source generation](https://learn.microsoft.com/dotnet/core/extensions/logger-message-generator)
