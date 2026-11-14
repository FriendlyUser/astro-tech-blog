---
title: Configuring CORS in ASP.NET Core with Microsoft.AspNetCore.Cors
pubDate: "2023-11-13T15:57:56.000Z"
lastUpdated: 2026-11-14
description: "How CORS and preflight requests work, and how to set up CORS policies in ASP.NET Core with middleware, endpoint routing, and the [EnableCors] attribute."
tags: ["aspnet", "csharp", "dotnet"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3752564139.png
---

Browsers apply the *same-origin policy*: JavaScript on `https://app.example.com` can't read responses from `https://api.example.com` unless that server says it's allowed. Cross-Origin Resource Sharing (CORS) is how the server says so, using `Access-Control-*` response headers. `Microsoft.AspNetCore.Cors` is the ASP.NET Core middleware that sends those headers based on policies you define.

CORS relaxes the same-origin policy; it doesn't add protection. The server still runs every request it receives, and non-browser clients like `curl` ignore CORS entirely. Don't treat it as authentication or authorization.

## How CORS works

Two origins are the same only if scheme, host, and port all match. For a cross-origin request, the browser adds an `Origin` header, and only exposes the response to your script if the server answers with a matching `Access-Control-Allow-Origin`.

Some requests also need a **preflight**: an `OPTIONS` request the browser sends first, with `Access-Control-Request-Method` and `Access-Control-Request-Headers`, to ask whether the real request is allowed. The browser skips the preflight only for "simple" requests:

- the method is `GET`, `HEAD`, or `POST`;
- the script only sets CORS-safelisted headers such as `Accept`, `Accept-Language`, `Content-Language`, and `Content-Type`;
- `Content-Type`, if set, is `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`.

So a `POST` with `Content-Type: application/json`, a `PUT`, or any request with an `Authorization` header gets a preflight.

## Basic setup

The CORS middleware is part of the ASP.NET Core shared framework, so there's no NuGet package to install. Register a named policy and add the middleware in `Program.cs`:

```csharp
const string FrontendPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendPolicy, policy =>
    {
        policy.WithOrigins("https://app.example.com")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseRouting();

app.UseCors(FrontendPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
```

Order matters: `UseCors` goes after `UseRouting` and before `UseAuthorization`. If you use response caching, `UseCors` must also come before `UseResponseCaching`. Origins must match exactly and must not have a trailing slash: `"https://app.example.com/"` never matches.

Use `options.AddDefaultPolicy(...)` with a bare `app.UseCors()` if you only need one policy.

## Applying a policy to specific endpoints

Instead of applying a policy to the whole app, call `app.UseCors()` without a name and opt in per endpoint.

For minimal APIs or other endpoints, use `RequireCors`:

```csharp
app.MapGet("/api/status", () => Results.Ok("ok"))
   .RequireCors(FrontendPolicy);
```

For controllers, use `[EnableCors]` on the controller or on an action, and `[DisableCors]` to opt an action out:

```csharp
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[EnableCors("Frontend")]
public class WidgetsController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new[] { "green widget", "red widget" });

    [DisableCors]
    [HttpGet("internal")]
    public IActionResult Internal() => Ok("same-origin only");
}
```

If you combine a policy in `UseCors(...)` with `[EnableCors]`, both apply, which is confusing. Microsoft's docs recommend picking one approach per app. `[DisableCors]` also doesn't override CORS enabled with `RequireCors`.

## Policy options

### Credentials

By default the browser doesn't send cookies or HTTP auth on cross-origin requests. The client has to opt in (`fetch(url, { credentials: "include" })`) and the server has to allow it:

```csharp
policy.WithOrigins("https://app.example.com")
      .AllowAnyHeader()
      .AllowAnyMethod()
      .AllowCredentials();
```

`AllowCredentials` can't be combined with `AllowAnyOrigin`: the CORS specification forbids `Access-Control-Allow-Origin: *` with credentials, and ASP.NET Core returns an invalid CORS response for that combination. Don't work around it with `SetIsOriginAllowed(_ => true)`; that lets any site make authenticated requests as your users.

### Exposed response headers

Scripts can only read a small set of response headers by default (`Cache-Control`, `Content-Language`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma`). To expose others, such as a pagination header:

```csharp
policy.WithOrigins("https://app.example.com")
      .WithExposedHeaders("X-Total-Count");
```

### Wildcard subdomains and preflight caching

```csharp
policy.WithOrigins("https://*.example.com")
      .SetIsOriginAllowedToAllowWildcardSubdomains()
      .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
```

`SetPreflightMaxAge` sets `Access-Control-Max-Age`, so the browser can reuse a preflight result instead of sending `OPTIONS` before every request. Browsers cap this value.

## Troubleshooting

- **Look at the preflight.** In the browser's network tab, find the `OPTIONS` request. If it returns `204` with no `Access-Control-Allow-Origin` header, the policy rejected it: usually the origin, a method, or a header isn't allowed.
- **Check middleware order.** `[EnableCors]` and `RequireCors` only work if `UseCors` runs after `UseRouting`, because the middleware needs to know which endpoint matched. Put it before `UseAuthorization` so preflights aren't rejected by an auth policy.
- **HTTP to HTTPS redirects break preflights.** A preflight that gets redirected by `UseHttpsRedirection` fails. Call the API over HTTPS directly.
- **IIS with Windows authentication.** Preflights don't carry credentials, so IIS rejects them before they reach your app unless anonymous access is allowed or the IIS CORS module is installed.

## Further reading

- [Enable Cross-Origin Requests (CORS) in ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/cors)
- [CORS on MDN](https://developer.mozilla.org/docs/Web/HTTP/CORS)
