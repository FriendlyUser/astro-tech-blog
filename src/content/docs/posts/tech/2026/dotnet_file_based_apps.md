---
title: "Single-file C# apps with dotnet run app.cs"
description: ".NET 10 runs a lone .cs file with no project: dotnet run app.cs, #:package, #:sdk and #:property directives, shebang scripts on Unix, and converting to a project."
tags: ["dotnet", "C#", "Scripting", "CLI"]
pubDate: "2026-08-22T16:00:00.000Z"
imgSrc: "/imgs/2026/dotnet_file_based_apps.webp"
imgAlt: "An app.cs file with #: directive lines above a terminal running dotnet run app.cs"
---

Since .NET 10, the SDK can build and run a single `.cs` file with no `.csproj`: `dotnet run app.cs`. Microsoft calls these **file-based apps**. The file holds top-level statements, and a few `#:` directives at the top replace what the project file used to say: NuGet packages, the SDK, and MSBuild properties. That makes C# workable for the small scripts and one-off tools you might otherwise write in Python or PowerShell, and when a script grows up, one command turns it into a normal project.

Everything here needs the .NET 10 SDK (10.0.100 or later). The C# in the examples is ordinary top-level-statement code, and I checked that it compiles and runs as a regular project. The `#:` directives and `dotnet run file.cs` behaviour are described from the SDK documentation.

## Hello, file

```csharp
// hello.cs
Console.WriteLine($"Hello from {System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}");
```

```bash
dotnet run hello.cs
```

There are three equivalent ways to run it:

```bash
dotnet run hello.cs
dotnet run --file hello.cs
dotnet hello.cs
```

The first run takes a few seconds, because the SDK generates a project in memory, restores and builds it. Later runs reuse the cached build as long as the file, its directives and the SDK version haven't changed, so they start much faster. The build output goes to a folder under your temp directory (`<temp>/dotnet/runfile/...`), not next to the script.

The generated project is the same one `dotnet new console` creates, so implicit usings and nullable reference types are on. `Console`, LINQ, `File` and `HttpClient` work without `using` lines.

Arguments for your app go after `--`:

```bash
dotnet run hello.cs -- --verbose input.txt
```

Inside the file they arrive in `args`, as in any top-level program.

## A useful script with a NuGet package

Here is a script that lists the largest folders under a directory, using Spectre.Console for the table:

```csharp
// dirsize.cs
#:package Spectre.Console@0.57.2

using Spectre.Console;

var root = args.Length > 0 ? args[0] : Directory.GetCurrentDirectory();
var top = args.Length > 1 ? int.Parse(args[1]) : 10;

var sizes = new DirectoryInfo(root)
    .EnumerateDirectories()
    .Select(dir => (dir.Name, Bytes: SizeOf(dir)))
    .OrderByDescending(x => x.Bytes)
    .Take(top)
    .ToList();

var table = new Table().AddColumn("Folder").AddColumn(new TableColumn("Size").RightAligned());
foreach (var (name, bytes) in sizes)
    table.AddRow(Markup.Escape(name), $"{bytes / 1024.0 / 1024.0:N1} MB");

AnsiConsole.MarkupLine($"[bold]Largest folders in[/] {Markup.Escape(root)}");
AnsiConsole.Write(table);

static long SizeOf(DirectoryInfo dir)
{
    var options = new EnumerationOptions { RecurseSubdirectories = true, IgnoreInaccessible = true };
    return dir.EnumerateFiles("*", options).Sum(f => f.Length);
}
```

```bash
dotnet run dirsize.cs -- ~/src 5
```

The output is a box-drawn table of folder names and sizes, largest first. Note `Markup.Escape`: Spectre.Console treats `[` and `]` as markup, so a folder name with brackets would otherwise break the output.

## The directives

Directives start with `#:` and must come before the first line of C# code (comments and blank lines are fine). The C# compiler ignores them; the SDK reads them to build the project.

### #:package

```csharp
#:package Spectre.Console@0.57.2
#:package Humanizer.Core@3.0.10
```

`Name@Version` adds a `PackageReference`. Always pin a version: leaving it out only works when a `Directory.Packages.props` (central package management) above the file supplies one. `@*` takes the newest version, which is convenient for experiments and a bad idea for anything you'll run again next month.

### #:sdk

```csharp
#:sdk Microsoft.NET.Sdk.Web
```

This picks the MSBuild SDK, `Microsoft.NET.Sdk` by default. With the Web SDK, a single file can be a complete web API, and the ASP.NET Core implicit usings come along:

```csharp
// api.cs
#:sdk Microsoft.NET.Sdk.Web

var app = WebApplication.Create(args);

app.MapGet("/", () => new { message = "hello", at = DateTimeOffset.UtcNow });
app.MapGet("/add/{a:int}/{b:int}", (int a, int b) => a + b);

app.Run();
```

`dotnet run api.cs` starts Kestrel, and `curl http://localhost:5000/add/2/3` returns `5`. That's handy for a throwaway mock of a service you depend on. The Web SDK also picks up `appsettings.json` files next to the script.

### #:property

```csharp
#:property LangVersion=preview
#:property PublishAot=false
#:property InvariantGlobalization=true
```

`Name=Value` sets any MSBuild property, the same as a `<PropertyGroup>` entry. `TargetFramework` works too, if you need to target something other than the SDK's default.

### #:project

```csharp
#:project ../Shared/Shared.csproj
```

References a regular project, so a script can call code from your main solution, for example to run a one-off data fix with the real domain types.

## Shebang scripts on Linux and macOS

On Unix-like systems a file-based app can be an executable script. Add a shebang as the very first line:

```csharp
#!/usr/bin/env dotnet
#:package Spectre.Console@0.57.2

using Spectre.Console;

AnsiConsole.MarkupLine($"[green]Hello[/] from {Environment.MachineName}");
```

```bash
chmod +x greet.cs
./greet.cs
```

The kernel runs `dotnet ./greet.cs`, which is the shorthand form above. Three practical notes:

- The file must use **LF line endings and no BOM**. With CRLF, the system looks for an interpreter literally called `dotnet\r`, and the error message is unhelpful. Add `*.cs text eol=lf` for script folders to `.gitattributes` if anyone edits them on Windows.
- Arguments are passed through, but the `dotnet` host may interpret ones that look like its own options (`--help`, for example). The SDK docs show an `env -S dotnet --` variant for systems whose `env` supports `-S`.
- The script keeps its `.cs` extension, so editors still treat it as C#.

## Publishing

`dotnet publish dirsize.cs` produces a standalone executable in an `artifacts` folder next to the file. File-based apps have **Native AOT enabled by default**, so the result is a single native binary that starts quickly and doesn't need the .NET runtime installed. AOT has requirements: you need the platform's native toolchain, and code that relies on unrestricted reflection may fail or produce warnings. If a package isn't AOT-friendly, turn it off:

```csharp
#:property PublishAot=false
```

## Converting to a project

When a script grows past one file, or needs tests, convert it:

```bash
dotnet project convert dirsize.cs
```

This creates a folder named after the app next to the script, containing a `.csproj` built from the directives and a copy of the `.cs` file without them. The `#:package` line becomes a `PackageReference`, `#:property` lines become properties, and so on. The original file is left alone, so check the result builds and then delete the original yourself.

Converting is one-way and cheap, which is the right mental model for file-based apps: start as a file, and the moment it needs a second file, it is a project.

## Gotchas

- **Don't put scripts inside a project folder.** If the current directory contains a `.csproj`, `dotnet run file.cs` runs *that project* and passes `file.cs` to it as an argument, for backwards compatibility. Use `dotnet run --file file.cs` to force file mode, or better, keep scripts in their own folder.
- **Parent folder build files apply.** `Directory.Build.props`, `Directory.Packages.props`, `global.json` and `nuget.config` in any parent directory affect the script. A repository-wide `TreatWarningsAsErrors` or an old SDK pinned in `global.json` can break a script that works elsewhere.
- **The build cache can lag behind changes.** It is keyed on the file content, directives and SDK version. Changing a `Directory.Build.props` may not trigger a rebuild; `dotnet clean file.cs` followed by `dotnet build file.cs` forces one.
- **One file in 10.0.100.** In the first .NET 10 SDK, a file-based app is exactly one `.cs` file; other `.cs` files beside it are not compiled in. Later SDK feature bands document an `#:include` directive for pulling in more files. Check your SDK version before relying on it.
- **Running the same script in parallel** can fail with file-lock errors, because concurrent runs fight over the same build output. Build once with `dotnet build file.cs`, then run the copies with `dotnet run file.cs --no-build`.

## Further reading

- [File-based apps (Microsoft Learn)](https://learn.microsoft.com/dotnet/core/sdk/file-based-apps)
- [dotnet run command reference](https://learn.microsoft.com/dotnet/core/tools/dotnet-run)
- [Design notes for dotnet run file.cs (dotnet/sdk)](https://github.com/dotnet/sdk/blob/main/documentation/general/dotnet-run-file.md)
