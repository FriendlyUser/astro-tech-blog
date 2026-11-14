---
title: "ASP.NET Core authentication: schemes, handlers and a custom API key handler"
pubDate: "2024-03-03T22:50:03.000Z"
lastUpdated: 2026-11-14
description: "How ASP.NET Core authentication works (schemes, handlers, AuthenticateResult) and how to write and register a custom API key authentication handler."
tags: ["csharp", "dotnet"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4181036141.webp
---

`Microsoft.AspNetCore.Authentication` is the part of ASP.NET Core that works out *who* is making a request. You register one or more named authentication schemes (cookies, JWT bearer, OpenID Connect, or your own), and the authentication middleware runs the right handler to turn a request into a `ClaimsPrincipal` on `HttpContext.User`. Authorization (`[Authorize]`, `RequireAuthorization()`) then decides what that user may do.

The package ships in the ASP.NET Core shared framework, so a project using `Microsoft.NET.Sdk.Web` already has it; you don't add a NuGet reference.

## The moving parts

### `AddAuthentication` and `AuthenticationBuilder`

`services.AddAuthentication()` registers the core services and returns an `AuthenticationBuilder`. Each provider adds itself through an extension method on that builder. The string you pass to `AddAuthentication` is the default scheme.

```csharp
using Microsoft.AspNetCore.Authentication.Cookies;

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/AccessDenied";
    });
```

### Authentication schemes

A scheme is a name plus a handler type plus that handler's options. You can register several (for example, cookies for the browser UI and JWT bearer for an API) and pick one per endpoint with `[Authorize(AuthenticationSchemes = "...")]`. Custom schemes are registered with `AddScheme<TOptions, THandler>(name, configureOptions)`.

### `IAuthenticationHandler`

Every scheme's handler implements `IAuthenticationHandler`, which has four methods:

- `InitializeAsync` – called once per request with the scheme and `HttpContext`.
- `AuthenticateAsync` – read the request (cookie, header, token) and return an `AuthenticateResult`.
- `ChallengeAsync` – respond when an unauthenticated user hits a protected endpoint (a 401, or a redirect to a login page).
- `ForbidAsync` – respond when an authenticated user isn't allowed (a 403, or a redirect to an access-denied page).

Sign-in and sign-out are separate interfaces, `IAuthenticationSignInHandler` and `IAuthenticationSignOutHandler`. Only schemes that persist a session, such as cookies, implement them.

In practice you rarely implement `IAuthenticationHandler` directly. The `AuthenticationHandler<TOptions>` base class does the plumbing, and you override `HandleAuthenticateAsync` (and optionally `HandleChallengeAsync` / `HandleForbiddenAsync`).

### `AuthenticateResult`

`AuthenticateResult` has three outcomes, each with a static factory:

- `AuthenticateResult.Success(ticket)` – the request carried valid credentials. The `AuthenticationTicket` wraps the `ClaimsPrincipal` and the scheme name.
- `AuthenticateResult.Fail("reason")` – credentials were present but invalid.
- `AuthenticateResult.NoResult()` – this scheme found nothing to check, so other schemes or the authorization challenge can take over.

## Writing a custom scheme: API key in a header

Here's a complete handler that accepts requests with an `X-Api-Key` header. It was built and run against .NET 9.

```csharp
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public static class ApiKeyDefaults
{
    public const string Scheme = "ApiKey";
}

public class ApiKeyOptions : AuthenticationSchemeOptions
{
    public string HeaderName { get; set; } = "X-Api-Key";
    public string ExpectedKey { get; set; } = "";
}

public class ApiKeyHandler : AuthenticationHandler<ApiKeyOptions>
{
    public ApiKeyHandler(
        IOptionsMonitor<ApiKeyOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(Options.HeaderName, out var provided))
        {
            // No header: let other schemes try, or let authorization issue a challenge.
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var match = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(provided.ToString()),
            Encoding.UTF8.GetBytes(Options.ExpectedKey));

        if (!match)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid API key"));
        }

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Name, "api-client") },
            Scheme.Name);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

`CryptographicOperations.FixedTimeEquals` avoids leaking the key through timing differences, which a plain `==` comparison can do.

Register the scheme and protect an endpoint in `Program.cs`:

```csharp
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(ApiKeyDefaults.Scheme)
    .AddScheme<ApiKeyOptions, ApiKeyHandler>(ApiKeyDefaults.Scheme, options =>
    {
        options.ExpectedKey = builder.Configuration["ApiKey"]
            ?? throw new InvalidOperationException("ApiKey is not configured");
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/whoami", (ClaimsPrincipal user) => $"Hello, {user.Identity?.Name}")
   .RequireAuthorization();

app.Run();
```

With `ApiKey=s3cret` set in the environment, a request with no header or a wrong key gets a 401, and `curl -H "X-Api-Key: s3cret" http://localhost:5000/whoami` returns `Hello, api-client`. (Use whichever port your app prints at startup.)

## Extending a built-in handler

Built-in handlers such as `CookieAuthenticationHandler` and `JwtBearerHandler` are public, so you can subclass them. Usually you don't need to: most of them expose an `Events` object on their options (`CookieAuthenticationEvents`, `JwtBearerEvents`) where you can hook in, for example to read a token from a query string or to return a 401 instead of a login redirect for API calls. Reach for events first and subclass only if they don't cover your case.

## Gotchas

- **Constructor signature changed in .NET 8.** `ISystemClock` is obsolete; handlers written for .NET 7 and earlier that take an `ISystemClock` parameter should drop it and call the `(options, logger, encoder)` base constructor. Use the `TimeProvider` property instead of `Clock`.
- **Middleware order matters.** `UseAuthentication()` must run before `UseAuthorization()`, and both after `UseRouting()` if you call it explicitly.
- **`Fail` vs `NoResult`.** Returning `Fail` when the header is simply missing produces confusing log noise and breaks setups where several schemes are tried. Use `NoResult` for "not my request".
- **API keys aren't user identity.** A shared key identifies a client, not a person. For user sign-in, use OpenID Connect or JWT bearer with a real identity provider.

## Further reading

- [Overview of ASP.NET Core authentication](https://learn.microsoft.com/aspnet/core/security/authentication/)
- [`AuthenticationHandler<TOptions>` API reference](https://learn.microsoft.com/dotnet/api/microsoft.aspnetcore.authentication.authenticationhandler-1)
- [ISystemClock is obsolete (.NET 8 breaking change)](https://learn.microsoft.com/dotnet/core/compatibility/aspnet-core/8.0/isystemclock-obsolete)
