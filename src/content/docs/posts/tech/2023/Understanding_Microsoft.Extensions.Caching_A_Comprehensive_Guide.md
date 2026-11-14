---
description: How to cache data in .NET with IMemoryCache, IDistributedCache and Redis, and HybridCache, including expiration, size limits and tag-based invalidation.
imgSrc: /imgs/2023/549017699.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-08-16T12:11:06.000Z'
lastUpdated: 2026-11-14
tags: ["dotnet", "csharp"]
title: Caching in .NET with IMemoryCache, IDistributedCache and HybridCache
---

The `Microsoft.Extensions.Caching.*` packages give .NET apps three caching abstractions:

- **`IMemoryCache`** stores objects in the process's memory. It's fast and needs no serialization, but each server has its own copy and it's lost on restart.
- **`IDistributedCache`** stores `byte[]` values in an external store (Redis, SQL Server, Postgres) so every instance of the app sees the same data.
- **`HybridCache`** (package `Microsoft.Extensions.Caching.Hybrid`) combines the two: an in-memory primary cache, an optional `IDistributedCache` as the secondary cache, stampede protection, and tags.

They work in any .NET app that uses the generic host or `Microsoft.Extensions.DependencyInjection`, not only ASP.NET Core.

## In-memory caching with IMemoryCache

Register the cache, then inject `IMemoryCache`. In an ASP.NET Core app the package is already part of the shared framework; in other apps add `Microsoft.Extensions.Caching.Memory`.

```csharp
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ProductService>();
```

`GetOrCreateAsync` returns the cached value or runs the factory and stores the result:

```csharp
using Microsoft.Extensions.Caching.Memory;

public class ProductService
{
    private readonly IMemoryCache _cache;

    public ProductService(IMemoryCache cache) => _cache = cache;

    public async Task<string?> GetProductNameAsync(int id)
    {
        return await _cache.GetOrCreateAsync($"product:{id}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            entry.SlidingExpiration = TimeSpan.FromMinutes(10);
            return await LoadFromDatabaseAsync(id);
        });
    }

    private static async Task<string> LoadFromDatabaseAsync(int id)
    {
        await Task.Delay(100); // stand-in for a real query
        return $"Product {id}";
    }
}
```

`GetOrCreateAsync` does not lock: if several requests miss the same key at once, the factory runs several times. If that matters, use `HybridCache` (below), which runs the factory once per key.

## Distributed caching with IDistributedCache and Redis

Each `IDistributedCache` implementation lives in its own package and has its own registration method:

| Store | Package | Registration |
| --- | --- | --- |
| In-process (tests, local dev) | `Microsoft.Extensions.Caching.Memory` | `AddDistributedMemoryCache()` |
| Redis | `Microsoft.Extensions.Caching.StackExchangeRedis` | `AddStackExchangeRedisCache(...)` |
| SQL Server | `Microsoft.Extensions.Caching.SqlServer` | `AddDistributedSqlServerCache(...)` |

Register Redis in `Program.cs`:

```csharp
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "SampleApp:";
});

builder.Services.AddScoped<ReportCache>();
```

`IDistributedCache` only stores bytes. The `GetStringAsync`/`SetStringAsync` extension methods handle UTF-8 strings; anything else you serialize yourself:

```csharp
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

public record Report(int Id, string Title);

public class ReportCache
{
    private readonly IDistributedCache _cache;

    public ReportCache(IDistributedCache cache) => _cache = cache;

    public async Task<Report> GetReportAsync(int id, CancellationToken ct = default)
    {
        string key = $"report:{id}";

        string? json = await _cache.GetStringAsync(key, ct);
        if (json is not null)
        {
            return JsonSerializer.Deserialize<Report>(json)!;
        }

        var report = new Report(id, $"Report {id}"); // stand-in for an expensive query
        await _cache.SetStringAsync(key, JsonSerializer.Serialize(report),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            }, ct);

        return report;
    }
}
```

## Expiration, size limits and eviction

Both `MemoryCacheEntryOptions` and `DistributedCacheEntryOptions` support:

- **Absolute expiration**: the entry expires at a fixed time (`AbsoluteExpiration`) or after a fixed duration (`AbsoluteExpirationRelativeToNow`).
- **Sliding expiration**: the entry expires if it isn't read for a given duration. Combine it with an absolute expiration, otherwise a frequently read entry never refreshes.

`IMemoryCache` has a few more options:

- **Size limits.** The cache does not shrink itself under memory pressure. Set `SizeLimit` in `AddMemoryCache(o => o.SizeLimit = 1024)` and give every entry a `Size`; once the limit is reached, new entries aren't added and the cache compacts in the background.
- **Priority.** `CacheItemPriority` (`Low`, `Normal`, `High`, `NeverRemove`) decides which entries are removed first during compaction.
- **Expiration tokens and callbacks.** `AddExpirationToken` evicts an entry when an `IChangeToken` fires (for example a `CancellationChangeToken`), and `RegisterPostEvictionCallback` runs code after an entry is removed.

Expired entries aren't removed by a timer. The cache scans for them when it is accessed, so an expired item may sit in memory until the next read or write.

## Invalidating groups of entries with tags

Neither `IMemoryCache` nor `IDistributedCache` has tags. The old workaround was to put a version number in each key and bump it to invalidate a group. `HybridCache` now supports tags directly:

```csharp
builder.Services.AddHybridCache();
```

```csharp
using Microsoft.Extensions.Caching.Hybrid;

public class CatalogService
{
    private readonly HybridCache _cache;

    public CatalogService(HybridCache cache) => _cache = cache;

    public async Task<string> GetProductAsync(string category, int id, CancellationToken ct = default)
    {
        return await _cache.GetOrCreateAsync(
            $"product:{id}",
            async cancel => await LoadProductAsync(id, cancel),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromHours(1),
                LocalCacheExpiration = TimeSpan.FromMinutes(5)
            },
            tags: [$"category:{category}"],
            cancellationToken: ct);
    }

    public async Task InvalidateCategoryAsync(string category, CancellationToken ct = default)
    {
        await _cache.RemoveByTagAsync($"category:{category}", ct);
    }

    private static async Task<string> LoadProductAsync(int id, CancellationToken ct)
    {
        await Task.Delay(100, ct); // stand-in for a real query
        return $"Product {id}";
    }
}
```

If an `IDistributedCache` such as Redis is registered, `HybridCache` uses it as the secondary cache automatically. A few things to know:

- `RemoveByTagAsync` is a logical invalidation. Old values stay in memory and in Redis until they expire; `HybridCache` just treats anything created before the invalidation as a miss.
- Invalidation affects the current server and the distributed cache, but not the in-memory cache on other servers. Keep `LocalCacheExpiration` short if instances must agree quickly.
- Values sent to the secondary cache are serialized with `System.Text.Json` by default, so cached types must be serializable.

## Further reading

- [Cache in-memory in ASP.NET Core](https://learn.microsoft.com/aspnet/core/performance/caching/memory)
- [Distributed caching in ASP.NET Core](https://learn.microsoft.com/aspnet/core/performance/caching/distributed)
- [HybridCache library in ASP.NET Core](https://learn.microsoft.com/aspnet/core/performance/caching/hybrid)
