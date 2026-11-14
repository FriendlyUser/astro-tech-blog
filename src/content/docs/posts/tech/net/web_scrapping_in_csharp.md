---
tags: ['googleNews', 'dotnet', 'csharp', 'web scraping']
title: Web scraping in C# with HttpClient and HtmlAgilityPack
description: Fetch a page with HttpClient and pull data out of the HTML with HtmlAgilityPack and XPath, with the null check and selector gotchas that trip people up.
pubDate: Tues, 21 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/4067359065.webp'
---

Web scraping means fetching a page's HTML from code and extracting the data you want from it. In C# that takes two pieces: `HttpClient` to download the page, and an HTML parser to query it. This post uses [HtmlAgilityPack](https://html-agility-pack.net/), which parses messy real-world HTML into a DOM you can query with XPath.

It only sees the HTML the server returns. If the content is rendered by JavaScript after page load, you'll need a headless browser such as Playwright, or the JSON API the page itself calls.

## Setup

```bash
dotnet new console -n WebScrapingExample
cd WebScrapingExample
dotnet add package HtmlAgilityPack
```

This was checked against HtmlAgilityPack 1.13.1.

## Fetching and parsing a page

`Program.cs`:

```csharp
using HtmlAgilityPack;

string html = await Scraper.GetWebsiteContentAsync("https://example.com/news");
foreach (string title in Scraper.GetArticleTitles(html))
{
    Console.WriteLine(title);
}

public static class Scraper
{
    // Reuse one HttpClient; creating one per request can exhaust sockets
    private static readonly HttpClient Client = CreateClient();

    private static HttpClient CreateClient()
    {
        var client = new HttpClient();
        // Some sites reject requests without a User-Agent
        client.DefaultRequestHeaders.UserAgent.ParseAdd("WebScrapingExample/1.0");
        return client;
    }

    public static async Task<string> GetWebsiteContentAsync(string url)
    {
        using HttpResponseMessage response = await Client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }

    public static List<string> GetArticleTitles(string html)
    {
        var doc = new HtmlDocument();
        doc.LoadHtml(html);

        // <a> elements inside <h2 class="title">
        HtmlNodeCollection? nodes = doc.DocumentNode.SelectNodes("//h2[@class='title']/a");

        // SelectNodes returns null, not an empty collection, when nothing matches
        if (nodes is null)
        {
            return [];
        }

        return nodes
            .Select(node => HtmlEntity.DeEntitize(node.InnerText).Trim())
            .ToList();
    }
}
```

`EnsureSuccessStatusCode` throws `HttpRequestException` on a 4xx or 5xx response, so you don't end up parsing an error page. `InnerText` can return text with HTML entities still encoded (`&amp;`, `&#39;`), so `HtmlEntity.DeEntitize` decodes them.

The URL and XPath are placeholders: open the target page in your browser's dev tools, find the elements you want, and write the XPath to match.

## XPath gotchas

- `[@class='title']` only matches when the class attribute is exactly `title`. An element with `class="title featured"` won't match. Use `[contains(concat(' ', normalize-space(@class), ' '), ' title ')]` to match one class among several.
- `SelectSingleNode` returns `null` when nothing matches, the same as `SelectNodes`. Check before dereferencing.
- Browser dev tools show the DOM *after* JavaScript has run. If your XPath works in the browser but not in code, compare it with the raw HTML (view source).

## Alternatives

- [AngleSharp](https://anglesharp.github.io/) parses HTML following the HTML5 spec and lets you query with CSS selectors (`QuerySelectorAll("h2.title > a")`). That's often easier to write than XPath.
- HtmlAgilityPack's `HtmlWeb.Load(url)` downloads and parses in one call, but it's synchronous. `HttpClient` gives you async, timeouts and headers.

## Before you scrape

Check the site's terms of service and `robots.txt`, keep request rates low, and cache pages while you develop your selectors so you aren't fetching the same page over and over. Pagination usually means finding the "next" link with another XPath and looping until it disappears.
