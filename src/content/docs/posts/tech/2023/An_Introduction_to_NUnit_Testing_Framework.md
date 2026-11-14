---
description: 'Set up an NUnit test project for .NET, write tests with Assert.That and [TestCase], and run them with dotnet test or Visual Studio.'
imgSrc: /imgs/2023/3267094508_short_ruler_in_the_grass.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-23T22:59:48.000Z'
lastUpdated: 2026-11-14
tags: ["dotnet", "csharp", "testing"]
title: 'Unit testing .NET code with NUnit: setup, assertions and test cases'
---

NUnit is an open-source unit testing framework for .NET. You mark classes and methods with attributes such as `[Test]` and `[TestCase]`, write assertions with `Assert.That`, and run the tests from `dotnet test`, Visual Studio, Rider or VS Code. It started as a port of JUnit and is one of the three common .NET test frameworks, alongside xUnit.net and MSTest.

This post was updated for NUnit 5.0 (September 2026), which targets .NET Framework 4.6.2, .NET 8 and .NET 10. The examples also work on NUnit 4.

## Setting up a test project

The quickest route is the `dotnet new` template. Assuming you already have a class library called `Calculator`:

```bash
dotnet new nunit -o Calculator.Tests
dotnet add Calculator.Tests reference Calculator
dotnet test
```

A test project needs three packages. The template adds them, but it can lag behind the latest releases, so check the versions in the `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.12.0" />
  <PackageReference Include="NUnit" Version="5.0.0" />
  <PackageReference Include="NUnit3TestAdapter" Version="6.3.1" />
  <PackageReference Include="NUnit.Analyzers" Version="4.15.0" />
</ItemGroup>
```

- `NUnit` is the framework: attributes, assertions and the engine that runs tests.
- `NUnit3TestAdapter` lets `dotnet test` and the Visual Studio Test Explorer discover and run NUnit tests. Despite the "3" in the name, it is the current adapter for NUnit 4 and 5.
- `Microsoft.NET.Test.Sdk` provides the test host that `dotnet test` uses.
- `NUnit.Analyzers` is optional but worth having. It flags common mistakes at compile time and offers code fixes when you upgrade between major versions.

## Writing tests

Here's the code under test:

```csharp
namespace Calculator;

public static class MathOps
{
    public static int Add(int a, int b) => a + b;

    public static int Divide(int a, int b) => a / b;
}
```

And a test class:

```csharp
using System;
using Calculator;
using NUnit.Framework;

namespace Calculator.Tests;

[TestFixture]
public class MathOpsTests
{
    [Test]
    public void Add_ReturnsSum()
    {
        Assert.That(MathOps.Add(2, 3), Is.EqualTo(5));
    }

    [TestCase(1, 1, 2)]
    [TestCase(-4, 4, 0)]
    [TestCase(int.MaxValue, 0, int.MaxValue)]
    public void Add_HandlesEdgeCases(int a, int b, int expected)
    {
        Assert.That(MathOps.Add(a, b), Is.EqualTo(expected));
    }

    [Test]
    public void Divide_ByZero_Throws()
    {
        Assert.Throws<DivideByZeroException>(() => MathOps.Divide(1, 0));
    }
}
```

A few notes on the attributes:

- `[Test]` marks a test method. It must be public, and it can return `void` or `Task` (for `async` tests).
- `[TestCase(...)]` turns one method into several tests, one per attribute, passing the values as arguments. Each case shows up separately in the test results. For data that doesn't fit in an attribute, use `[TestCaseSource]`.
- `[TestFixture]` marks the class that holds tests. It's optional when the class contains `[Test]` methods, but you need it to pass constructor arguments or run the same fixture with different type parameters.
- `[SetUp]` and `[TearDown]` methods run before and after each test. `[OneTimeSetUp]` and `[OneTimeTearDown]` run once per fixture.

NUnit creates one instance of a fixture class and reuses it for all of its tests by default, so don't rely on fields being reset between tests unless you reset them in `[SetUp]`.

## Assertions

The examples above use the constraint model: `Assert.That(actual, constraint)`. Constraints compose and produce clear failure messages:

```csharp
Assert.That(result, Is.EqualTo(5));
Assert.That(name, Is.Not.Null.And.Not.Empty);
Assert.That(items, Has.Count.EqualTo(3));
Assert.That(items, Does.Contain("apple"));
Assert.That(price, Is.EqualTo(9.99).Within(0.001));
```

If you've seen older NUnit code, you'll find "classic" asserts such as `Assert.AreEqual(5, result)`. NUnit 4.0 moved these into `ClassicAssert` in the `NUnit.Framework.Legacy` namespace, which broke a lot of existing test suites. NUnit 4.5 brought `Assert.AreEqual` and friends back using C# 14 extension members. `Assert.That` works in every version, so prefer it in new code.

To check several things in one test and see every failure rather than only the first, use a multiple-assert scope (NUnit 4.2 and later; older versions use `Assert.Multiple(() => { ... })`):

```csharp
using (Assert.EnterMultipleScope())
{
    Assert.That(order.Total, Is.EqualTo(42m));
    Assert.That(order.Status, Is.EqualTo(OrderStatus.Paid));
}
```

If you upgrade to NUnit 5, note that `Assert.ThrowsAsync`, `Assert.CatchAsync` and `Assert.DoesNotThrowAsync` now return a `Task` that must be awaited. An un-awaited call can let a failing test pass, and NUnit.Analyzers warns about it.

## Running tests

From the command line:

```bash
dotnet test
dotnet test --filter "FullyQualifiedName~MathOpsTests"
```

The filter runs only the tests whose fully qualified name contains `MathOpsTests`. You can also filter on `Name`, `Category` (set with `[Category("Slow")]`) and `Priority`.

In Visual Studio, open **Test > Test Explorer**, build the solution, and the tests appear grouped by project, namespace and class. You can run or debug all of them, a group, or a single test. Rider and VS Code (with the C# Dev Kit) have equivalent test panels.

## Further reading

- [NUnit documentation](https://docs.nunit.org/)
- [Constraint model reference](https://docs.nunit.org/articles/nunit/writing-tests/constraints/Constraints.html)
- [NUnit 5 release notes](https://docs.nunit.org/articles/nunit/release-notes/framework.html), including breaking changes
- [Unit testing C# with NUnit and .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-csharp-with-nunit) on Microsoft Learn
