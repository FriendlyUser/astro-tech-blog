---
tags: ['linq', '.net', 'csharp']
title: "LINQ in C#: filtering, sorting, grouping and joining collections"
description: "Query syntax vs method syntax in C# LINQ, the common operators, deferred execution, and how the same queries run against a database with EF Core."
layout: '@/templates/BasePost.astro'
pubDate: Mon, 13 September 2023
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/359551664.png'
---

LINQ (Language Integrated Query) lets you filter, sort, project, group and join data in C# with
ordinary language constructs instead of hand-written loops. It shipped with C# 3.0 and .NET
Framework 3.5, and today it is part of every .NET version. The same operators work on in-memory
collections (`IEnumerable<T>`) and, through providers such as Entity Framework Core, on databases
(`IQueryable<T>`).

All the in-memory examples below use this data. They run as-is in a .NET console app with
top-level statements (`System.Linq` is an implicit using in modern SDK projects):

```csharp
var students = new List<Student>
{
    new("Ada", "Lovelace", 19, "Computer Science", 92),
    new("Alan", "Turing", 17, "Computer Science", 88),
    new("Grace", "Hopper", 21, "Mathematics", 95),
    new("Edsger", "Dijkstra", 20, "Mathematics", 81),
};

var departments = new List<Department>
{
    new("Computer Science", "Building A"),
    new("Mathematics", "Building B"),
};

record Student(string FirstName, string LastName, int Age, string Department, int Grade);
record Department(string Name, string Building);
```

## Query syntax and method syntax

LINQ has two forms. Query syntax looks a bit like SQL:

```csharp
var adults = from s in students
             where s.Age > 18
             orderby s.LastName, s.FirstName
             select new { s.FirstName, s.LastName };
```

`from` names the source and a range variable, `where` filters, `orderby` sorts, and `select`
projects each element into a new shape (here an anonymous type).

The compiler translates query syntax into calls to extension methods, so this is the same query
in method syntax:

```csharp
var adults = students
    .Where(s => s.Age > 18)
    .OrderBy(s => s.LastName)
    .ThenBy(s => s.FirstName)
    .Select(s => new { s.FirstName, s.LastName });

foreach (var a in adults)
    Console.WriteLine($"{a.FirstName} {a.LastName}");
// Edsger Dijkstra
// Grace Hopper
// Ada Lovelace
```

Use whichever reads better. Method syntax is more common in practice and is the only way to call
operators that have no query keyword, such as `Take`, `Skip`, `Distinct`, `Any` or `Count`.
Note that a secondary sort is `ThenBy`, not a second `OrderBy`; a second `OrderBy` would replace
the first ordering.

## Deferred execution

Most LINQ operators don't run when you write the query. They build a pipeline that runs each time
you enumerate it (with `foreach`, `ToList()`, `ToArray()`, `Count()`, `First()`, and so on):

```csharp
var numbers = new List<int> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

var evens = numbers.Where(n => n % 2 == 0);
numbers.Add(12);
Console.WriteLine(string.Join(", ", evens)); // 2, 4, 6, 8, 10, 12

var snapshot = numbers.Where(n => n % 2 == 0).ToList();
numbers.Add(14);
Console.WriteLine(snapshot.Count); // 6
```

`evens` sees the `12` added after the query was written, because it hadn't run yet. `snapshot`
was materialised by `ToList()`, so it doesn't see the `14`. Call `ToList()` when you want a fixed
result or when you'd otherwise enumerate an expensive query more than once.

Operators chain in the order you write them:

```csharp
var topThree = numbers
    .Where(n => n % 2 == 0)
    .OrderByDescending(n => n)
    .Take(3);
Console.WriteLine(string.Join(", ", topThree)); // 14, 12, 10
```

## Dictionaries

A `Dictionary<TKey, TValue>` is an `IEnumerable<KeyValuePair<TKey, TValue>>`, so the same
operators work on it:

```csharp
var colors = new Dictionary<string, string>
{
    ["red"] = "#ff0000",
    ["green"] = "#00ff00",
    ["blue"] = "#0000ff",
};

var hex = colors
    .Where(c => c.Key is "red" or "green")
    .OrderBy(c => c.Key)
    .Select(c => c.Value);
Console.WriteLine(string.Join(", ", hex)); // #00ff00, #ff0000
```

The enumeration order of a dictionary is not guaranteed, so add an `OrderBy` if order matters.
You don't need to call `ToList()` first; `OrderBy` works on any `IEnumerable<T>`. For a single
key, use `colors["red"]` or `TryGetValue` rather than a LINQ scan.

## Grouping, joining and aggregating

`group ... by` (or `GroupBy`) returns groups, each with a `Key` and the elements that share it:

```csharp
var byDept = from s in students
             group s by s.Department into g
             select new { Department = g.Key, Count = g.Count(), Best = g.Max(s => s.Grade) };

foreach (var d in byDept)
    Console.WriteLine($"{d.Department}: {d.Count} students, best grade {d.Best}");
// Computer Science: 2 students, best grade 92
// Mathematics: 2 students, best grade 95
```

`join` (or `Join`) is an inner join on matching keys:

```csharp
var withBuilding = from s in students
                   join d in departments on s.Department equals d.Name
                   select new { s.FirstName, s.LastName, d.Building };
```

`Sum`, `Average`, `Min`, `Max` and `Count` reduce a sequence to a single value, and unlike the
operators above they run immediately:

```csharp
double csAverage = students
    .Where(s => s.Department == "Computer Science")
    .Average(s => s.Grade); // 90
```

`Aggregate` is the general-purpose version: you supply the accumulator function yourself.

```csharp
string names = students
    .Select(s => s.FirstName)
    .Aggregate((acc, name) => acc + ", " + name); // Ada, Alan, Grace, Edsger
```

(For joining strings, `string.Join(", ", ...)` is simpler and faster; `Aggregate` is shown here
to illustrate the operator.)

## Querying a database with EF Core

The original version of this post used LINQ to SQL (`DataContext`). LINQ to SQL is a legacy .NET
Framework technology and isn't available in .NET Core or .NET 5+. Use Entity Framework Core
instead. Its `DbSet<T>` implements `IQueryable<T>`, so the provider translates your LINQ
expression into SQL rather than running it in memory.

A minimal example with SQLite (`dotnet add package Microsoft.EntityFrameworkCore.Sqlite`):

```csharp
using Microsoft.EntityFrameworkCore;

using var db = new ShopContext();
db.Database.EnsureCreated();

var usCustomers = db.Customers
    .Where(c => c.Country == "USA")
    .OrderBy(c => c.LastName)
    .Select(c => new { c.FirstName, c.LastName });

Console.WriteLine(usCustomers.ToQueryString()); // prints the generated SQL

foreach (var c in usCustomers)
    Console.WriteLine($"{c.FirstName} {c.LastName}");

public class Customer
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Country { get; set; } = "";
}

public class ShopContext : DbContext
{
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
        => options.UseSqlite("Data Source=shop.db");
}
```

`ToQueryString()` shows the SQL EF Core will send: a `SELECT` of the two columns with the
`WHERE` and `ORDER BY` applied in the database. The query runs when it is enumerated, the same
deferred execution rule as in memory. Dispose the context (the `using` declaration above) so
its database connection is released.

## Gotchas

- **Multiple enumeration.** Every `foreach` over an unmaterialised query re-runs it. Against a
  database that means another round trip; call `ToList()` once if you need the results twice.
- **`IEnumerable` vs `IQueryable`.** Once a database query becomes `IEnumerable<T>` (for example
  after `AsEnumerable()` or `ToList()`), the remaining operators run in memory on every row
  fetched. Keep filters before that point.
- **Not every C# expression translates to SQL.** EF Core throws if it can't translate a method
  call in a `Where`, rather than silently pulling the whole table.
- **`First` vs `FirstOrDefault`.** `First` throws on an empty sequence; `FirstOrDefault` returns
  `default` (null for reference types).

## Further reading

- [Language Integrated Query (LINQ) overview](https://learn.microsoft.com/en-us/dotnet/csharp/linq/)
- [Standard query operators](https://learn.microsoft.com/en-us/dotnet/csharp/linq/standard-query-operators/)
- [Querying data with EF Core](https://learn.microsoft.com/en-us/ef/core/querying/)
