---
title: "Getting started with NLog in .NET: configuration, targets and ASP.NET Core"
pubDate: "2023-05-03T14:16:44.586Z"
lastUpdated: 2026-11-14
description: "Install NLog, write an NLog.config with file and console targets, log from C#, add layouts and filters, and plug NLog into ASP.NET Core logging."
tags: ["dotnet", "csharp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3292707171.webp
---
[NLog](https://nlog-project.org/) is a logging library for .NET. You write log calls in code, and a config file decides where each message goes (files, the console, databases, and other *targets*) and in what format. Changing where logs go doesn't require a recompile. This post was revised against NLog 6.x (6.2.2 on NuGet at the time of writing).

## Installing

```bash
dotnet add package NLog
```

Or from the Package Manager Console in Visual Studio:

```powershell
Install-Package NLog
```

## A minimal NLog.config

NLog looks for a file named `NLog.config` next to your application's executable. Add it to the project root and set it to copy to the output directory, either through Visual Studio's "Copy to Output Directory: Copy if newer" setting or in the `.csproj`:

```xml
<ItemGroup>
  <None Update="NLog.config" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>
```

The file itself:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <targets>
    <target name="logfile" xsi:type="File" fileName="${basedir}/logs/app.log" />
  </targets>

  <rules>
    <logger name="*" minlevel="Info" writeTo="logfile" />
  </rules>

</nlog>
```

`<targets>` defines where messages can go; `<rules>` decides which messages go where. This rule sends everything at `Info` or above from every logger (`name="*"`) to the file. `${basedir}` is the application's base directory, so the log ends up under `bin/.../logs/` rather than wherever the process happened to be started from.

## Logging from C#

```csharp
using System;
using NLog;

public class Program
{
    private static readonly Logger Logger = LogManager.GetCurrentClassLogger();

    public static void Main(string[] args)
    {
        Logger.Info("Application started");

        try
        {
            var orderId = 42;
            Logger.Debug("Processing order {OrderId}", orderId);
            // Your application logic here
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Processing failed");
        }
        finally
        {
            Logger.Info("Application stopped");
            LogManager.Shutdown(); // flush buffered targets before exit
        }
    }
}
```

A few things to note:

- `GetCurrentClassLogger()` names the logger after the class (`Program` here), which is what `name="..."` in a rule matches against.
- The levels, from lowest to highest, are `Trace`, `Debug`, `Info`, `Warn`, `Error` and `Fatal`. With the config above, the `Debug` call is dropped.
- `{OrderId}` is a message template placeholder, not string interpolation. NLog keeps `OrderId` as a named property, which structured targets (JSON layouts, Seq, and so on) can store separately.
- Pass the exception as the first argument to `Error` rather than concatenating `ex.Message`, so the layout can include the full stack trace.
- `LogManager.Shutdown()` flushes and closes targets. Without it, a short-lived console app can exit before the last messages are written.

## Multiple targets

Rules are evaluated independently, so one message can go to several targets:

```xml
<targets>
  <target name="logfile" xsi:type="File" fileName="${basedir}/logs/app.log" />
  <target name="console" xsi:type="Console" />
</targets>

<rules>
  <logger name="*" minlevel="Info" writeTo="logfile" />
  <logger name="*" minlevel="Debug" writeTo="console" />
</rules>
```

Here `Debug` messages show up in the console only, while `Info` and above go to both.

## Custom layouts

The `layout` attribute controls the format of each line:

```xml
<target name="logfile" xsi:type="File"
        fileName="${basedir}/logs/app.log"
        layout="${longdate} | ${logger} | ${uppercase:${level}} | ${message} ${exception:format=ToString}" />
```

That produces lines like `2026-11-14 10:15:02.1234 | Program | INFO | Application started`. The [layout renderers list](https://nlog-project.org/config/?tab=layout-renderers) has everything you can put inside `${...}`.

## Filtering

Filters let a rule drop specific messages:

```xml
<rules>
  <logger name="*" minlevel="Info" writeTo="logfile">
    <filters defaultAction="Log">
      <when condition="contains('${message}', 'FilterMeOut')" action="Ignore" />
    </filters>
  </logger>
</rules>
```

Set `defaultAction="Log"` explicitly. Since NLog 5.0, the default is `Ignore`, so a `<filters>` block without it discards every message that no condition explicitly logs. The original version of this example left it out, which on current NLog silently drops all output for that rule.

## Using NLog with ASP.NET Core

For ASP.NET Core, install the integration package, which brings in NLog and the `Microsoft.Extensions.Logging` provider:

```bash
dotnet add package NLog.Web.AspNetCore
```

Then register it in `Program.cs`:

```csharp
using NLog.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Host.UseNLog();

var app = builder.Build();

app.MapGet("/", (ILogger<Program> logger) =>
{
    logger.LogInformation("Hello endpoint called");
    return "Hello";
});

app.Run();
```

`ClearProviders()` removes the default console and debug providers so messages aren't written twice. Your code keeps using the standard `ILogger<T>` interface; NLog only decides where the output goes. Since NLog 5, the `Logging:LogLevel` filters in `appsettings.json` are ignored by default and your NLog rules decide what gets written. If you'd rather keep filtering in `appsettings.json`, set the `RemoveLoggerFactoryFilter` provider option to `false`.

## Gotchas

- NLog 6 changed the File target: archiving options such as `ArchiveNumbering` and `ConcurrentWrites` were removed. If you're upgrading an older config, read the [NLog 6.0 major changes](https://nlog-project.org/2025/04/29/nlog-6-0-major-changes.html) post first.
- By default NLog doesn't throw when something is wrong with the config or a target; you just get no output. Set `internalLogFile="c:\temp\nlog-internal.log" internalLogLevel="Warn"` on the `<nlog>` element to see why.

## Further reading

- [NLog configuration file reference](https://github.com/NLog/NLog/wiki/Configuration-file)
- [Getting started with ASP.NET Core](https://github.com/NLog/NLog/wiki/Getting-started-with-ASP.NET-Core-6)
- [When filter reference](https://github.com/NLog/NLog/wiki/When-Filter)
