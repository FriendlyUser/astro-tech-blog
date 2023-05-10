---
description: 'In this article, we will discuss:'
imgSrc: /imgs/2023/549017699.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-08-16T12:11:06.000Z'
tags: []
title: Understanding Microsoft.Extensions.Caching A Comprehensive Guide
---

# Understanding Microsoft.Extensions.Caching: A Comprehensive Guide

Microsoft.Extensions.Caching is a set of libraries used for caching in .NET applications. It provides various in-memory and distributed cache implementations that can be used with any .NET application, regardless of whether it's an ASP.NET Core web application, console application, or any other type of application built with .NET.

In this article, we will discuss:

1. The importance of caching
2. Microsoft.Extensions.Caching components
3. In-memory caching with MemoryCache
4. Distributed caching with IDistributedCache
5. Cache eviction policies and expiration
6. Cache tagging and versioning

## 1. The Importance of Caching

Caching is a technique used to store and retrieve frequently accessed data more efficiently. By temporarily storing a copy of the data in a cache, applications can avoid redundant and time-consuming operations, such as database queries or complex calculations. Caching can significantly enhance the performance and responsiveness of an application.

## 2. Microsoft.Extensions.Caching Components

Microsoft.Extensions.Caching consists of two main components:

- **MemoryCache**: an in-memory cache implementation that stores the data within the application's memory space. It's ideal for single-instance applications or small-scale scenarios where data doesn't need to be shared among multiple instances.
- **IDistributedCache**: an interface for distributed cache implementations that store data across multiple servers, allowing for data sharing among multiple instances of an application. This is particularly useful for large-scale or distributed applications.

## 3. In-memory Caching with MemoryCache

The `MemoryCache` class provides an in-memory cache implementation. To use it, you first need to install the `Microsoft.Extensions.Caching.Memory` NuGet package.

Here's an example of how to use `MemoryCache` in a .NET application:

```csharp
using Microsoft.Extensions.Caching.Memory;
using System;

public class CacheService
{
    private readonly IMemoryCache _cache;

    public CacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public string GetCachedData(string key)
    {
        string data;
        if (!_cache.TryGetValue(key, out data))
        {
            data = GetDataFromExpensiveOperation();
            _cache.Set(key, data, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });
        }

        return data;
    }

    private string GetDataFromExpensiveOperation()
    {
        // Simulate an expensive operation.
        return "Expensive data";
    }
}
```

## 4. Distributed Caching with IDistributedCache

`IDistributedCache` is an interface for distributed cache implementations. Some popular implementations include:

- `DistributedMemoryCache` (for testing purposes)
- `DistributedRedisCache` (using Redis as the cache store)
- `DistributedSqlServerCache` (using SQL Server as the cache store)

To use `IDistributedCache`, you will need to install the appropriate NuGet package for the chosen implementation, such as `Microsoft.Extensions.Caching.StackExchangeRedis` for Redis.

Here's an example of how to use `IDistributedCache` with Redis in an ASP.NET Core application:

```csharp
// Startup.cs

using Microsoft.Extensions.Caching.StackExchangeRedis;

public void ConfigureServices(IServiceCollection services)
{
    services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = "localhost";
        options.InstanceName = "SampleInstance";
    });

    services.AddScoped<CacheService>();
}
```

```csharp
// CacheService.cs

using Microsoft.Extensions.Caching.Distributed;
using System.Text;

public class CacheService
{
    private readonly IDistributedCache _cache;

    public CacheService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<string> GetCachedDataAsync(string key)
    {
        var data = await _cache.GetStringAsync(key);
        if (data == null)
        {
            data = GetDataFromExpensiveOperation();
            await _cache.SetStringAsync(key, data, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });
        }

        return data;
    }

    private string GetDataFromExpensiveOperation()
    {
        // Simulate an expensive operation.
        return "Expensive data";
    }
}
```

## 5. Cache Eviction Policies and Expiration

Microsoft.Extensions.Caching supports the following cache eviction policies:

- **Absolute expiration**: The cached item will be evicted after a specific duration from the time it was added to the cache.
- **Sliding expiration**: The cached item will be evicted if it hasn't been accessed for a specific duration.
- **Priority-based expiration**: Items can be assigned a priority, which influences the order in which they are evicted when the cache is under memory pressure.

Cache entries can also be evicted by a `CancellationToken` or by using a `PostEvictionCallback` delegate to handle custom eviction scenarios.

## 6. Cache Tagging and Versioning

Cache tagging and versioning are useful techniques for managing cache dependencies and invalidation. Tags allow you to associate one or more labels with a cached item, making it easier to invalidate multiple items at once. Versioning involves appending a version number to the cache key to ensure that the latest data is being retrieved.

Here's an example of how to implement cache tagging and versioning with `MemoryCache`:

```csharp
public class CacheService
{
    private readonly IMemoryCache _cache;
    private const string VersionKey = "CacheVersion";

    public CacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public string GetCachedData(string key, string tag)
    {
        string versionedKey = GetVersionedKey(key, tag);

        string data;
        if (!_cache.TryGetValue(versionedKey, out data))
        {
            data = GetDataFromExpensiveOperation();
            _cache.Set(versionedKey, data, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });
        }

        return data;
    }

    public void InvalidateCacheByTag(string tag)
    {
        int currentVersion = _cache.GetOrCreate<int>(tag, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30);
            return 0;
        });

        _cache.Set(tag, currentVersion + 1, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30)
        });
    }

    private string GetVersionedKey(string key, string tag)
    {
        int version = _cache.Get<int>(tag);
        return $"{key}|{tag}|{version}";
    }

    private string GetDataFromExpensiveOperation()
    {
        // Simulate an expensive operation.
        return "Expensive data";
    }
}
```

In this example, we've implemented a method `GetVersionedKey` that appends the current version number to the cache key. The `InvalidateCacheByTag` method increments the version number, effectively invalidating all cache entries with the specified tag.

## Conclusion

Microsoft.Extensions.Caching provides a versatile and extensible solution for caching in .NET applications. With in-memory caching using `MemoryCache`, distributed caching using `IDistributedCache`, and support for cache eviction policies, tagging, and versioning, it offers a comprehensive set of tools to help developers optimize their applications' performance and responsiveness.