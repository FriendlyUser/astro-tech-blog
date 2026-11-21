---
title: "Records and pattern matching in modern C#"
description: "How C# records work (record class vs struct, with-expressions, value equality) and how to match them with property, relational and list patterns in switch expressions."
tags: ["C#", "dotnet", "Records", "Pattern Matching", "Language Features"]
pubDate: "2026-06-11T16:00:00.000Z"
imgSrc: "/imgs/2026/csharp_records_pattern_matching.webp"
imgAlt: "A switch expression drawn as a decision tree routing order records to shipping prices"
---

Records are C# types built for data: you declare the fields, and the compiler writes the constructor, value-based equality, `ToString`, deconstruction and non-destructive copying. Pattern matching is the other half. A `switch` expression can test the shape of a record (its properties, the length of a list, whether a number is in a range) and pick a result without a ladder of `if` statements. Together they make domain rules short and easy to check.

This post walks through both with one runnable example: an order with an address and line items, and a shipping-price function written as a single `switch`. The code uses C# 13 on .NET 9; everything shown has been in the language since C# 11 and works the same in C# 14.

## The types

Put these at the bottom of `Program.cs` in a new console app (`dotnet new console -n Records`):

```csharp
public record Address(string Street, string City, string Country);

public record Line(string Sku, int Quantity, decimal UnitPrice)
{
    public decimal Amount => Quantity * UnitPrice;
}

public record Order(int Id, string Email, Address Address, List<Line> Lines)
{
    public decimal Total => Lines.Sum(l => l.Amount);
}

public readonly record struct Point(int X, int Y);
```

`record Address(string Street, string City, string Country)` is a **positional record**. From that one line the compiler generates:

- a constructor taking the three values;
- a public `init`-only property for each parameter, so the object is immutable after construction;
- `Equals`, `GetHashCode`, `==` and `!=` based on the values of all fields;
- a `ToString` that prints `Address { Street = ..., City = ..., Country = ... }`;
- a `Deconstruct` method, so `var (street, city, _) = address;` works;
- a hidden copy constructor that `with` expressions use.

You can add members in a body, like the computed `Amount` and `Total` above. A computed property with no backing field doesn't take part in equality; only fields do.

## record class vs record struct

`record` on its own means `record class`: a reference type, allocated on the heap, with value-based equality bolted on. C# 10 added `record struct`, a value type with the same generated members. They differ in more than allocation:

| | `record` / `record class` | `record struct` | `readonly record struct` |
|---|---|---|---|
| Kind | reference type | value type | value type |
| Positional properties | `get; init;` | `get; set;` (mutable) | `get; init;` |
| Inheritance | can inherit from another record | no | no |
| `null` | can be null | can't (unless `Point?`) | can't |

The middle column catches people: a positional `record struct` has *settable* properties. `var mp = new MutablePoint(1, 2); mp.X = 9;` compiles and prints `MutablePoint { X = 9, Y = 2 }`. If you want an immutable value type, write `readonly record struct`, as `Point` does above.

I use `record class` for domain objects and DTOs, and `readonly record struct` for small values such as coordinates, money amounts or IDs. Those are usually under 16 bytes or so, are created in large numbers, and gain from not being allocated individually.

## with-expressions and value equality

Add this at the top of `Program.cs`:

```csharp
var a = new Address("12 Main St", "Halifax", "CA");
var order = new Order(1001, "alice@example.com", a, [new Line("BOOK", 2, 15.00m), new Line("PEN", 10, 1.25m)]);

var copy = order with { Id = 1002 };
Console.WriteLine(copy.Address == order.Address);                  // True: same Address value
Console.WriteLine(ReferenceEquals(copy.Lines, order.Lines));       // True: with is a shallow copy

var same = new Order(1001, "alice@example.com", new Address("12 Main St", "Halifax", "CA"), order.Lines);
Console.WriteLine(order == same);                                  // True: equal fields
var sameLinesNewList = order with { Lines = [.. order.Lines] };
Console.WriteLine(order == sameLinesNewList);                      // False: List compared by reference

Console.WriteLine(a);                                              // generated ToString
var (street, city, _) = a;                                         // positional deconstruction
Console.WriteLine($"{street} / {city}");

var p1 = new Point(1, 2);
var p2 = p1 with { Y = 5 };
Console.WriteLine($"{p1} {p2} {p1 == new Point(1, 2)}");
```

Output:

```text
True
True
True
False
Address { Street = 12 Main St, City = Halifax, Country = CA }
12 Main St / Halifax
Point { X = 1, Y = 2 } Point { X = 1, Y = 5 } True
```

Two lines deserve a closer look.

**`with` is a shallow copy.** `order with { Id = 1002 }` copies every field and then sets `Id`. The new order shares the same `List<Line>` instance as the old one. Add a line to one and the other sees it. If a record holds a mutable collection, either replace the collection in the `with` (`with { Lines = [.. order.Lines, newLine] }`) or use an immutable collection type.

**Equality doesn't look inside collections.** Generated equality compares each field with `EqualityComparer<T>.Default`. For `Address` that's another record, so it compares values. For `List<Line>`, it's reference equality. Two orders with identical lines in different lists are *not* equal, which is the `False` above. If you need deep equality, override `Equals(Order? other)` and `GetHashCode`, or store the lines in a type with value semantics.

### Equality and inheritance

Records can inherit from records, and equality takes the runtime type into account. `new Animal("Rex") == new Dog("Rex")` is `false` when `Dog` derives from `Animal`, even though every field matches. The compiler generates an `EqualityContract` property that returns the record's runtime type and compares it first. That's usually what you want; just don't expect a base-typed list to deduplicate derived records with the same data.

## Pattern matching in switch expressions

Now the shipping rules. Free shipping for empty orders and gift cards, free in Canada over $50, flat rates otherwise:

```csharp
static decimal Shipping(Order order) => order switch
{
    { Lines: [] } => 0m,
    { Lines: [{ Sku: "GIFTCARD" }] } => 0m,                       // list pattern + property pattern
    { Address.Country: "CA", Total: >= 50m } => 0m,               // extended property + relational
    { Address.Country: "CA" } => 8m,
    { Address.Country: "US" or "MX" } => 15m,
    { Total: > 500m } => 25m,
    _ => 40m,
};
```

Each arm is a pattern, and arms are checked top to bottom. The patterns used:

- **Property patterns** (`{ Lines: ..., Total: ... }`) test properties of the object. All listed properties must match.
- **Extended property patterns** (`Address.Country: "CA"`, C# 10) reach into nested properties without writing `{ Address: { Country: "CA" } }`.
- **Relational patterns** (`>= 50m`, `> 500m`, C# 9) compare against a constant.
- **Logical patterns** (`"US" or "MX"`, plus `and` and `not`, C# 9) combine patterns.
- **List patterns** (`[]`, `[{ Sku: "GIFTCARD" }]`, C# 11) match a list's length and elements. `[]` is "empty"; `[x]` is "exactly one element, matching x".
- **The discard** `_` matches anything.

Order matters. The `"CA"` rule with `Total: >= 50m` must come before the general `"CA"` rule, or it would never be reached. The compiler helps here: an arm that can never match because earlier arms cover it is error CS8510. A `switch` that doesn't cover every input gets warning CS8509. At runtime an unmatched value throws `SwitchExpressionException`.

### List patterns with slices

List patterns get more useful with the slice pattern `..`, which matches any number of elements and can capture them:

```csharp
static string Describe(List<Line> lines) => lines switch
{
    [] => "empty",
    [var only] => $"just {only.Sku}",
    [var first, .., var last] when first.Sku == last.Sku => "starts and ends with the same item",
    [var first, .. var rest] => $"{first.Sku} and {rest.Count} more",
};
```

`.. var rest` captures the remaining elements as a new `List<Line>`. To build it, the compiler calls the type's range indexer or its `Slice(start, length)` method; `List<T>` has had `Slice` since .NET 8. The `when` clause adds a condition that patterns can't express, such as comparing two captured values.

List patterns work on anything with a `Length` or `Count` and an indexer: arrays, `List<T>`, `Span<T>`, `string`. The slice pattern needs a range indexer or `Slice` method too.

### Type and relational patterns together

Patterns aren't just for records. This classifies arbitrary values:

```csharp
static string Classify(object? value) => value switch
{
    null => "nothing",
    0 => "zero",
    int n and < 0 => $"negative int {n}",
    int and (>= 1 and <= 9) => "single digit",
    int n => $"int {n}",
    string { Length: > 0 } s => $"text '{s}'",
    not (int or string) => $"other {value.GetType().Name}",
    _ => "empty string",
};
```

Then run both functions:

```csharp
foreach (var o in new[]
{
    order,
    order with { Address = a with { Country = "US" } },
    order with { Lines = [] },
    order with { Lines = [new Line("GIFTCARD", 1, 50m)] },
    order with { Address = a with { Country = "JP" }, Lines = [new Line("BOOK", 40, 15m)] },
})
{
    Console.WriteLine($"{o.Id}: {Shipping(o),6:F2} | {Describe(o.Lines)}");
}

foreach (var c in new object[] { 0, 7, -3, 250, "hi", 3.5, null! })
    Console.WriteLine($"{c ?? "null",-5} -> {Classify(c)}");
```

```text
1001:   8.00 | BOOK and 1 more
1001:  15.00 | BOOK and 1 more
1001:   0.00 | empty
1001:   0.00 | just GIFTCARD
1001:  25.00 | just BOOK
0     -> zero
7     -> single digit
-3    -> negative int -3
250   -> int 250
hi    -> text 'hi'
3.5   -> other Double
null  -> nothing
```

The first order totals $42.50, so it misses the free-shipping threshold and pays the Canadian flat rate. The last one goes to Japan with a $600 total and hits the `> 500m` rule.

Notice the nested `with` in `order with { Address = a with { Country = "US" } }`. Since C# 10, `with` also works on structs and anonymous types.

## Gotchas

- **Records are not automatically immutable.** Positional properties are `init`-only, but a record can hold a `List<T>`, an array, or a property you declared with `set`. Equality and hash codes computed from mutable state break dictionaries and sets when the state changes.
- **Don't use records as EF Core entities** if you rely on change tracking. EF Core tracks entities by reference identity, while records redefine equality by value, and `with` creates new instances that EF doesn't know about. Records work well for DTOs and read models.
- **`ToString` prints everything,** including fields you'd rather not log, like emails and tokens. Override `PrintMembers` or `ToString` on records that hold sensitive data.
- **Pattern order is semantics.** Reordering arms in a `switch` changes behaviour. A test per rule is cheap insurance.
- **Patterns only compare against constants.** `{ Total: > limit }` with a variable `limit` doesn't compile; use a `when` clause.

## Further reading

- [Records (C# reference)](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
- [Pattern matching overview](https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching)
- [Patterns (C# reference)](https://learn.microsoft.com/dotnet/csharp/language-reference/operators/patterns)
