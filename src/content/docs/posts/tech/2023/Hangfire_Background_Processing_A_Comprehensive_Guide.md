---
description: "Set up Hangfire in an ASP.NET Core app with SQL Server storage, then enqueue fire-and-forget, delayed and recurring jobs, configure retries, and secure the dashboard."
imgSrc: /imgs/2023/2459232016.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-30T01:44:02.000Z'
lastUpdated: 2026-11-14
tags:
  - csharp
  - dotnet
title: 'Hangfire in ASP.NET Core: background, delayed and recurring jobs'
---

[Hangfire](https://www.hangfire.io/) runs background jobs in .NET applications. You call a method through Hangfire instead of directly, Hangfire stores the call in a database, and a worker picks it up and runs it, retrying on failure. Because jobs are persisted, they survive app restarts. You don't need a separate Windows service or cron. Typical uses are sending email, generating reports, and calling slow third-party APIs outside the HTTP request.

The examples below target Hangfire 1.8 (1.8.25 at the time of revision) on ASP.NET Core with minimal hosting (`Program.cs`).

## How it fits together

- **Client**: `BackgroundJob`, `IBackgroundJobClient` and `RecurringJob` serialize a method call (type, method, arguments) and write it to storage.
- **Storage**: SQL Server via `Hangfire.SqlServer` is the official, free option. Redis and others are available as Hangfire Pro or community packages.
- **Server**: `AddHangfireServer()` starts worker threads in your process that poll storage and run jobs.
- **Dashboard**: a web UI at `/hangfire` showing queues, history, failures and recurring jobs.

The client and server can live in different processes as long as they share storage and the job's types.

## Setup

Install the packages:

```bash
dotnet add package Hangfire.Core
dotnet add package Hangfire.SqlServer
dotnet add package Hangfire.AspNetCore
dotnet add package Microsoft.Data.SqlClient
```

Add a connection string to `appsettings.json`. Hangfire creates its tables (in a `HangFire` schema) on startup, but the database itself must exist:

```json
{
  "ConnectionStrings": {
    "HangfireConnection": "Server=(localdb)\\MSSQLLocalDB;Database=HangfireDemo;Integrated Security=True;"
  }
}
```

Configure it in `Program.cs`:

```csharp
using Hangfire;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("HangfireConnection")));

builder.Services.AddHangfireServer();
builder.Services.AddTransient<EmailSender>();

var app = builder.Build();

app.UseHangfireDashboard(); // served at /hangfire

app.Run();
```

The three serializer and compatibility calls are what the Hangfire docs recommend for new installations. Don't add them blindly to an existing install; follow the upgrade guide instead.

## Enqueuing jobs

Fire-and-forget, run as soon as a worker is free:

```csharp
BackgroundJob.Enqueue(() => Console.WriteLine("Hello, Hangfire!"));
```

Delayed:

```csharp
BackgroundJob.Schedule(() => Console.WriteLine("Delayed job"), TimeSpan.FromMinutes(5));
```

Continuation, which runs after another job succeeds:

```csharp
var parentId = BackgroundJob.Enqueue(() => Console.WriteLine("parent"));
BackgroundJob.ContinueJobWith(parentId, () => Console.WriteLine("continuation"));
```

In real code, inject `IBackgroundJobClient` and enqueue a call on a service. Hangfire resolves `EmailSender` from DI when the job runs:

```csharp
app.MapPost("/signup", (string email, IBackgroundJobClient jobs) =>
{
    var jobId = jobs.Enqueue<EmailSender>(s => s.SendWelcome(email));
    return Results.Accepted(value: new { jobId });
});

public class EmailSender
{
    public void SendWelcome(string email) => Console.WriteLine($"Welcome mail to {email}");
}
```

Hangfire stores the method and its *arguments*, not a closure. Pass small, serializable values such as IDs and strings, not entities or `HttpContext`, and load what you need inside the job.

## Recurring jobs

Recurring jobs need a stable ID. Calling `AddOrUpdate` with the same ID updates the existing job, so it's safe to call on every startup:

```csharp
RecurringJob.AddOrUpdate("daily-report", () => Console.WriteLine("Daily job"), Cron.Daily);
RecurringJob.AddOrUpdate("weekday-noon", () => Console.WriteLine("Weekdays at noon"), "0 12 * * 1-5");
RecurringJob.AddOrUpdate<EmailSender>("digest", s => s.SendDigest(), Cron.Weekly(DayOfWeek.Monday, 8));
```

`Cron` has helpers for minutely through yearly schedules, or you can pass a standard cron expression. Schedules are evaluated in UTC unless you pass a time zone through `RecurringJobOptions`.

## Retries and failures

By default every job gets the `AutomaticRetry` filter: up to 10 attempts, with the delay between attempts growing each time. After the last attempt the job moves to the Failed state, where you can retry it from the dashboard. Override it per method:

```csharp
public class EmailSender
{
    [AutomaticRetry(Attempts = 5, DelaysInSeconds = new[] { 10, 30, 60, 300, 900 })]
    public void SendWelcome(string email) { /* ... */ }

    [AutomaticRetry(Attempts = 0)]
    public void SendDigest() { /* ... */ }
}
```

Use `Attempts = 0` for jobs that are not safe to repeat. More generally, write jobs to be idempotent: a job can run more than once, for example if the process dies after the work is done but before Hangfire records success.

To react to failures, write a job filter. This one logs when a job is about to move to the Failed state:

```csharp
using Hangfire.Common;
using Hangfire.States;

public class LogFailureAttribute : JobFilterAttribute, IElectStateFilter
{
    public void OnStateElection(ElectStateContext context)
    {
        if (context.CandidateState is FailedState failed)
        {
            Console.WriteLine($"Job {context.BackgroundJob.Id} failed: {failed.Exception.Message}");
        }
    }
}
```

Apply it with `[LogFailure]` on a job method, or globally with `GlobalJobFilters.Filters.Add(new LogFailureAttribute())`.

## Securing the dashboard

By default the dashboard only answers local requests. That works on your machine, but once deployed, remote requests are refused until you add an authorization filter. Don't just `return true`: the dashboard can delete and re-run jobs.

```csharp
using Hangfire.Dashboard;

public class AdminOnlyDashboardFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole("Admin");
    }
}
```

```csharp
app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new AdminOnlyDashboardFilter() }
});
```

## When Hangfire is not the right fit

- For a single in-process loop with no persistence or retries, a plain `BackgroundService` is simpler.
- Hangfire polls its storage. With SQL Server that adds steady database load, and very high job volumes need tuning or a different storage.
- Job methods are found by type and method name, so renaming or moving a job method breaks jobs already in the queue. Deploy such changes while the queue is empty, or keep the old method around until it drains.

## Further reading

- [Hangfire documentation](https://docs.hangfire.io/)
- [ASP.NET Core getting started](https://docs.hangfire.io/en/latest/getting-started/aspnet-core-applications.html)
- [Using the dashboard](https://docs.hangfire.io/en/latest/configuration/using-dashboard.html)
