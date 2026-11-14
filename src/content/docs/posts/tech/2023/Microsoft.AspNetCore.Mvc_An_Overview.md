---
title: "ASP.NET Core MVC overview: controllers, views, model binding and validation"
pubDate: "2024-01-15T08:31:21.000Z"
lastUpdated: 2026-11-14
description: "A short tour of ASP.NET Core MVC: how models, views and controllers fit together, with a working controller showing routing, model binding and validation."
tags: ["csharp", "dotnet"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4161054396.webp
---

`Microsoft.AspNetCore.Mvc` is ASP.NET Core's Model-View-Controller framework. Controllers handle HTTP requests, models carry data and validation rules, and Razor views render HTML. It's a good fit for server-rendered sites with many pages and forms; for JSON-only APIs you can use the same controllers without views, or minimal APIs.

Since ASP.NET Core 3.0, MVC is part of the shared framework. A project using `Microsoft.NET.Sdk.Web` already has it, so don't add the old `Microsoft.AspNetCore.Mvc` 2.x NuGet package.

## Model, view, controller

- **Model** – plain C# classes holding the data a page works with, plus validation attributes. Data access usually lives in separate services that the controller calls.
- **View** – a `.cshtml` Razor file that mixes HTML with C# to render a model. Views live under `Views/<ControllerName>/<ActionName>.cshtml` by convention.
- **Controller** – a class deriving from `Controller` (or `ControllerBase` for APIs without views). Its public methods are *actions*, each handling a request and returning an `IActionResult` such as `View()`, `NotFound()` or `RedirectToAction()`.

## Wiring it up

`Program.cs` registers MVC and a conventional route:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddSingleton<IProductRepository, InMemoryProductRepository>();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
```

The route template maps `/Products/Details/5` to `ProductsController.Details(int id)` with `id = 5`. You can also put routes on the actions themselves with attributes such as `[Route("products/{id:int}")]` or `[HttpGet("...")]`.

## A controller with model binding and validation

The model declares its rules with data annotations:

```csharp
using System.ComponentModel.DataAnnotations;

public class Product
{
    public int Id { get; set; }

    [Required, StringLength(100)]
    public string Name { get; set; } = "";

    [Range(0.01, 10_000)]
    public decimal Price { get; set; }
}

public interface IProductRepository
{
    Product? Find(int id);
    void Add(Product product);
}

public class InMemoryProductRepository : IProductRepository
{
    private readonly List<Product> _products = new();

    public Product? Find(int id) => _products.FirstOrDefault(p => p.Id == id);

    public void Add(Product product)
    {
        product.Id = _products.Count + 1;
        _products.Add(product);
    }
}
```

The controller gets the repository through constructor injection, the DI container built into ASP.NET Core:

```csharp
using Microsoft.AspNetCore.Mvc;

public class ProductsController : Controller
{
    private readonly IProductRepository _products;

    public ProductsController(IProductRepository products)
    {
        _products = products;
    }

    // GET /Products/Details/5
    public IActionResult Details(int id)
    {
        var product = _products.Find(id);
        if (product is null)
        {
            return NotFound();
        }
        return View(product);
    }

    // GET /Products/Create
    public IActionResult Create() => View();

    // POST /Products/Create
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Create(Product product)
    {
        if (!ModelState.IsValid)
        {
            return View(product); // redisplay the form with error messages
        }

        _products.Add(product);
        return RedirectToAction(nameof(Details), new { id = product.Id });
    }
}
```

**Model binding** fills the `id` and `product` parameters from route values, the query string and posted form fields by matching names. **Validation** runs during binding: the results land in `ModelState`, and the action decides what to do. In MVC controllers you must check `ModelState.IsValid` yourself. Controllers marked `[ApiController]` return a 400 response automatically instead.

The view would use tag helpers such as `<input asp-for="Name" />` and `<span asp-validation-for="Name"></span>` to render fields and their error messages.

(This sample was compiled against .NET 9 with the SDK's default implicit usings; add the matching `Views/Products/*.cshtml` files to run it.)

## View components

A view component is a reusable piece of UI with its own logic, like a cart summary or a sidebar, that you can drop into any view. Unlike a partial view, it can take parameters and call services.

```csharp
using Microsoft.AspNetCore.Mvc;

public class CartSummaryViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(int itemCount) => View(itemCount);
}
```

Render it from a view with `@await Component.InvokeAsync("CartSummary", new { itemCount = 3 })`. Its view goes in `Views/Shared/Components/CartSummary/Default.cshtml`.

## When to use something else

- **Razor Pages** (`AddRazorPages()`) put the handler and the markup for one page side by side, which is often simpler for page-focused apps. It's built on the same MVC infrastructure.
- **Minimal APIs** (`app.MapGet(...)`) are lighter than controllers for small JSON APIs.
- **Blazor** is the option if you want interactive components written in C# instead of JavaScript.

## Further reading

- [Overview of ASP.NET Core MVC](https://learn.microsoft.com/aspnet/core/mvc/overview)
- [Model binding](https://learn.microsoft.com/aspnet/core/mvc/models/model-binding)
- [Model validation](https://learn.microsoft.com/aspnet/core/mvc/models/validation)
- [View components](https://learn.microsoft.com/aspnet/core/mvc/views/view-components)
