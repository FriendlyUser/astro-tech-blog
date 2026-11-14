---
title: An IP address lookup API with ASP.NET Core minimal APIs
description: A small ASP.NET Core minimal API that returns the server's public IP, looks up details for any IP address, and reports the caller's IP.
pubDate: Saturday, 5 August 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["minimum-api", ".net", "aspnet", "csharp", "dotnet"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2023-01-08-14-26-14-mailbox.webp'
---

:::caution
The lookup service this API calls, `iplist.cc`, no longer responds: as of November 2026 the domain shows a parked page. The endpoint structure below still applies, but to run it you'll need to point `LookupAsync` at another IP information service and change the `IpInfo` record to match its response.
:::

Minimal APIs let you declare HTTP endpoints straight in `Program.cs` with `MapGet`, `MapPost` and friends, without controllers. That suits a small service like this one, which has three endpoints:

- `GET /ip` returns the public IP address of the machine running the API (via [jsonip.com](https://jsonip.com)).
- `GET /ip/{address}` returns registry, country and ASN details for an IP address.
- `GET /ip/info` returns the same details for the caller's IP address.

The code was first written for .NET 7 with Swashbuckle. It's updated here for .NET 10, which has OpenAPI document generation built in.

## Setup

Create the project from the Web API template, which already references `Microsoft.AspNetCore.OpenApi`:

```bash
dotnet new webapi -n IpApi
cd IpApi
```

## Program.cs

```csharp
using System.Net;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();     // OpenAPI document generation
builder.Services.AddHttpClient();  // registers IHttpClientFactory

var app = builder.Build();

app.MapOpenApi();                  // serves /openapi/v1.json

app.MapGet("/", () => "Hello World!").WithName("HelloWorld");

var ip = app.MapGroup("/ip");

// Public IP of the machine running this API
ip.MapGet("/", async (IHttpClientFactory factory) =>
{
    var client = factory.CreateClient();
    var response = await client.GetFromJsonAsync<JsonIpResponse>("https://jsonip.com");
    return response is null ? Results.Problem("jsonip.com returned no data") : Results.Ok(response.Ip);
}).WithName("GetIpAddress");

// Details for the caller's IP. Literal segments win over parameters,
// so /ip/info does not get captured by /ip/{address}.
ip.MapGet("/info", async (HttpContext context, IHttpClientFactory factory) =>
{
    IPAddress? remote = context.Connection.RemoteIpAddress;
    if (remote is null)
    {
        return Results.BadRequest("Could not determine the caller's IP address");
    }
    if (remote.IsIPv4MappedToIPv6)
    {
        remote = remote.MapToIPv4();   // "::ffff:1.2.3.4" -> "1.2.3.4"
    }
    return await LookupAsync(factory.CreateClient(), remote.ToString());
}).WithName("GetCallerIpInfo");

// Details for any IP address
ip.MapGet("/{address}", async (string address, IHttpClientFactory factory) =>
{
    if (!IPAddress.TryParse(address, out _))
    {
        return Results.BadRequest("Not a valid IP address");
    }
    return await LookupAsync(factory.CreateClient(), address);
}).WithName("GetIp");

app.Run();

static async Task<IResult> LookupAsync(HttpClient client, string address)
{
    var info = await client.GetFromJsonAsync<IpInfo>($"https://iplist.cc/api/{address}");
    return info is null ? Results.Problem("Lookup returned no data") : Results.Ok(info);
}

record JsonIpResponse(string Ip);

record IpInfo(
    string Ip,
    string Registry,
    string CountryCode,
    string CountryName,
    Asn? Asn,
    bool Spam,
    bool Tor,
    string? City,
    string? Detail,
    string[]? Website);

record Asn(string Code, string Name, string Route, string Start, string End, string Count);
```

A few things worth pointing out:

- `GetFromJsonAsync` deserializes with the web defaults, which match property names case-insensitively, so the lowercase JSON fields (`countrycode`, `countryname`) map onto PascalCase record properties. It also throws `HttpRequestException` on a non-success status code, which surfaces as a 500 response.
- The original version created a `new HttpClient()` per request and wrapped each call in `catch (Exception e) { throw e; }`. The first can exhaust sockets under load; the second throws away the stack trace. `IHttpClientFactory` and letting exceptions propagate fix both.
- `/ip` returns the *server's* public address, because the outbound request to jsonip.com comes from the server. Use `/ip/info` for the caller's address.

## The caller's IP behind a proxy

`Connection.RemoteIpAddress` is the address of whatever opened the TCP connection. Behind a reverse proxy or load balancer, that's the proxy. The earlier version only read `X-Forwarded-For` when `RemoteIpAddress` was null, which never happens behind a proxy.

The fix is the forwarded headers middleware, which rewrites `RemoteIpAddress` from `X-Forwarded-For`. Only trust the header from proxies you list in `KnownProxies` or `KnownIPNetworks` (`KnownNetworks` before .NET 10), because otherwise any client can set it to whatever it likes. See [Configure ASP.NET Core to work with proxy servers and load balancers](https://learn.microsoft.com/aspnet/core/host-and-deploy/proxy-load-balancer).

## OpenAPI and `WithOpenApi`

The 2023 version called `.WithOpenApi()` on each endpoint. That's no longer needed: `AddOpenApi()` includes every endpoint in the document, and `WithOpenApi` is marked obsolete in .NET 10 (diagnostic `ASPDEPR002`). Use `WithSummary`, `WithDescription` and `WithTags` for per-endpoint metadata.

.NET 9 and later templates don't ship Swagger UI. To browse the API, point Swagger UI, Scalar or another OpenAPI viewer at `/openapi/v1.json`.

## Further reading

- [Minimal APIs overview](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/overview)
- [Generate OpenAPI documents](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/aspnetcore-openapi)
- [`WithOpenApi` deprecation notice](https://learn.microsoft.com/aspnet/core/breaking-changes/10/withopenapi-deprecated)
