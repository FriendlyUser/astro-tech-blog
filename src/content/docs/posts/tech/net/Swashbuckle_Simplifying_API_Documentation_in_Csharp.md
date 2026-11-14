---
title: "Swashbuckle in ASP.NET Core: OpenAPI docs and Swagger UI for your API"
pubDate: "2023-04-24T18:13:58.176Z"
lastUpdated: 2026-11-14
description: "Add Swashbuckle to an ASP.NET Core Web API to generate an OpenAPI document, include XML comments, and serve and customize Swagger UI."
tags: ["csharp", "dotnet"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/831070838.webp
---
[Swashbuckle.AspNetCore](https://github.com/domaindrivendev/Swashbuckle.AspNetCore) inspects your ASP.NET Core controllers and endpoints, generates an [OpenAPI](https://www.openapis.org/) (formerly Swagger) document describing them, and serves [Swagger UI](https://swagger.io/tools/swagger-ui/), an interactive page where you can read the docs and send test requests. The OpenAPI document is also what client generators such as NSwag or Kiota consume if you want typed API clients.

:::note
Since .NET 9, the ASP.NET Core Web API template no longer includes Swashbuckle. It uses the built-in `Microsoft.AspNetCore.OpenApi` package (`AddOpenApi()` / `MapOpenApi()`) to generate the document and doesn't ship a UI. Swashbuckle is still maintained and works on .NET 9 and later; you just add it yourself. See Microsoft's [OpenAPI overview](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/overview) for the built-in option.
:::

The examples below use the minimal hosting model (`Program.cs`, no `Startup` class) and the Swashbuckle 10.x API. Version 11.0.1 is the latest on NuGet at the time of writing; it moves to a newer OpenAPI.NET release with breaking changes, so check its migration guide before upgrading an existing project.

## What's in the package

`Swashbuckle.AspNetCore` is a metapackage for three components:

- **Swashbuckle.AspNetCore.SwaggerGen** builds the OpenAPI document from your routes, controllers and models. Filters and options for customizing the document live here.
- **Swashbuckle.AspNetCore.Swagger** is the middleware that serves that document as JSON.
- **Swashbuckle.AspNetCore.SwaggerUI** serves an embedded copy of Swagger UI that reads the JSON.

## Adding it to a project

```bash
dotnet add package Swashbuckle.AspNetCore
```

Then wire it up in `Program.cs`:

```csharp
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer(); // needed for minimal API endpoints
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();   // serves /swagger/v1/swagger.json
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1");
    });
}

app.MapControllers();
app.Run();
```

Run the app and open `/swagger` (for example `https://localhost:5001/swagger`, using whatever port your launch profile picks).

On Swashbuckle 9.x and earlier, `OpenApiInfo` lives in `Microsoft.OpenApi.Models`, so the `using` line is `using Microsoft.OpenApi.Models;`. Version 10 moved to Microsoft.OpenApi 2.x, which flattened the namespaces.

The `IsDevelopment()` check keeps the docs out of production. Remove it if you do want public API docs.

## Including XML comments

Without extra setup, the document has routes, parameters and schemas but no descriptions. To pull in your `///` comments, first have the compiler emit an XML documentation file. In the `.csproj`:

```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

`1591` is the "missing XML comment for publicly visible type" warning. Suppressing it avoids a warning for every undocumented public member once documentation generation is on.

Then point SwaggerGen at the file:

```csharp
using System.Reflection;
using Microsoft.OpenApi;

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});
```

Now comments on actions show up in Swagger UI:

```csharp
/// <summary>
/// Retrieves a list of all items.
/// </summary>
/// <response code="200">The items, possibly empty.</response>
[HttpGet]
[ProducesResponseType(StatusCodes.Status200OK)]
public ActionResult<IEnumerable<Item>> GetItems()
{
    // ...
}
```

`<summary>` becomes the operation summary, and `<response>` tags plus `[ProducesResponseType]` document the status codes. On Linux the XML file name is case-sensitive, so it must match the assembly name exactly.

## Customizing the document

SwaggerGen has three extension points for changes that options alone can't make:

- **Operation filters** (`IOperationFilter`) modify a single operation, for example to add a required header to every endpoint.
- **Schema filters** (`ISchemaFilter`) modify the schema generated for a type.
- **Document filters** (`IDocumentFilter`) modify the whole document after generation, for example to remove internal endpoints.

Register them with `options.OperationFilter<T>()`, `options.SchemaFilter<T>()` and `options.DocumentFilter<T>()` inside `AddSwaggerGen`.

## Customizing Swagger UI

```csharp
app.UseStaticFiles(); // required for InjectStylesheet

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1");
    options.DocumentTitle = "My API - Documentation";
    options.RoutePrefix = "docs";
    options.InjectStylesheet("/css/custom-swagger.css");
    options.EnableDeepLinking();
    options.DisplayRequestDuration();
});
```

- `DocumentTitle` sets the browser tab title.
- `RoutePrefix = "docs"` moves the UI from `/swagger` to `/docs`. Use `string.Empty` to serve it at the site root.
- `InjectStylesheet` adds your own CSS. The file must be served by the static files middleware, so put it at `wwwroot/css/custom-swagger.css`.
- `EnableDeepLinking` updates the URL as you expand operations, so you can link straight to one.
- `DisplayRequestDuration` shows how long each "Try it out" request took.

## Gotchas

- If you're behind a reverse proxy or in an IIS virtual directory, an absolute endpoint path like `/swagger/v1/swagger.json` can point at the wrong place. Use a relative path (`v1/swagger.json`) in `SwaggerEndpoint`.
- Two actions with the same route and HTTP method make SwaggerGen fail with a "conflicting method/path combination" error. Fix the routes, or use `ResolveConflictingActions` as a stopgap.
- The document is OpenAPI 3.0 by default. If a consumer only understands Swagger 2.0 (some Power Platform connectors, for example), set `options.OpenApiVersion = OpenApiSpecVersion.OpenApi2_0` in `UseSwagger`. That property replaced `SerializeAsV2`, which older tutorials still show and which no longer exists in Swashbuckle 10.

## Further reading

- [Swashbuckle.AspNetCore README](https://github.com/domaindrivendev/Swashbuckle.AspNetCore)
- [Get started with Swashbuckle and ASP.NET Core](https://learn.microsoft.com/aspnet/core/tutorials/getting-started-with-swashbuckle) (Microsoft Learn)
