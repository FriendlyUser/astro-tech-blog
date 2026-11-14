---
description: How to install AutoMapper, define mapping profiles, register it with ASP.NET Core dependency injection, and customise member mappings with ForMember.
imgSrc: /imgs/2023/2921207460.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-15T23:06:49.000Z'
lastUpdated: 2026-11-14
tags: ["csharp", "dotnet"]
title: "AutoMapper in .NET: profiles, DI registration and custom mappings"
---

:::note[Licensing changed in AutoMapper 15]
Since version 15, AutoMapper is dual-licensed and expects a license key (a free Community license is available for some organisations; see [automapper.io](https://automapper.io/)). A missing key only produces a log warning and doesn't change runtime behaviour. Version 15 also changed the `AddAutoMapper` signature, which the examples below use. They were checked against AutoMapper 17.0.0.
:::

AutoMapper copies data between objects of different types by convention: properties with matching names (and compatible types) are mapped automatically. The typical use is turning entity classes into DTOs or view models without writing a page of `dto.Name = user.Name` assignments.

The examples use these two classes:

```csharp
public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
}

public class UserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
}
```

## Install

```sh
dotnet add package AutoMapper
```

Since version 13 the ASP.NET Core dependency-injection extensions (`AddAutoMapper`) ship in the main package. The old `AutoMapper.Extensions.Microsoft.DependencyInjection` package is discontinued, so remove it if you're upgrading.

## Define a profile

Mappings live in classes that inherit from `Profile`. Each `CreateMap<TSource, TDestination>()` call declares one direction:

```csharp
using AutoMapper;

public class UserProfile : Profile
{
    public UserProfile()
    {
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.FullName,
                       opt => opt.MapFrom(src => src.FirstName + " " + src.LastName));
    }
}
```

`Id` and `Email` map by name. `FullName` has no matching source property, so `ForMember` tells AutoMapper how to build it.

If you also need to map back from `UserDto` to `User`, add `.ReverseMap()` to the chain or write a second `CreateMap<UserDto, User>()`. Be careful with reverse maps that write into entities: they make it easy to overwrite fields the client was never supposed to change.

## Register with dependency injection

In an ASP.NET Core app's `Program.cs`, pass a configuration action (where the license key goes) and a type from each assembly that contains profiles:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAutoMapper(
    cfg => cfg.LicenseKey = builder.Configuration["AutoMapper:LicenseKey"],
    typeof(UserProfile));

var app = builder.Build();
```

AutoMapper scans those assemblies, registers every `Profile` it finds, and adds `IMapper` to the container. If you leave `LicenseKey` unset, AutoMapper reads the `AUTOMAPPER_LICENSE_KEY` environment variable instead.

Before version 15 the call was `services.AddAutoMapper(typeof(UserProfile))`, without the configuration action. That overload no longer exists.

## Map objects

Inject `IMapper` wherever you need it:

```csharp
using AutoMapper;

public class UserService(IMapper mapper, AppDbContext db)
{
    public async Task<UserDto?> GetUserAsync(int id)
    {
        var user = await db.Users.FindAsync(id);
        return user is null ? null : mapper.Map<UserDto>(user);
    }
}
```

`AppDbContext` here stands in for whatever data access you use. For EF Core queries, `ProjectTo<UserDto>(mapper.ConfigurationProvider)` (from `AutoMapper.QueryableExtensions`) translates the mapping into the SQL `SELECT`, so only the needed columns are loaded instead of whole entities.

## Validate the configuration

The most common AutoMapper bug is a destination property that silently stays at its default because nothing maps to it. Catch that in a unit test:

```csharp
using AutoMapper;
using Microsoft.Extensions.Logging.Abstractions;

var config = new MapperConfiguration(
    cfg => cfg.AddProfile<UserProfile>(),
    NullLoggerFactory.Instance);

config.AssertConfigurationIsValid();
```

`AssertConfigurationIsValid` throws if any destination member has no source and isn't explicitly ignored with `opt.Ignore()`. Since version 15 the `MapperConfiguration` constructor also takes an `ILoggerFactory`.

## When not to use it

AutoMapper hides assignments behind conventions. That pays off with many similar DTOs, but it costs you "Find all references" and compile-time errors when a property is renamed. For a handful of mappings, a hand-written `ToDto()` method or a source-generator-based mapper is easier to read and debug. Keep mapping logic simple either way: business rules inside `MapFrom` lambdas are hard to find later.

## Further reading

- [AutoMapper documentation](https://docs.automapper.io/en/stable/)
- [15.0 upgrade guide](https://docs.automapper.io/en/stable/15.0-Upgrade-Guide.html)
- [License configuration](https://docs.automapper.io/en/stable/License-configuration.html)
