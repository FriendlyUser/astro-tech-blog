---
description: How ASP.NET Core authorization works with roles, named policies, custom requirements and handlers, and resource-based checks through IAuthorizationService.
imgSrc: /imgs/2023/1400635341.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-09-21T06:51:47.000Z'
lastUpdated: 2026-11-14
tags: ["aspnet", "csharp", "dotnet"]
title: "ASP.NET Core authorization: roles, policies and custom handlers"
---

Authentication works out who the user is. Authorization decides what that user is allowed to do. In ASP.NET Core, authorization lives in the `Microsoft.AspNetCore.Authorization` namespace and runs on the `ClaimsPrincipal` that your authentication handler (cookies, JWT bearer, and so on) produced. This post covers role checks, named policies, custom requirements, and checks against a specific resource.

## The building blocks

- **Requirement** (`IAuthorizationRequirement`): an empty marker interface. A requirement class holds the parameters of one rule, such as "minimum age 18".
- **Handler** (`AuthorizationHandler<TRequirement>`): the code that decides whether the current user meets a requirement. It calls `context.Succeed(requirement)` when they do.
- **Policy** (`AuthorizationPolicy`): a named set of requirements. All requirements in a policy must succeed.
- **`IAuthorizationService`**: evaluates a policy or a list of requirements for a user. The `[Authorize]` attribute and the authorization middleware call it for you, and you can call it directly for resource-based checks.

## Role-based authorization

If your users carry role claims, the simplest check is the `Roles` property on `[Authorize]`:

```csharp
[Authorize(Roles = "Admin")]
public IActionResult AdminDashboard() => View();
```

A comma-separated list (`Roles = "Admin,Manager"`) means the user needs *any* of those roles. Stacking two `[Authorize(Roles = ...)]` attributes means they need both.

Hard-coding role names on every action gets messy, so most apps define named policies instead. `AddAuthorizationBuilder` (ASP.NET Core 7 and later) registers them in `Program.cs`:

```csharp
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
```

```csharp
[Authorize(Policy = "AdminOnly")]
public IActionResult AdminDashboard() => View();
```

Now changing who counts as an admin is a one-line change in one place. Other built-in policy builders include `RequireClaim`, `RequireAuthenticatedUser`, `RequireUserName` and `RequireAssertion` (an inline lambda for simple rules).

## Custom requirements and handlers

When the rule needs real logic, write a requirement and a handler. This one checks a date-of-birth claim:

```csharp
using Microsoft.AspNetCore.Authorization;

public class MinimumAgeRequirement(int minimumAge) : IAuthorizationRequirement
{
    public int MinimumAge { get; } = minimumAge;
}
```

```csharp
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

public class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, MinimumAgeRequirement requirement)
    {
        var claim = context.User.FindFirst(ClaimTypes.DateOfBirth);
        if (claim is null ||
            !DateTime.TryParse(claim.Value, CultureInfo.InvariantCulture,
                               DateTimeStyles.None, out var dateOfBirth))
        {
            return Task.CompletedTask; // not satisfied, but let other handlers run
        }

        var age = DateTime.Today.Year - dateOfBirth.Year;
        if (dateOfBirth.Date > DateTime.Today.AddYears(-age))
        {
            age--; // birthday hasn't happened yet this year
        }

        if (age >= requirement.MinimumAge)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
```

Subtracting the birth year from the current year alone overstates the age of anyone whose birthday is later in the year. The `age--` line handles that.

Register the handler and the policy, then make sure the middleware runs:

```csharp
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

// Authentication (cookies, JWT bearer, etc.) is configured here as usual.

builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"))
    .AddPolicy("AtLeast18", policy =>
        policy.Requirements.Add(new MinimumAgeRequirement(18)));

builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultControllerRoute();
app.MapGet("/api/adult-only", () => "ok").RequireAuthorization("AtLeast18");

app.Run();
```

Apply the policy to MVC actions with the attribute, or to minimal API endpoints with `RequireAuthorization` as shown above:

```csharp
[Authorize(Policy = "AtLeast18")]
public IActionResult AdultContent() => View();
```

A handler only proves what its claims prove. A date-of-birth claim is as trustworthy as whoever issued it, so check `claim.Issuer` if users can supply claims from more than one source.

## Resource-based authorization

Attributes run before your action loads any data, so they can't answer "can this user edit *this* document?". For that, inject `IAuthorizationService` and pass the resource:

```csharp
public class DocumentsController(IAuthorizationService authz, AppDbContext db) : Controller
{
    public async Task<IActionResult> Edit(int id)
    {
        var document = await db.Documents.FindAsync(id);
        if (document is null) return NotFound();

        var result = await authz.AuthorizeAsync(User, document, "CanEditDocument");
        return result.Succeeded ? View(document) : Forbid();
    }
}
```

The handler for that policy derives from `AuthorizationHandler<TRequirement, Document>` and receives the document as its `resource` parameter. `AppDbContext` and `Document` stand in for your own data types.

## Gotchas

- **AND vs OR.** Multiple requirements in one policy must all succeed. Multiple handlers for the *same* requirement are OR'd: any one calling `Succeed` is enough.
- **Don't call `Fail` for "not satisfied".** Just return without calling `Succeed`. `context.Fail()` forces the whole policy to fail even if another handler succeeds, so keep it for hard denials.
- **Handlers run even when authentication failed**, and in no guaranteed order. Don't assume `context.User` is authenticated, and don't depend on one handler running before another.
- **Secure by default.** Set a fallback policy with `.SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())` so endpoints without any `[Authorize]` still require a signed-in user, and mark public ones with `[AllowAnonymous]`.

## Further reading

- [Policy-based authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies)
- [Resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased)
- [Role-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/roles)
