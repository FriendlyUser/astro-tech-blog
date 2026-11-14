---
description: Use Dapper to run SQL from C# and map rows to objects, with a runnable SQLite
  example covering queries, parameters, inserts and transactions.
imgSrc: /imgs/2023/bear-book-1.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-05-15T13:51:04.000Z'
lastUpdated: 2026-11-14
tags: ["csharp", "dotnet", "sql"]
title: 'Dapper in .NET: run SQL and map the results to C# objects'
---

Dapper is a small library that adds extension methods such as `Query<T>` and `Execute` to ADO.NET's `IDbConnection`. You write the SQL yourself, and Dapper handles parameters and maps the result columns onto your objects' properties by name. It was originally built at Stack Overflow, is now maintained in the [DapperLib/Dapper](https://github.com/DapperLib/Dapper) repository, and is licensed under Apache 2.0.

It's often called a "micro-ORM" because it does only the mapping part of an ORM. There is no change tracking, no LINQ-to-SQL translation, no migrations and no lazy loading. That's the trade-off. Your SQL runs as written, and the overhead on top of a hand-written `DataReader` loop is small. The project README has a benchmark table comparing it with other mappers.

The examples use Dapper 2.1.89 with C# top-level statements, and they build without warnings on .NET 9.

## Setup

Dapper works with any ADO.NET provider. This post uses SQLite so you can run the code without a database server:

```bash
dotnet new console -n DapperDemo
cd DapperDemo
dotnet add package Dapper
dotnet add package Microsoft.Data.Sqlite
```

For SQL Server, install `Microsoft.Data.SqlClient` and create a `SqlConnection` instead. Don't use the older `System.Data.SqlClient` package. Microsoft deprecated it in 2024, and it doesn't support .NET 10 and later.

```csharp
using Microsoft.Data.SqlClient;

using var connection = new SqlConnection(
    "Server=(localdb)\\MSSQLLocalDB;Database=MyDatabase;Integrated Security=True");
```

Everything else in this post works the same with either connection type.

## A complete example

This program creates a table, inserts rows, reads them back in a few ways, and runs two changes inside a transaction:

```csharp
using Dapper;
using Microsoft.Data.Sqlite;

using var connection = new SqliteConnection("Data Source=people.db");
connection.Open();

connection.Execute("""
    CREATE TABLE IF NOT EXISTS People (
        Id        INTEGER PRIMARY KEY,
        FirstName TEXT NOT NULL,
        LastName  TEXT NOT NULL
    )
    """);
connection.Execute("DELETE FROM People");

// Passing a collection runs the statement once per item
int inserted = connection.Execute(
    "INSERT INTO People (FirstName, LastName) VALUES (@FirstName, @LastName)",
    new[]
    {
        new { FirstName = "Ada", LastName = "Lovelace" },
        new { FirstName = "Grace", LastName = "Hopper" },
        new { FirstName = "Alan", LastName = "Turing" },
    });
Console.WriteLine($"Inserted {inserted} rows");

// Map rows to a class
IEnumerable<Person> people = connection.Query<Person>(
    "SELECT Id, FirstName, LastName FROM People ORDER BY LastName");
foreach (var p in people)
    Console.WriteLine($"{p.Id}: {p.FirstName} {p.LastName}");

// Parameters come from an anonymous object
Person? grace = connection.QuerySingleOrDefault<Person>(
    "SELECT Id, FirstName, LastName FROM People WHERE FirstName = @name",
    new { name = "Grace" });
Console.WriteLine(grace?.LastName);

// A single value
int count = connection.ExecuteScalar<int>("SELECT COUNT(*) FROM People");
Console.WriteLine($"{count} people");

// Two changes that succeed or fail together
using (var transaction = connection.BeginTransaction())
{
    connection.Execute(
        "UPDATE People SET LastName = @LastName WHERE Id = @Id",
        new { Id = 1, LastName = "King" }, transaction);
    connection.Execute(
        "DELETE FROM People WHERE Id = @Id",
        new { Id = 2 }, transaction);
    transaction.Commit();
}

public class Person
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
}
```

Output:

```text
Inserted 3 rows
2: Grace Hopper
1: Ada Lovelace
3: Alan Turing
Hopper
3 people
```

A few things to notice:

- **Parameters are real parameters.** `@name` is sent as a database parameter, not pasted into the SQL string, so it's safe from SQL injection. Never build SQL with string interpolation of user input.
- **Mapping is by column name.** Columns map to properties with the same name, ignoring case. If a column name differs, alias it in SQL (`SELECT first_name AS FirstName`). Dapper also converts compatible types. SQLite returns `INTEGER` as a 64-bit value, and Dapper converts it to the `int` property.
- **Transactions are passed explicitly.** Disposing a transaction without calling `Commit` rolls it back, so the `using` block is enough for error handling. You don't need a `try`/`catch` that calls `Rollback`. Each command inside the transaction must receive the `transaction` argument. Microsoft.Data.Sqlite and Microsoft.Data.SqlClient both throw if you forget.

## Other useful calls

```csharp
// Async versions of every method
var all = await connection.QueryAsync<Person>("SELECT Id, FirstName, LastName FROM People");

// IN lists: Dapper expands the array into (@ids1, @ids2, ...)
var some = connection.Query<Person>(
    "SELECT Id, FirstName, LastName FROM People WHERE Id IN @ids",
    new { ids = new[] { 1, 3 } });
```

- `QueryFirst`, `QueryFirstOrDefault`, `QuerySingle` and `QuerySingleOrDefault` return one row. The `Single` versions throw if more than one row comes back.
- `QueryMultiple` reads several result sets from one command.
- Multi-mapping (`Query<TFirst, TSecond, TReturn>` with `splitOn`) maps a joined row onto two objects, for example a `Post` and its `Author`.

## Gotchas

- `Query<T>` buffers every row into a list by default. For very large result sets, pass `buffered: false` to stream rows instead. The underlying data reader stays open until you finish iterating, so don't run other commands on that connection in the meantime.
- Dapper caches information about each query it runs, keyed by the SQL text and parameter types. If you generate a different SQL string on every call, that cache keeps growing. Use parameters instead of building unique strings.
- Dapper doesn't generate SQL. Add-on packages such as Dapper.Contrib provide CRUD helpers, but Dapper.Contrib hasn't had a release since 2020. If you want a library to write the SQL and track changes for you, use EF Core instead. Many projects use both: EF Core for most data access and Dapper for hand-tuned queries.

## Further reading

- [Dapper README](https://github.com/DapperLib/Dapper)
- [Dapper on NuGet](https://www.nuget.org/packages/Dapper)
- [Microsoft.Data.SqlClient introduction](https://learn.microsoft.com/sql/connect/ado-net/introduction-microsoft-data-sqlclient-namespace)
