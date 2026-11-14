---
description: How Entity Framework Core maps C# classes to tables, with a runnable SQLite
  example of a DbContext, saving and querying data, and a note on migrations.
imgSrc: /imgs/2023/3194903180.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-08T08:09:42.000Z'
lastUpdated: 2026-11-14
tags: ["csharp", "dotnet", "sql"]
title: 'Entity Framework Core basics: models, DbContext and LINQ queries'
---

Entity Framework (EF) is Microsoft's object-relational mapper for .NET. You define plain C# classes, EF maps them to tables, and you query with LINQ, which EF translates into SQL. It also tracks changes to the objects it loaded and writes them back when you call `SaveChanges`.

There are two products with the name:

- **Entity Framework 6 (EF6)** is the original, built for .NET Framework. It still gets fixes, but new development happens in EF Core.
- **Entity Framework Core (EF Core)** is a cross-platform rewrite that runs on modern .NET. EF Core 10 (November 2025) runs on .NET 10, which is a long-term support release. EF Core 11 (November 2026) requires .NET 11.

EF isn't part of the .NET runtime or the base class library. You install it from NuGet. This post covers EF Core.

## How EF Core is put together

- **Entity classes** are ordinary C# classes. EF uses conventions to map them: a property named `Id` or `<Type>Id` becomes the primary key, and a property like `BlogId` alongside a `Blog` navigation becomes a foreign key.
- **`DbContext`** is a unit of work. It holds the connection configuration, exposes a `DbSet<T>` per table, tracks the entities it loaded, and saves changes in a transaction. Contexts are cheap to create and aren't thread-safe, so use one per request or operation and dispose it afterwards.
- **The model** is built at runtime from your classes, conventions, and anything you configure in `OnModelCreating` or with attributes. EF Core has no visual designer or `.edmx` file, unlike EF6.
- **Database providers** translate queries for a specific database. Microsoft ships providers for SQL Server, SQLite, Azure Cosmos DB and an in-memory store. Third-party providers cover PostgreSQL (Npgsql), MySQL and others.
- **Tooling** (`dotnet ef`) creates and applies migrations and can scaffold entity classes from an existing database.

## A runnable example

This example uses SQLite so it runs anywhere without a database server. For SQL Server, install `Microsoft.EntityFrameworkCore.SqlServer` and call `UseSqlServer(connectionString)` instead of `UseSqlite`.

```bash
dotnet new console -n EfDemo
cd EfDemo
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
```

`Program.cs`:

```csharp
using Microsoft.EntityFrameworkCore;

using var db = new BloggingContext();
db.Database.EnsureCreated(); // creates the database and tables if missing (see the note on migrations below)

var blog = new Blog { Url = "https://example.com" };
blog.Posts.Add(new Post { Title = "Hello EF Core", Content = "First post" });
blog.Posts.Add(new Post { Title = "Migrations", Content = "Second post" });
db.Blogs.Add(blog);
db.SaveChanges(); // one transaction: inserts the blog, then both posts with the new BlogId

// Load blogs together with their posts
var blogs = db.Blogs
    .Include(b => b.Posts)
    .OrderBy(b => b.BlogId)
    .ToList();

foreach (var b in blogs)
{
    Console.WriteLine($"Blog {b.BlogId}: {b.Url} ({b.Posts.Count} posts)");
    foreach (var p in b.Posts)
        Console.WriteLine($"  - {p.Title}");
}

// LINQ is translated to SQL; only the Title column is fetched
var query = db.Posts
    .Where(p => p.Title.Contains("EF"))
    .Select(p => p.Title);
Console.WriteLine(query.ToQueryString());
Console.WriteLine(string.Join(", ", query.ToList()));

// Change tracking: modify a loaded entity, then save
var first = db.Posts.First();
first.Title = "Hello again";
db.SaveChanges(); // issues an UPDATE for the Title column only

public class BloggingContext : DbContext
{
    public DbSet<Blog> Blogs => Set<Blog>();
    public DbSet<Post> Posts => Set<Post>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
        => options.UseSqlite("Data Source=blogging.db");
}

public class Blog
{
    public int BlogId { get; set; }
    public required string Url { get; set; }
    public List<Post> Posts { get; } = new();
}

public class Post
{
    public int PostId { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }

    public int BlogId { get; set; }
    public Blog Blog { get; set; } = null!;
}
```

On the first run, the query part prints:

```text
Blog 1: https://example.com (2 posts)
  - Hello EF Core
  - Migrations
SELECT "p"."Title"
FROM "Posts" AS "p"
WHERE instr("p"."Title", 'EF') > 0
Hello EF Core
```

`ToQueryString()` is a handy way to check what SQL a LINQ query produces. It's provider-specific: SQLite uses `instr` for `Contains`, and SQL Server uses `LIKE` or `CHARINDEX`.

The `required` keyword and `= null!` keep the code free of nullable-reference warnings. EF Core reads nullability too: `string` columns become `NOT NULL`, and `string?` columns become nullable.

## Migrations instead of `EnsureCreated`

`EnsureCreated` is fine for demos and tests, but it can't change an existing schema. For a real application, use migrations so each model change becomes a versioned script:

```bash
dotnet tool install --global dotnet-ef
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Remove the `EnsureCreated` call when you switch, because a database created by `EnsureCreated` can't be updated by migrations later.

## Gotchas

- **Related data isn't loaded automatically.** Without `Include`, `blog.Posts` is empty unless those posts are already tracked by the context. Lazy loading exists, but it's opt-in (the `Microsoft.EntityFrameworkCore.Proxies` package) and can cause one query per row (the N+1 problem).
- **Read-only queries don't need tracking.** Add `.AsNoTracking()` when you won't modify the results. It's faster and uses less memory.
- **Filter in the query, not after `ToList()`.** Everything before `ToList()` runs in the database. Calling `.ToList().Where(...)` downloads the whole table first.
- **Configure through dependency injection in web apps.** In ASP.NET Core, register the context with `builder.Services.AddDbContext<BloggingContext>(...)` and inject it, rather than overriding `OnConfiguring`.

## Further reading

- [EF Core getting started](https://learn.microsoft.com/ef/core/get-started/overview/first-app)
- [Migrations overview](https://learn.microsoft.com/ef/core/managing-schemas/migrations/)
- [Comparing EF Core and EF6](https://learn.microsoft.com/ef/efcore-and-ef6/)
- [What's new in EF Core](https://learn.microsoft.com/ef/core/what-is-new/)
