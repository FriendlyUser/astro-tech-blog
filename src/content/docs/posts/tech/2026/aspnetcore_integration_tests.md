---
title: "Integration testing ASP.NET Core with WebApplicationFactory"
description: "Test an ASP.NET Core API in memory with WebApplicationFactory and xUnit v3: replace services in ConfigureTestServices and swap the database for in-memory SQLite."
tags: ["ASP.NET Core", "C#", "Testing", "xUnit", "EF Core"]
pubDate: "2026-12-20T16:00:00.000Z"
imgSrc: "/imgs/2026/aspnetcore_integration_tests.webp"
imgAlt: "A test runner sending HTTP requests into an in-memory server whose database and email services are swapped for fakes"
---

`WebApplicationFactory<TEntryPoint>` starts your real ASP.NET Core app inside the test process, with the same `Program.cs`, middleware, routing, model binding and DI registrations, and gives you an `HttpClient` that talks to it in memory. No port, no separate process. Tests send real HTTP requests and check real responses, so they catch the mistakes unit tests miss: a wrong route, a missing service registration, JSON that doesn't serialize the way you thought.

This post tests a small todo API end to end: replacing services with fakes in `ConfigureTestServices`, swapping the database for in-memory SQLite, and organising tests with xUnit v3 fixtures. The packages are for .NET 10. I ran the tests on .NET 9 with the matching 9.0.x packages; the differences are noted where they matter.

## The app under test

A minimal API with EF Core, a clock and a notification service:

```csharp
// TodoApi/Program.cs
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<TodoDb>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Todos") ?? "Data Source=todos.db"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<INotifier, EmailNotifier>();

var app = builder.Build();

app.MapGet("/todos", async (TodoDb db) =>
    await db.Todos.OrderBy(t => t.Id).ToListAsync());

app.MapGet("/todos/{id:int}", async (int id, TodoDb db) =>
    await db.Todos.FindAsync(id) is { } todo ? Results.Ok(todo) : Results.NotFound());

app.MapPost("/todos", async (NewTodo input, TodoDb db, TimeProvider clock, INotifier notifier) =>
{
    if (string.IsNullOrWhiteSpace(input.Title))
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["Title"] = ["Title is required."] });

    var todo = new Todo { Title = input.Title.Trim(), CreatedAt = clock.GetUtcNow() };
    db.Todos.Add(todo);
    await db.SaveChangesAsync();
    await notifier.TodoCreatedAsync(todo);
    return Results.Created($"/todos/{todo.Id}", todo);
});

app.Run();

public record NewTodo(string? Title);

public class Todo
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public bool Done { get; set; }
}

public class TodoDb(DbContextOptions<TodoDb> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();
}

public interface INotifier
{
    Task TodoCreatedAsync(Todo todo);
}

public sealed class EmailNotifier(ILogger<EmailNotifier> logger) : INotifier
{
    public Task TodoCreatedAsync(Todo todo)
    {
        // A real app would send an email here.
        logger.LogInformation("Would email about todo {Id}", todo.Id);
        return Task.CompletedTask;
    }
}
```

The project references `Microsoft.EntityFrameworkCore.Sqlite` 10.0.15.

### public partial class Program

`WebApplicationFactory<Program>` needs to see the `Program` class, and top-level statements generate it as `internal`. Up to .NET 9 the fix was to add this line to the end of `Program.cs`:

```csharp
public partial class Program;
```

In .NET 10 you don't need it. ASP.NET Core includes a source generator that emits `public partial class Program` when you haven't declared it, plus an analyzer that suggests removing the explicit declaration if you have. If you still target .NET 9, keep the line. That's what my test run used.

## The test project

```xml
<!-- TodoApi.Tests/TodoApi.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.15" />
    <PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" Version="10.11.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.12.0" />
    <PackageReference Include="xunit.v3" Version="4.0.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="4.0.1" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\TodoApi\TodoApi.csproj" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

</Project>
```

`Microsoft.AspNetCore.Mvc.Testing` provides `WebApplicationFactory` and also copies the app's `.deps.json` into the test output so the app can start there. Despite the name, it works for minimal APIs, not just MVC. xUnit v3 test projects are executables, hence `OutputType Exe`.

## A custom factory

You could use `WebApplicationFactory<Program>` directly, but almost every real test suite needs to change something about the app: the database, external services, the clock. Do that in a subclass:

```csharp
// TodoApi.Tests/TodoApiFactory.cs
using System.Data.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

public sealed class TodoApiFactory : WebApplicationFactory<Program>
{
    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 12, 20, 9, 0, 0, TimeSpan.Zero));
    public FakeNotifier Notifier { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            // Drop the app's database configuration...
            services.RemoveAll<DbContextOptions<TodoDb>>();
            services.RemoveAll<IDbContextOptionsConfiguration<TodoDb>>();

            // ...and use one in-memory SQLite connection that stays open for the factory's lifetime.
            services.AddSingleton<DbConnection>(_ =>
            {
                var connection = new SqliteConnection("DataSource=:memory:");
                connection.Open();
                return connection;
            });
            services.AddDbContext<TodoDb>((sp, options) =>
                options.UseSqlite(sp.GetRequiredService<DbConnection>()));

            // Replace other dependencies with test doubles.
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<INotifier>();
            services.AddSingleton<INotifier>(Notifier);
        });
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TodoDb>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
        Notifier.Created.Clear();
    }
}

public sealed class FakeNotifier : INotifier
{
    public List<Todo> Created { get; } = [];

    public Task TodoCreatedAsync(Todo todo)
    {
        Created.Add(todo);
        return Task.CompletedTask;
    }
}
```

The pieces:

- **`UseEnvironment("Testing")`** sets the host environment, so `appsettings.Testing.json` is loaded and `IsDevelopment()` checks behave as they would outside your machine.
- **`ConfigureTestServices`** runs *after* the app's own registrations in `Program.cs`. That ordering is what makes replacement work: remove the app's registration, add yours.
- **`RemoveAll<T>()`** (from `Microsoft.Extensions.DependencyInjection.Extensions`) removes every registration of a service type. Registering a second implementation without removing the first also "works" for single resolution, since the last one wins, but anything that resolves `IEnumerable<T>` sees both.

### Why the database swap needs two removals

Since EF Core 9, each `AddDbContext` call adds an `IDbContextOptionsConfiguration<TContext>`, and all of them are applied when options are built. If you only remove `DbContextOptions<TodoDb>`, the app's `UseSqlite(...)` callback is still registered and runs alongside yours. With the same provider on both sides that happens to work, because the later configuration wins. With a different provider in the app, which is the usual case when production uses SQL Server or PostgreSQL, the first request fails. I checked by switching the app to another provider and leaving the second removal out:

```text
System.InvalidOperationException : Services for database providers 'Microsoft.EntityFrameworkCore.InMemory', 'Microsoft.EntityFrameworkCore.Sqlite' have been registered in the service provider. Only a single database provider can be registered in a service provider. ...
```

Remove both, as the factory does.

### Why the connection is a singleton

An in-memory SQLite database lives exactly as long as its connection. If EF Core opened and closed its own connection per `DbContext`, every request would see a brand-new empty database. Registering one open `SqliteConnection` as a singleton keeps the database alive for the factory's lifetime, and every `DbContext` in the app shares it.

In-memory SQLite is a real relational database: it enforces constraints, runs SQL and supports transactions, which the EF Core in-memory provider does not. It is still not your production database. Different SQL dialects, collations and concurrency behaviour mean some bugs will only show up against the real engine. For those, run the same tests against PostgreSQL or SQL Server in a container (Testcontainers for .NET makes that easy) and keep SQLite for the fast inner loop.

## The tests

```csharp
// TodoApi.Tests/TodoEndpointsTests.cs
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;

public sealed class TodoEndpointsTests(TodoApiFactory factory) : IClassFixture<TodoApiFactory>, IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync() => await factory.ResetDatabaseAsync();
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task Post_creates_a_todo_and_returns_its_location()
    {
        var response = await _client.PostAsJsonAsync("/todos", new { title = "  Write tests  " }, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<Todo>(Ct);
        Assert.NotNull(created);
        Assert.Equal("Write tests", created.Title);
        Assert.Equal(factory.Clock.GetUtcNow(), created.CreatedAt);
        Assert.Equal($"/todos/{created.Id}", response.Headers.Location?.ToString());

        var fetched = await _client.GetFromJsonAsync<Todo>(response.Headers.Location, Ct);
        Assert.Equal(created.Id, fetched?.Id);
        Assert.Single(factory.Notifier.Created);
    }

    [Fact]
    public async Task Post_without_title_returns_validation_problem()
    {
        var response = await _client.PostAsJsonAsync("/todos", new { title = "" }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(Ct);
        Assert.Equal(["Title is required."], problem!.Errors["Title"]);
        Assert.Empty(factory.Notifier.Created);
    }

    [Fact]
    public async Task Get_returns_todos_in_creation_order()
    {
        await _client.PostAsJsonAsync("/todos", new { title = "first" }, Ct);
        await _client.PostAsJsonAsync("/todos", new { title = "second" }, Ct);

        var todos = await _client.GetFromJsonAsync<List<Todo>>("/todos", Ct);

        Assert.Equal(["first", "second"], todos!.Select(t => t.Title));
    }

    [Fact]
    public async Task Get_unknown_id_returns_404()
    {
        var response = await _client.GetAsync("/todos/999", Ct);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

`dotnet test` output from my run:

```text
Passed!  - Failed:     0, Passed:     4, Skipped:     0, Total:     4, Duration: 2 s - TodoApi.Tests.dll (net9.0)
```

The first test covers what a unit test of the handler couldn't: the route, JSON binding of an anonymous object, the `Location` header, a second request reading what the first one wrote, the fake clock's timestamp coming back through serialization, and the notifier being called once. The fakes are exposed as properties on the factory, so tests can control the clock (`factory.Clock.Advance(...)`) and inspect what the notifier received.

`CreateClient()` returns a client whose `BaseAddress` points at the in-memory server and which follows redirects and handles cookies by default. Pass `WebApplicationFactoryClientOptions` to change that, for example `AllowAutoRedirect = false` to assert on a 302 itself.

## How the xUnit fixtures fit together

- **`IClassFixture<TodoApiFactory>`**: xUnit creates one factory for the test class, passes it to the constructor of each test, and disposes it after the last test in the class. Starting the app takes a moment, so sharing it across a class keeps the suite fast.
- **xUnit creates a new instance of the test class for every test.** So `_client` is per test, and `InitializeAsync` (from `IAsyncLifetime`, which returns `ValueTask` in xUnit v3) runs before each one. That is where the database is reset, so tests don't depend on each other's data.
- **Tests in one class run one after another; different classes run in parallel**, each with its own factory and therefore its own in-memory database. To share one factory across several classes, use a collection fixture (`[CollectionDefinition]` with `ICollectionFixture<TodoApiFactory>`). Classes in the same collection don't run in parallel with each other, which is what you want when they share state.
- **`TestContext.Current.CancellationToken`** is xUnit v3's token, cancelled when the run is aborted or a test times out. xUnit's analyzer suggests passing it to async calls, and it stops a hung request from blocking the whole run.

## Variations per test

`WithWebHostBuilder` derives a new factory with extra configuration, without writing another subclass:

```csharp
var failingFactory = factory.WithWebHostBuilder(builder =>
    builder.ConfigureTestServices(services =>
    {
        services.RemoveAll<INotifier>();
        services.AddSingleton<INotifier, ThrowingNotifier>();
    }));
var client = failingFactory.CreateClient();
```

Each derived factory starts its own copy of the app, so use this for the few tests that need it rather than for every test. `ThrowingNotifier` here is any `INotifier` that throws, to test how the endpoint handles a failing dependency.

## Gotchas

- **Authentication.** Endpoints behind `[Authorize]` return 401 in tests unless you deal with auth. The usual approach is a test authentication handler registered in `ConfigureTestServices` that signs in a fixed user, with the scheme made the default.
- **Hosted services start too.** `BackgroundService`s registered by the app run inside the test host. If they poll queues or call external systems, remove the specific registration in `ConfigureTestServices`: `services.Remove(services.Single(d => d.ImplementationType == typeof(CleanupWorker)))`, where `CleanupWorker` is your hosted service.
- **Configuration.** Use `builder.UseSetting("ConnectionStrings:Todos", "...")` or `ConfigureAppConfiguration` in the factory to override settings. Don't depend on the developer's user secrets or environment variables; CI won't have them.
- **Static state leaks between tests.** Two factories in the same process share static fields and caches. Avoid statics in the app, or make sure tests that touch them don't run in parallel.
- **`EnsureCreated` isn't migrations.** It builds the schema from the model and skips your migration files, so a broken migration still passes these tests. Run `Database.MigrateAsync()` in at least one test suite against the real engine.

## Further reading

- [Integration tests in ASP.NET Core](https://learn.microsoft.com/aspnet/core/test/integration-tests)
- [Testing against your production database system (EF Core)](https://learn.microsoft.com/ef/core/testing/testing-with-the-database)
- [xUnit.net v3 documentation](https://xunit.net/docs/getting-started/v3/whats-new)
