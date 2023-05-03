---
title: An Introduction to NLog in dottnet
pubDate: "2023-05-03T14:16:44.586Z"
description: "In this article, we will explore the basics of NLog, how to set it up in a C# project, and how to configure and use it for various logging scenarios."
tags: ["dotnet"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3292707171.png
---
# An Introduction to NLog in dottnet

NLog is a powerful and flexible logging library for .NET applications. It provides a simple, yet highly configurable way to log messages from your C# application. In this article, we will explore the basics of NLog, how to set it up in a C# project, and how to configure and use it for various logging scenarios.

## Table of Contents

1. [Why Use NLog?](#why-use-nlog)
2. [Getting Started with NLog](#getting-started-with-nlog)
3. [Basic Configuration of NLog](#basic-configuration-of-nlog)
4. [Logging in Your C# Application](#logging-in-your-csharp-application)
5. [Advanced Configuration and Usage](#advanced-configuration-and-usage)
6. [Conclusion](#conclusion)

## Why Use NLog? <a name="why-use-nlog"></a>

Logging is an essential part of any application. It helps developers understand the internal workings of the application, track errors and exceptions, and monitor the overall health of the application. NLog stands out as a powerful logging solution for .NET applications due to its:

- Flexibility: NLog allows you to configure multiple log targets, including files, databases, email, and more.
- Performance: NLog is designed to be fast and have minimal impact on application performance.
- Easy integration: NLog is easy to integrate with various .NET applications and frameworks, such as ASP.NET Core, WPF, and Xamarin.

## Getting Started with NLog <a name="getting-started-with-nlog"></a>

To get started with NLog in your C# project, you need to install the NLog NuGet package. You can do this using the Package Manager Console, the .NET CLI, or by adding the package via the NuGet Package Manager in Visual Studio.

**Package Manager Console:**

```powershell
Install-Package NLog
```

**.NET CLI:**

```bash
dotnet add package NLog
```

Once the package is installed, you can start using NLog in your application.

## Basic Configuration of NLog <a name="basic-configuration-of-nlog"></a>

NLog requires a configuration file to define its logging targets, rules, and layout. The most common way to configure NLog is using an XML file named `NLog.config`. Create this file in the root of your project and set its "Copy to Output Directory" property to "Copy if newer". The contents of the file should look like this:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <targets>
    <target name="logfile" xsi:type="File" fileName="file.txt" />
  </targets>

  <rules>
    <logger name="*" minlevel="Info" writeTo="logfile" />
  </rules>

</nlog>
```

In this example, we define a single target named "logfile" that writes log entries to a file called "file.txt". We also set up a rule for all loggers to write log entries with a minimum level of "Info" to the "logfile" target.

## Logging in Your C# Application <a name="logging-in-your-csharp-application"></a>

Now that NLog is configured, you can start using it in your C# code. To do this, create an instance of the `NLog.Logger` class and use its methods to log messages:

```csharp
using NLog;

public class Program
{
    private static readonly Logger Logger = LogManager.GetCurrentClassLogger();

    public static void Main(string[] args)
    {
        Logger.Info("Application started.");

        try
        {
            // Your application logic here
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "An error occurred.");
        }

        Logger.Info("Application stopped.");
    }
}
```

The `Logger` class provides various methods for logging messages with different severity levels, such as `Trace`, `Debug`, `Info`, `Warn`, `Error`, and `Fatal`.

## Advanced Configuration and Usage <a name="advanced-configuration-and-usage"></a>

NLog offers many advanced configuration options and features, such as multiple targets, custom layouts, filtering, and more. Here are some examples:

**Multiple Targets:**

```xml
<targets>
  <target name="logfile" xsi:type="File" fileName="file.txt" />
  <target name="console" xsi:type="Console" />
</targets>

<rules>
  <logger name="*" minlevel="Info" writeTo="logfile" />
  <logger name="*" minlevel="Debug" writeTo="console" />
</rules>
```

This configuration sends log entries with a minimum level of "Info" to afile, and log entries with a minimum level of "Debug" to the console.

**Custom Layout:**

```xml
<targets>
  <target name="logfile" xsi:type="File" fileName="file.txt">
    <layout>${longdate} | ${logger} | ${uppercase:${level}} | ${message} ${exception:format=ToString}</layout>
  </target>
</targets>
```

This configuration sets a custom log message layout that includes the date, logger name, log level, message, and exception information.

**Filtering:**

```xml
<rules>
  <logger name="*" minlevel="Info" writeTo="logfile">
    <filters>
      <when condition="contains('${message}','FilterMeOut')" action="Ignore" />
    </filters>
  </logger>
</rules>
```

This configuration adds a filter that ignores log messages containing the text "FilterMeOut".

**Using NLog with Dependency Injection (ASP.NET Core):**

```csharp
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddLogging(loggingBuilder =>
        {
            loggingBuilder.ClearProviders();
            loggingBuilder.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace);
            loggingBuilder.AddNLog("nlog.config");
        });

        // Other service registrations...
    }
}
```

This code snippet configures NLog to work with the built-in logging system in ASP.NET Core using dependency injection.

## Conclusion <a name="conclusion"></a>

NLog is a powerful and flexible logging library that can greatly enhance your C# application's logging capabilities. With its easy integration, rich configuration options, and support for various .NET platforms, NLog is an excellent choice for developers looking to improve their application's logging infrastructure. Start using NLog in your C# projects today and experience the benefits of a modern, high-performance logging library.
