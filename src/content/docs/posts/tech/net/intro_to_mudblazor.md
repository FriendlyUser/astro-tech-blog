---
tags: ['blazor', 'dotnet', 'csharp']
title: "Getting started with MudBlazor: Material Design components for Blazor"
description: "Add the MudBlazor component library to a Blazor app: install the package, register services and providers, and build an app bar with a toggleable drawer."
pubDate: Tues, 21 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/4067359065.png'
---

MudBlazor is an open-source (MIT-licensed) component library for Blazor based on Google's Material
Design. It gives you layout, navigation, form, data-grid, dialog and snackbar components written
in C# and Razor, so you can build a Blazor UI without writing your own CSS or JavaScript
components.

Blazor itself lets you write interactive web UIs in C#. Components either run in the browser on
WebAssembly, or on the server with UI updates sent to the browser over a SignalR connection
(Interactive Server). Since .NET 8, the **Blazor Web App** template lets you pick the render mode
per app or per component. MudBlazor works with both, but its components need an interactive render
mode; they don't respond to clicks under static server rendering.

The steps below were checked against MudBlazor 9.13.0 in a .NET 9 Blazor Web App with global
Interactive Server rendering. MudBlazor 9.x supports .NET 8 and later.

## Starting from a template

The quickest route is MudBlazor's own project templates, which are the Microsoft Blazor Web App
template with MudBlazor already wired up:

```bash
dotnet new install MudBlazor.Templates
dotnet new mudblazor --interactivity Server --name MyApplication --all-interactive
```

Run `dotnet new mudblazor --help` to see the other options (`WebAssembly` and `Auto`
interactivity). If you'd rather add MudBlazor to an existing project, do it by hand as follows.

## Adding MudBlazor to an existing app

Install the package:

```bash
dotnet add package MudBlazor
```

Add the namespace to `_Imports.razor` (in `Components/_Imports.razor` for a Blazor Web App):

```razor
@using MudBlazor
```

Register MudBlazor's services in `Program.cs`:

```csharp
using MudBlazor.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMudServices();
// ... AddRazorComponents() etc. from the template
```

Add the font and stylesheet to the `<head>`, and the MudBlazor script after the Blazor script at
the end of `<body>`. In a .NET 8+ Blazor Web App these go in `Components/App.razor`; older Blazor
Server apps used `Pages/_Host.cshtml` or `_Layout.cshtml`, and standalone WebAssembly apps use
`wwwroot/index.html`.

```razor
<head>
    ...
    <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
    <link href="@Assets["_content/MudBlazor/MudBlazor.min.css"]" rel="stylesheet" />
</head>
<body>
    ...
    <script src="_framework/blazor.web.js"></script>
    <script src="@Assets["_content/MudBlazor/MudBlazor.min.js"]"></script>
</body>
```

`@Assets[...]` (new in .NET 9) adds a content hash to the URL so browsers pick up new MudBlazor
files after an upgrade. It needs `app.MapStaticAssets()` in `Program.cs`, which new .NET 9
templates include. On .NET 8, or in `index.html`, use the plain paths
`_content/MudBlazor/MudBlazor.min.css` and `_content/MudBlazor/MudBlazor.min.js`.
The template's Bootstrap stylesheet isn't needed alongside MudBlazor and can be removed.

Finally, add the providers to `MainLayout.razor`. `MudThemeProvider` and `MudPopoverProvider` are
required (menus, selects and tooltips render through the popover provider);
`MudDialogProvider` and `MudSnackbarProvider` are only needed if you use dialogs or snackbars.

```razor
<MudThemeProvider />
<MudPopoverProvider />
<MudDialogProvider />
<MudSnackbarProvider />
```

The providers must render in the same interactive mode as the components that use them. With
global interactivity (a render mode on `<Routes />` in `App.razor`), `MainLayout.razor` is the
right place. With per-page interactivity the layout renders statically, so the providers have to
go on each interactive page instead. A "Missing `<MudPopoverProvider />`" error or components
that ignore clicks usually means this is set up wrong.

## Example: app bar with a drawer

Here is a complete `MainLayout.razor` with an app bar, a menu button that toggles a navigation
drawer, and the page content below:

```razor
@inherits LayoutComponentBase

<MudThemeProvider />
<MudPopoverProvider />
<MudDialogProvider />
<MudSnackbarProvider />

<MudLayout>
    <MudAppBar>
        <MudIconButton Icon="@Icons.Material.Filled.Menu" Color="Color.Inherit"
                       Edge="Edge.Start" OnClick="ToggleDrawer" />
        <MudText Typo="Typo.h6">My App</MudText>
        <MudSpacer />
    </MudAppBar>
    <MudDrawer @bind-Open="_drawerOpen">
        <MudNavMenu>
            <MudNavLink Href="/" Match="NavLinkMatch.All">Home</MudNavLink>
            <MudNavLink Href="/counter">Counter</MudNavLink>
        </MudNavMenu>
    </MudDrawer>
    <MudMainContent>
        @Body
    </MudMainContent>
</MudLayout>

@code {
    private bool _drawerOpen = true;

    private void ToggleDrawer() => _drawerOpen = !_drawerOpen;
}
```

`MudLayout`, `MudAppBar`, `MudDrawer` and `MudMainContent` work together: the main content is
offset so it isn't hidden under the app bar or the open drawer. `MudSpacer` fills the remaining
space, so anything you add after it (a theme toggle, a user menu) sits at the right-hand end of
the bar. If you replace the template's layout like this, delete its `MainLayout.razor.css` too.

A page that uses a button and a snackbar:

```razor
@page "/counter"
@inject ISnackbar Snackbar

<MudContainer Class="mt-4">
    <MudText Typo="Typo.h4">Counter</MudText>
    <MudText>Current count: @_count</MudText>
    <MudButton Variant="Variant.Filled" Color="Color.Primary" OnClick="Increment">
        Click me
    </MudButton>
</MudContainer>

@code {
    private int _count;

    private void Increment()
    {
        _count++;
        Snackbar.Add($"Count is now {_count}", Severity.Info);
    }
}
```

`ISnackbar` is registered by `AddMudServices()`, and the message appears through the
`MudSnackbarProvider` in the layout.

## Theming

`MudThemeProvider` takes a `Theme` parameter. Create a `MudTheme`, set its palette and typography,
and pass it in to change colours across every component; it also has an `IsDarkMode` parameter
for a dark palette. The customization docs linked below list the full set of options.

## Further reading

- [MudBlazor installation guide](https://mudblazor.com/getting-started/installation)
- [MudBlazor layouts](https://mudblazor.com/getting-started/layouts)
- [MudBlazor theming and customization](https://mudblazor.com/customization/overview)
- [Try MudBlazor in the browser](https://try.mudblazor.com/)
- [MudBlazor on GitHub](https://github.com/MudBlazor/MudBlazor)
- [Blazor render modes](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/render-modes)
