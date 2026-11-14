---
title: "Conscrap 2.0.0: scraping Yahoo Finance comments inside shadow roots with Selenium"
description: "What changed in conscrap 2.0.0: reading Yahoo Finance comments from shadow DOM with a JavaScript helper, the move to .NET 7, and publishing to NuGet from GitHub Actions."
alt: Explaining how conscrap project grabs comments from yahoo finance using selenium.
pubDate: Friday, 25 August 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["dotnet", "stonks", "selenium", "csharp"]
projects: ["conscrap"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/conscrap200.webp'
imgAlt: 'Conscrap'
---

:::caution[.NET 7 is out of support]
This release targeted .NET 7, which reached end of support in May 2024. .NET 8 and .NET 9 followed on November 10, 2026, so new work should target .NET 10 (LTS). The Yahoo Finance selectors below are from August 2023; Yahoo changes its comment markup often, so expect to update them.
:::

[Conscrap](https://github.com/dli-invest/conscrap) is my C# tool that uses Selenium to collect comments from Yahoo Finance stock pages. Version 2.0.0 fixes scraping after Yahoo moved the comments into a shadow DOM, moves the project to .NET 7, and adds automatic publishing to NuGet.

## Reading comments inside shadow roots

A shadow root is the root of a separate DOM tree attached to a host element. Its contents don't show up in `document.querySelectorAll` or in normal Selenium lookups on the page. From JavaScript you reach it through the host's `element.shadowRoot` property, which is only set when the shadow root was attached with `mode: "open"`; for closed shadow roots it returns `null`.

Selenium 4 can step into a shadow root directly. In Python, `WebElement.shadow_root` returns a search context you can query with CSS selectors:

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get("https://example.com")

host = driver.find_element(By.CSS_SELECTOR, "my-widget")  # the element that owns the shadow root
shadow_root = host.shadow_root
data = shadow_root.find_element(By.CSS_SELECTOR, "#data").text

driver.quit()
```

The C# equivalent is `host.GetShadowRoot()`, which returns an `ISearchContext`.

That works when you know which host element to start from. Instead of using the Selenium bindings in C#, I decided to use plain JavaScript to search every shadow root on the page and return the comment list as an HTML string.

The helper takes two arguments:

- `selector`: the CSS selector to search for.
- `el` (optional): the node to start from, `document.body` by default.

It finds every element under `el` that has a `shadowRoot`, calls itself on each of those shadow roots, then combines those results with `el.querySelectorAll(selector)` and flattens them into one array:

```csharp
public const string jsQuerySelectorAllShadows =
@"function querySelectorAllShadows(selector, el = document.body) {
    // recurse into every child shadow root
    const childShadows = Array.from(el.querySelectorAll('*'))
        .map(el => el.shadowRoot)
        .filter(Boolean);
    const childResults = childShadows.map(child => querySelectorAllShadows(selector, child));

    // fuse all results into a single flat array
    const result = Array.from(el.querySelectorAll(selector));
    return result.concat(childResults).flat();
}
";
```

The command sent to Selenium appends a call to the helper. `ul.spcv_messages-list` is the list that held every comment for the stock:

```csharp
string getCommentsCmd = Constants.jsQuerySelectorAllShadows +
    """const results = querySelectorAllShadows("ul.spcv_messages-list"); return results[0].outerHTML;""";
```

The `"""..."""` raw string literal is a C# 11 feature, which comes with .NET 7. It saves escaping the double quotes in the JavaScript. Running the string with `IJavaScriptExecutor.ExecuteScript` returns the list's HTML.

Because the helper walks every element on the page, it only sees open shadow roots and it isn't fast. Speed is the usual downside of Selenium-based scraping anyway.

## Dismissing the "Maybe later" popup

After switching to the iframe that contains the comments, Yahoo shows unauthenticated users a "Maybe later" popup. Conscrap clicks it if it's there:

```csharp
try
{
    IWebElement maybeLater = driver.FindElement(By.XPath("//button[contains(text(), 'Maybe later')]"));
    maybeLater.Click();
}
catch (NoSuchElementException)
{
    Console.WriteLine("No Maybe Later Button");
}
```

The rest of the scraping changes were small XPath adjustments for the new comment format.

## Migrating to .NET 7

Moving from .NET 6 to .NET 7 was simple for this project and I haven't hit any issues. The steps were:

1. Change `<TargetFramework>net6.0</TargetFramework>` to `net7.0` in each `.csproj`.
2. Check that each dependency supports .NET 7. Some libraries lag behind new releases, and you may need to wait for an update or swap them out.
3. Set `dotnet-version: 7.0.x` in `actions/setup-dotnet` in the CI workflows.

The same steps apply for moving to a supported version today; check Microsoft's breaking-changes list for each version you skip.

## Publishing to NuGet

This release added a GitHub Actions step that publishes the package to both nuget.org and GitHub Packages when a `release/*` branch is pushed. The version below packs into a known folder and pushes with `dotnet nuget push` for both feeds:

```yaml
- name: Publish NuGet
  if: startsWith(github.ref, 'refs/heads/release')
  run: |
    dotnet pack --configuration $BUILD_CONFIG --no-restore --output nupkgs
    dotnet nuget push "nupkgs/*.nupkg" --api-key "${{ secrets.NUGET_KEY }}" --source "https://api.nuget.org/v3/index.json" --skip-duplicate
    dotnet nuget add source --username dli-invest --password "${{ secrets.GITHUB_TOKEN }}" --store-password-in-clear-text --name github "https://nuget.pkg.github.com/dli-invest/index.json"
    dotnet nuget push "nupkgs/*.nupkg" --api-key "${{ secrets.GITHUB_TOKEN }}" --source "github" --skip-duplicate
```

The first version pushed `**\*.nupkg` unquoted. The workflow runs on `ubuntu-latest`, where bash treats that backslash as an escape rather than a path separator. Packing to `nupkgs/` and quoting the glob lets `dotnet nuget push` expand it itself. Pushing to GitHub Packages with `GITHUB_TOKEN` also needs `packages: write` in the job's `permissions` if the repository's default token is read-only.

## References

- [conscrap on GitHub](https://github.com/dli-invest/conscrap)
- [Selenium: finding elements, including in shadow DOM](https://www.selenium.dev/documentation/webdriver/elements/finders/)
- [.NET support policy](https://dotnet.microsoft.com/platform/support/policy/dotnet-core)
