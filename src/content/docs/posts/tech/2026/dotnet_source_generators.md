---
title: "Writing an incremental source generator in C#"
description: "Build a C# incremental source generator with IIncrementalGenerator and ForAttributeWithMetadataName: project setup, emitting code, referencing it, and testing its output."
tags: ["C#", "dotnet", "Source Generators", "Roslyn", "Testing"]
pubDate: "2026-04-08T16:00:00.000Z"
imgSrc: "/imgs/2026/dotnet_source_generators.webp"
imgAlt: "An incremental pipeline diagram: syntax filter, transform to model, equality check, then emitted .g.cs files"
---

A source generator is a compiler plug-in that reads your code during the build and adds new C# files to the compilation. It replaces work you would otherwise do with reflection at runtime or with hand-written boilerplate: `System.Text.Json`'s serialization contexts, `[LoggerMessage]` and `[GeneratedRegex]` are all generators. Because the output is ordinary C#, it is fast, trimming-safe and works with Native AOT.

This post builds a small generator from scratch: mark an enum with `[EnumExtensions]` and get a `ToStringFast()` method that uses a `switch` instead of reflection. It covers the project setup, the incremental pipeline, how to reference the generator, and how to test both its output and its caching. The code was built with the .NET 9 SDK and Roslyn 4.12, and it loads in the .NET 10 SDK too.

## The project setup

Generators run inside the compiler, which loads them in Visual Studio, in `dotnet build` and in other hosts. That is why a generator project must target **netstandard2.0**, whatever your app targets.

```xml
<!-- EnumGen/EnumGen.csproj -->
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsRoslynComponent>true</IsRoslynComponent>
    <EnforceExtendedAnalyzerRules>true</EnforceExtendedAnalyzerRules>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="4.12.0" PrivateAssets="all" />
    <PackageReference Include="Microsoft.CodeAnalysis.Analyzers" Version="3.11.0" PrivateAssets="all" />
  </ItemGroup>

</Project>
```

What each line is for:

- **`LangVersion latest`** lets you write modern C# (raw string literals, records, file-scoped namespaces) even though the target is netstandard2.0.
- **`IsRoslynComponent`** lets Visual Studio debug the generator.
- **`EnforceExtendedAnalyzerRules`** turns on analyzer-author warnings, such as using banned APIs like `File` I/O inside a generator.
- **The `Microsoft.CodeAnalysis.CSharp` version is a minimum compiler version.** A generator built against Roslyn 4.12 loads in compilers from 4.12 up. Build against the newest package and users on an older SDK get a warning that the generator could not be loaded, and no generated code. Pick the oldest version that has the APIs you use.
- **`PrivateAssets="all"`** keeps the Roslyn packages from flowing to consumers; the compiler already has them.

One netstandard2.0 surprise: records and `init` setters need `System.Runtime.CompilerServices.IsExternalInit`, which doesn't exist there. The build fails with `CS0518: Predefined type 'System.Runtime.CompilerServices.IsExternalInit' is not defined or imported` until you add the type yourself:

```csharp
// EnumGen/IsExternalInit.cs
// netstandard2.0 lacks this type; records and init-only setters need it.
namespace System.Runtime.CompilerServices
{
    internal static class IsExternalInit { }
}
```

## Why "incremental" matters

The original `ISourceGenerator` API ran your whole generator on every compilation, and in an IDE that means every keystroke. `IIncrementalGenerator` replaces it. Instead of one `Execute` method, you describe a pipeline of steps, and Roslyn caches the output of each step. When you type in an unrelated file, each step compares its new output with the cached one. If they are equal, the steps after it don't run.

That caching only works if the values flowing through the pipeline have **value equality**. Two rules follow:

1. Don't pass `SyntaxNode`, `ISymbol`, `SemanticModel` or `Compilation` down the pipeline. They are new objects on every compilation, so they never compare equal, and they keep whole compilations alive in memory.
2. Convert what you need into a small record of strings, numbers and equatable collections as early as possible.

`ImmutableArray<T>` and `T[]` compare by reference, so a record holding one is never equal to the previous run's record. A tiny wrapper with element-wise equality fixes that:

```csharp
// EnumGen/EquatableArray.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace EnumGen;

// ImmutableArray<T> compares by reference; the pipeline needs element-wise equality.
internal readonly struct EquatableArray<T>(T[] items) : IEquatable<EquatableArray<T>>, IEnumerable<T>
    where T : IEquatable<T>
{
    private readonly T[] _items = items ?? [];

    public bool Equals(EquatableArray<T> other) => _items.AsSpan().SequenceEqual(other._items.AsSpan());
    public override bool Equals(object? obj) => obj is EquatableArray<T> other && Equals(other);

    public override int GetHashCode()
    {
        var hash = 17;
        foreach (var item in _items)
            hash = hash * 31 + item.GetHashCode();
        return hash;
    }

    public IEnumerator<T> GetEnumerator() => ((IEnumerable<T>)_items).GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => _items.GetEnumerator();
}
```

And the model, which holds everything the code emitter needs:

```csharp
// EnumGen/EnumModel.cs
namespace EnumGen;

internal sealed record EnumModel(
    string? Namespace,
    string Name,
    string FullyQualifiedName,
    string Accessibility,
    EquatableArray<string> Members);
```

## The generator

```csharp
// EnumGen/EnumExtensionsGenerator.cs
using System.Linq;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace EnumGen;

[Generator]
public sealed class EnumExtensionsGenerator : IIncrementalGenerator
{
    private const string AttributeName = "EnumGen.EnumExtensionsAttribute";

    private const string AttributeSource = """
        // <auto-generated/>
        namespace EnumGen
        {
            [System.AttributeUsage(System.AttributeTargets.Enum)]
            internal sealed class EnumExtensionsAttribute : System.Attribute
            {
            }
        }
        """;

    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        // 1. The marker attribute, added to every compilation that references the generator.
        context.RegisterPostInitializationOutput(ctx =>
            ctx.AddSource("EnumExtensionsAttribute.g.cs", SourceText.From(AttributeSource, Encoding.UTF8)));

        // 2. Find enums marked with the attribute and turn each into a plain model.
        IncrementalValuesProvider<EnumModel> enums = context.SyntaxProvider
            .ForAttributeWithMetadataName(
                AttributeName,
                predicate: static (node, _) => node is EnumDeclarationSyntax,
                transform: static (ctx, _) => ToModel((INamedTypeSymbol)ctx.TargetSymbol))
            .WithTrackingName("EnumModels");

        // 3. Emit one file per enum.
        context.RegisterSourceOutput(enums, static (spc, model) =>
            spc.AddSource($"{model.FullyQualifiedName}.EnumExtensions.g.cs",
                SourceText.From(Emit(model), Encoding.UTF8)));
    }

    private static EnumModel ToModel(INamedTypeSymbol symbol)
    {
        var members = symbol.GetMembers()
            .OfType<IFieldSymbol>()
            .Where(f => f.ConstantValue is not null)
            .GroupBy(f => f.ConstantValue)       // aliases (A = 1, B = 1) would be duplicate switch arms
            .Select(g => g.First().Name)
            .ToArray();

        return new EnumModel(
            Namespace: symbol.ContainingNamespace.IsGlobalNamespace ? null : symbol.ContainingNamespace.ToDisplayString(),
            Name: symbol.Name,
            FullyQualifiedName: symbol.ToDisplayString(),
            Accessibility: symbol.DeclaredAccessibility == Accessibility.Public ? "public" : "internal",
            Members: new EquatableArray<string>(members));
    }

    private static string Emit(EnumModel model)
    {
        var type = "global::" + model.FullyQualifiedName;
        var sb = new StringBuilder();
        sb.AppendLine("// <auto-generated/>");
        sb.AppendLine("#nullable enable");
        if (model.Namespace is not null)
            sb.AppendLine($"namespace {model.Namespace};").AppendLine();

        sb.AppendLine($"{model.Accessibility} static partial class {model.Name}Extensions");
        sb.AppendLine("{");
        sb.AppendLine($"    public static string ToStringFast(this {type} value) => value switch");
        sb.AppendLine("    {");
        foreach (var member in model.Members)
            sb.AppendLine($"        {type}.{member} => nameof({type}.{member}),");
        sb.AppendLine("        _ => value.ToString(),");
        sb.AppendLine("    };");
        sb.AppendLine();
        sb.AppendLine($"    public static bool IsDefinedFast({type} value) => value switch");
        sb.AppendLine("    {");
        foreach (var member in model.Members)
            sb.AppendLine($"        {type}.{member} => true,");
        sb.AppendLine("        _ => false,");
        sb.AppendLine("    };");
        sb.AppendLine("}");
        return sb.ToString();
    }
}
```

The three registrations are the whole pipeline:

1. **`RegisterPostInitializationOutput`** adds source that doesn't depend on user code. It is the usual place for the marker attribute, so users don't need a separate package just to get `[EnumExtensions]`.
2. **`ForAttributeWithMetadataName`** is the fast path for "find declarations with this attribute". Roslyn first matches the attribute's simple name syntactically (aliases included), so declarations that can't carry the attribute never reach your code, and the semantic work happens only for real candidates. The `predicate` is a cheap syntax check; `transform` gets the semantic `TargetSymbol` and is where you build the model. Use the full metadata name (namespace plus type name, `Attribute` suffix included). Prefer it to `CreateSyntaxProvider` whenever an attribute is the trigger.
3. **`RegisterSourceOutput`** turns each model into a file. It only runs for models that changed. `WithTrackingName` names the step so tests can inspect it.

Emitting with a `StringBuilder` is the normal approach. Use `global::`-qualified names in generated code, so a user type called `System` or `OrderStatus` in another namespace can't break it.

## Referencing the generator

A generator isn't a normal library reference. In the consuming project, reference it as an analyzer:

```xml
<!-- EnumGen.Sample/EnumGen.Sample.csproj -->
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <EmitCompilerGeneratedFiles>true</EmitCompilerGeneratedFiles>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\EnumGen\EnumGen.csproj"
                      OutputItemType="Analyzer"
                      ReferenceOutputAssembly="false" />
  </ItemGroup>

</Project>
```

`OutputItemType="Analyzer"` hands the DLL to the compiler. `ReferenceOutputAssembly="false"` keeps your app from referencing a netstandard2.0 assembly full of Roslyn types it doesn't need at runtime. Change `net9.0` to `net10.0` if that is what you target.

Then use it:

```csharp
// EnumGen.Sample/Program.cs
using EnumGen;
using Shop;

var status = OrderStatus.Shipped;
Console.WriteLine(status.ToStringFast());
Console.WriteLine(OrderStatusExtensions.IsDefinedFast((OrderStatus)42));

namespace Shop
{
    [EnumExtensions]
    public enum OrderStatus
    {
        Pending,
        Paid,
        Shipped,
        Cancelled = 10,
    }
}
```

`dotnet run --project EnumGen.Sample` prints `Shipped` and `False`.

`EmitCompilerGeneratedFiles` writes the generated files to disk so you can read them. They land in `obj/Debug/net9.0/generated/EnumGen/EnumGen.EnumExtensionsGenerator/`:

```csharp
// <auto-generated/>
#nullable enable
namespace Shop;

public static partial class OrderStatusExtensions
{
    public static string ToStringFast(this global::Shop.OrderStatus value) => value switch
    {
        global::Shop.OrderStatus.Pending => nameof(global::Shop.OrderStatus.Pending),
        global::Shop.OrderStatus.Paid => nameof(global::Shop.OrderStatus.Paid),
        global::Shop.OrderStatus.Shipped => nameof(global::Shop.OrderStatus.Shipped),
        global::Shop.OrderStatus.Cancelled => nameof(global::Shop.OrderStatus.Cancelled),
        _ => value.ToString(),
    };

    public static bool IsDefinedFast(global::Shop.OrderStatus value) => value switch
    {
        global::Shop.OrderStatus.Pending => true,
        global::Shop.OrderStatus.Paid => true,
        global::Shop.OrderStatus.Shipped => true,
        global::Shop.OrderStatus.Cancelled => true,
        _ => false,
    };
}
```

In Visual Studio you can also see the files under Dependencies > Analyzers without setting the property.

To ship the generator as a NuGet package, the DLL goes in `analyzers/dotnet/cs/` inside the package instead of `lib/`. Add `<IncludeBuildOutput>false</IncludeBuildOutput>` and a `<None Include="$(OutputPath)\$(AssemblyName).dll" Pack="true" PackagePath="analyzers/dotnet/cs" Visible="false" />` item to the generator project.

## Testing the generator

You don't need a consuming project to test a generator. Create a `CSharpCompilation` in memory, run it through `CSharpGeneratorDriver`, and inspect the result. This test project uses xUnit v3:

```xml
<!-- EnumGen.Tests/EnumGen.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="4.12.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.3.0" />
    <PackageReference Include="xunit.v3" Version="3.2.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5" />
  </ItemGroup>

  <ItemGroup>
    <!-- A normal reference here: the tests call the generator class directly. -->
    <ProjectReference Include="..\EnumGen\EnumGen.csproj" />
  </ItemGroup>

</Project>
```

```csharp
// EnumGen.Tests/GeneratorTests.cs
using EnumGen;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Xunit;

public class GeneratorTests
{
    private const string Source = """
        using EnumGen;
        namespace Shop;

        [EnumExtensions]
        public enum OrderStatus { Pending, Paid, Shipped, Cancelled = 10, Canceled = 10 }
        """;

    private static (GeneratorDriver Driver, Compilation Output, CSharpCompilation Input) Run(string source)
    {
        var input = CSharpCompilation.Create(
            "Tests",
            [CSharpSyntaxTree.ParseText(source)],
            Basic.References(),
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

        GeneratorDriver driver = CSharpGeneratorDriver.Create(
            [new EnumExtensionsGenerator().AsSourceGenerator()],
            driverOptions: new GeneratorDriverOptions(default, trackIncrementalGeneratorSteps: true));

        driver = driver.RunGeneratorsAndUpdateCompilation(input, out var output, out _);
        return (driver, output, input);
    }

    [Fact]
    public void Generates_extensions_that_compile()
    {
        var (driver, output, _) = Run(Source);

        var result = driver.GetRunResult();
        Assert.Empty(result.Diagnostics);
        Assert.Empty(output.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        var generated = result.GeneratedTrees.Single(t => t.FilePath.EndsWith("Shop.OrderStatus.EnumExtensions.g.cs"));
        var text = generated.GetText().ToString();
        Assert.Contains("public static string ToStringFast(this global::Shop.OrderStatus value)", text);
        Assert.Contains("global::Shop.OrderStatus.Cancelled => true", text);
        Assert.DoesNotContain("Canceled", text); // alias of Cancelled is skipped
    }

    [Fact]
    public void Unrelated_edit_does_not_rerun_the_transform()
    {
        var (driver, _, input) = Run(Source);

        // Add a new file that has nothing to do with the enum.
        var edited = input.AddSyntaxTrees(CSharpSyntaxTree.ParseText("class Unrelated { }"));
        driver = driver.RunGenerators(edited);

        var step = driver.GetRunResult().Results[0].TrackedSteps["EnumModels"].Single();
        // Cached: the step didn't run. Unchanged: it ran and produced an equal model.
        // Either way RegisterSourceOutput is skipped. Modified would mean the model isn't equatable.
        Assert.All(step.Outputs, o => Assert.True(
            o.Reason is IncrementalStepRunReason.Cached or IncrementalStepRunReason.Unchanged,
            $"Reason was {o.Reason}"));
    }
}

internal static class Basic
{
    // Reference the same framework assemblies the test itself runs on.
    public static IEnumerable<MetadataReference> References() =>
        ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!)
            .Split(Path.PathSeparator)
            .Select(path => MetadataReference.CreateFromFile(path));
}
```

`dotnet test` passes both tests. The first test checks three things: the generator reported no diagnostics, the *combined* compilation has no errors (generated code that doesn't compile is the most common generator bug), and the output has the expected shape. The test enum includes an alias (`Canceled = 10`). Without the `GroupBy` in `ToModel`, the generated `switch` would have two arms for the same value and fail with a "pattern has already been handled" error.

The second test is the one people skip, and it catches the most expensive mistake. To check it does its job, I changed `EquatableArray<string>` in the model to a plain `string[]`. The test then failed with `Reason was Modified`, meaning every keystroke in the IDE would have regenerated every enum's file. With `EquatableArray` it passes.

For larger generators, two packages save effort. **Verify.SourceGenerators** snapshots the generated files and diffs them on change. **Microsoft.CodeAnalysis.CSharp.SourceGenerators.Testing** gives you the test framework that the Roslyn analyzer packages use.

## Gotchas

- **Generators can only add code.** They can't change or remove existing code. The usual pattern is a `partial` type or method that the user declares and the generator completes.
- **Generators can't see each other's output.** If your generator needs code that another generator produces (Razor components, other marker attributes), it won't find it.
- **The marker attribute is `internal` in every project.** If project A references the generator and has `InternalsVisibleTo` for project B, which also references it, B sees two `EnumExtensionsAttribute` types and gets warning CS0436. Shipping the attribute in a small separate assembly avoids this.
- **No I/O, no network.** A generator must be deterministic and fast. To read files, have users list them as `AdditionalFiles` and use `context.AdditionalTextsProvider`.
- **Restart the IDE after changing a generator.** Visual Studio caches loaded analyzers, so edits to the generator often don't show up until it reloads. `dotnet build` from the command line always picks up the new version.
- **Nested types.** This example doesn't handle enums declared inside a class. A `private` nested enum can't be used from a top-level extension class, and two nested enums with the same name in different classes would both produce `StatusExtensions` in the same namespace. Report a diagnostic for cases you don't support instead of generating broken code.

## Further reading

- [Incremental generators design document](https://github.com/dotnet/roslyn/blob/main/docs/features/incremental-generators.md)
- [Incremental generators cookbook](https://github.com/dotnet/roslyn/blob/main/docs/features/incremental-generators.cookbook.md)
- [Source generators overview](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview)
