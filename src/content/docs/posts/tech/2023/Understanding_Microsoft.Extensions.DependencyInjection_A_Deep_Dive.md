---
description: How the built-in .NET DI container works - registering services, the three lifetimes, scopes, keyed services, and the mistakes scope validation catches.
imgSrc: /imgs/2023/man-on-horse.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-11-26T17:49:54.000Z'
lastUpdated: 2026-11-14
tags: ["dotnet", "csharp"]
title: Using Microsoft.Extensions.DependencyInjection, the built-in .NET DI container
---

`Microsoft.Extensions.DependencyInjection` is the dependency injection container that ASP.NET Core, the generic host, and most `Microsoft.Extensions.*` libraries are built on. Classes declare what they need in their constructor, you register implementations once at startup, and the container builds the object graph for you. That keeps classes decoupled from concrete implementations and makes them easy to test with fakes.

In an ASP.NET Core or Worker Service project it's already set up (`builder.Services`). In a plain console app, add the package:

```bash
dotnet add package Microsoft.Extensions.DependencyInjection
```

## The moving parts

- **`IServiceCollection`**: the list of registrations you build at startup.
- **`ServiceDescriptor`**: one registration: service type, implementation (type, instance, or factory), and lifetime.
- **`IServiceProvider`**: the built container that creates and disposes instances.
- **`IServiceScope`**: a child container that owns scoped instances and disposes them when the scope ends.

## Lifetimes

| Lifetime | Registration | One instance per |
| --- | --- | --- |
| Transient | `AddTransient<TService, TImpl>()` | every resolution |
| Scoped | `AddScoped<TService, TImpl>()` | scope (an HTTP request in ASP.NET Core) |
| Singleton | `AddSingleton<TService, TImpl>()` | container |

The container disposes the `IDisposable` instances it created when their scope (or, for singletons, the root provider) is disposed. It does not dispose instances you pass in yourself with `AddSingleton(instance)`.

## A console example

```csharp
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddSingleton<IClock, SystemClock>();
services.AddScoped<IGreeter, ConsoleGreeter>();

using ServiceProvider provider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateScopes = true,
    ValidateOnBuild = true
});

using (IServiceScope scope = provider.CreateScope())
{
    var greeter = scope.ServiceProvider.GetRequiredService<IGreeter>();
    greeter.Greet("World");
}

public interface IClock
{
    DateTimeOffset Now { get; }
}

public class SystemClock : IClock
{
    public DateTimeOffset Now => DateTimeOffset.Now;
}

public interface IGreeter
{
    void Greet(string name);
}

public class ConsoleGreeter : IGreeter
{
    private readonly IClock _clock;

    public ConsoleGreeter(IClock clock) => _clock = clock;

    public void Greet(string name) =>
        Console.WriteLine($"Hello, {name}! It is {_clock.Now:t}.");
}
```

A few things worth noting:

- `ConsoleGreeter` gets `IClock` through its constructor. The container picks the constructor whose parameters it can satisfy.
- `GetRequiredService<T>()` throws if the service isn't registered. `GetService<T>()` returns `null` instead, which usually just moves the failure somewhere less obvious.
- Scoped services are resolved from a scope. ASP.NET Core creates one per request; in a console app or a `BackgroundService` you create them with `CreateScope()`.

## What scope validation catches

`ValidateScopes` and `ValidateOnBuild` are on by default in the `Development` environment of ASP.NET Core and the generic host. With them enabled, the container throws on two common mistakes:

- **Captive dependencies.** A singleton that takes a scoped service in its constructor would keep one instance of that scoped service (say, a `DbContext`) alive for the whole app. With `ValidateOnBuild`, building the provider fails.
- **Resolving scoped services from the root provider.** `provider.GetRequiredService<IGreeter>()` outside a scope throws, because the instance would never be disposed.

## Keyed services

Since .NET 8 you can register several implementations of one interface under different keys:

```csharp
services.AddKeyedSingleton<INotifier, EmailNotifier>("email");
services.AddKeyedSingleton<INotifier, SmsNotifier>("sms");

public class AlertService(
    [FromKeyedServices("sms")] INotifier notifier)
{
    public void Alert(string message) => notifier.Send(message);
}
```

Resolve one directly with `provider.GetRequiredKeyedService<INotifier>("email")`. Without keys, registering the same interface twice means the last registration wins for a single dependency, and `IEnumerable<INotifier>` gives you all of them.

## When to reach for another container

The built-in container intentionally leaves out features such as property injection, assembly scanning, and decorators. If you need those, Autofac and similar containers plug in through `IServiceProviderFactory<T>` (for example `builder.Host.UseServiceProviderFactory(new AutofacServiceProviderFactory())`), and libraries like Scrutor add scanning and decoration on top of `IServiceCollection`.

## Further reading

- [Dependency injection in .NET](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection)
- [Dependency injection guidelines](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection-guidelines)
