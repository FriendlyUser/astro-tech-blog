---
title: "Microsoft.Extensions.Configuration: providers, precedence and the options pattern"
pubDate: "2024-08-22T15:54:27.000Z"
lastUpdated: 2026-11-14
description: "How .NET configuration works: providers and their precedence, environment-specific files, environment variables, and binding sections to classes with IOptions."
tags: ["dotnet", "csharp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3619698287.png
---

`Microsoft.Extensions.Configuration` reads settings from JSON files, environment variables, command-line arguments, user secrets and other sources, and merges them into one set of key-value pairs exposed through `IConfiguration`. ASP.NET Core and the generic host set it up for you; you can also use it on its own in any .NET app.

## Keys and sections

Configuration is a flat dictionary of string keys and string values. Hierarchy is expressed with `:` in the key, so this JSON:

```json
{
  "AppSettings": {
    "Title": "My Application",
    "Version": "1.0.0"
  }
}
```

becomes the keys `AppSettings:Title` and `AppSettings:Version`. You can read values directly or get a section:

```csharp
using Microsoft.Extensions.Configuration;

IConfiguration configuration = new ConfigurationBuilder()
    .AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["AppSettings:Title"] = "My Application",
        ["AppSettings:Version"] = "1.0.0",
    })
    .Build();

string? title = configuration["AppSettings:Title"];
IConfigurationSection section = configuration.GetSection("AppSettings");
string? version = section["Version"];
```

Values are always strings. `GetValue<T>` (from the `Microsoft.Extensions.Configuration.Binder` package) converts them: `configuration.GetValue<int>("Cache:Minutes", 5)`.

## Providers and precedence

Each source is a provider, and each lives in its own package:

| Source | Package | Builder method |
| --- | --- | --- |
| In-memory dictionary | `Microsoft.Extensions.Configuration` | `AddInMemoryCollection` |
| JSON file | `Microsoft.Extensions.Configuration.Json` | `AddJsonFile` |
| XML file | `Microsoft.Extensions.Configuration.Xml` | `AddXmlFile` |
| INI file | `Microsoft.Extensions.Configuration.Ini` | `AddIniFile` |
| Environment variables | `Microsoft.Extensions.Configuration.EnvironmentVariables` | `AddEnvironmentVariables` |
| Command line | `Microsoft.Extensions.Configuration.CommandLine` | `AddCommandLine` |
| User secrets | `Microsoft.Extensions.Configuration.UserSecrets` | `AddUserSecrets` |

Providers are applied in the order you add them, and **the last one to set a key wins**:

```csharp
IConfiguration configuration = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args)
    .Build();
```

Here a command-line argument overrides an environment variable, which overrides `appsettings.json`.

Environment variable names can't contain `:` on every platform, so use a double underscore instead: `AppSettings__Title=Prod` sets `AppSettings:Title`.

## Environment-specific settings

`WebApplication.CreateBuilder` and `Host.CreateApplicationBuilder` already load, in order: `appsettings.json`, `appsettings.{Environment}.json`, user secrets (only in the `Development` environment), environment variables, and command-line arguments. The environment name comes from `DOTNET_ENVIRONMENT` or, in ASP.NET Core, `ASPNETCORE_ENVIRONMENT`, and defaults to `Production`.

If you build configuration yourself, do the same thing explicitly:

```csharp
string environment = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Production";

IConfiguration configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .AddJsonFile($"appsettings.{environment}.json", optional: true)
    .AddEnvironmentVariables()
    .Build();
```

Only the keys present in `appsettings.Production.json` replace the base file's values; the rest are inherited.

## Binding to classes with the options pattern

Reading string keys all over the codebase is error-prone. Bind a section to a class once, and inject it with `IOptions<T>`:

```csharp
public class AppSettings
{
    public string Title { get; set; } = "";
    public string Version { get; set; } = "";
}
```

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<AppSettings>()
    .Bind(builder.Configuration.GetSection("AppSettings"))
    .Validate(s => !string.IsNullOrEmpty(s.Title), "AppSettings:Title is required")
    .ValidateOnStart();
```

```csharp
using Microsoft.Extensions.Options;

public class AboutService
{
    private readonly AppSettings _settings;

    public AboutService(IOptions<AppSettings> options)
    {
        _settings = options.Value;
    }

    public string Describe() => $"{_settings.Title} v{_settings.Version}";
}
```

`builder.Services.Configure<AppSettings>(section)` also works; `AddOptions<T>().Bind(...)` is the same thing with validation chained on. `ValidateOnStart` makes a bad configuration fail at startup instead of on the first request that reads it.

Pick the interface by how you want changes to show up:

- `IOptions<T>`: read once, singleton. Changes to the file are ignored.
- `IOptionsSnapshot<T>`: re-read per scope (per request in ASP.NET Core). Can't be injected into singletons.
- `IOptionsMonitor<T>`: singleton that always returns the current value and has an `OnChange` callback.

The last two only see changes if the provider reloads, for example `AddJsonFile(..., reloadOnChange: true)`, which the default builders use.

## Gotchas

- Keys are case-insensitive. `appsettings:title` and `AppSettings:Title` are the same key.
- Binding is lenient: a misspelled property name is silently ignored. Use validation (or `BinderOptions.ErrorOnUnknownConfiguration`) if that matters.
- Don't put secrets in `appsettings.json`. Use user secrets for local development and environment variables or a secret store such as Azure Key Vault in production.

## Further reading

- [Configuration in .NET](https://learn.microsoft.com/dotnet/core/extensions/configuration)
- [Configuration in ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/configuration/)
- [Options pattern in .NET](https://learn.microsoft.com/dotnet/core/extensions/options)
