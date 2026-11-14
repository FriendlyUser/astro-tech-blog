---
tags: ['googleNews', 'dotnet', 'csharp']
title: News alerts in C# with Google News RSS search feeds and Discord
description: A C# console app that polls Google News RSS search feeds for keywords, skips stories it has already seen, and posts new ones to a Discord webhook.
pubDate: Tues, 7 December 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/4067359065.png'
---

:::caution
The original version of this app used `HttpWebRequest` and the `Elasticsearch.Net` low-level client. `HttpWebRequest` is obsolete in .NET 6+ (warning `SYSLIB0014`), and `Elasticsearch.Net` is marked legacy on NuGet in favour of `Elastic.Clients.Elasticsearch`. The code below uses `HttpClient` for everything, including the Elasticsearch calls, so it doesn't depend on either.
:::

The goal: a feed of recent news on a handful of market-related keywords, pushed to a Discord channel, so there's no need to check a news site every day. Google News has an RSS search endpoint that does most of the work.

## Google News RSS search

Put your search terms in the `q` parameter:

```text
https://news.google.com/rss/search?q=technology
```

The response is an RSS 2.0 feed. Each `<item>` has a `title` (headline followed by " - Publisher"), a `link` to a Google News redirect URL, a `guid`, and a `pubDate` in RFC 822 format, such as `Fri, 13 Nov 2026 22:57:09 GMT`. You can subscribe to that URL in any feed reader, or fetch it from code as below.

Google doesn't document this endpoint as a public API, so the format could change without notice. Check Google's terms before republishing its content anywhere.

## How the app works

For each search term, the app:

1. Fetches the RSS feed.
2. Looks at the first five items and skips anything older than two days.
3. Checks Elasticsearch for a document with the item's `guid`. If one exists, the story has already been sent.
4. Otherwise, posts the title, date and link to a Discord webhook, then stores the `guid` in Elasticsearch.

Elasticsearch is overkill for "have I seen this ID before?", and SQLite or a text file would do the same job. I used it because I already had a hosted cluster. Using the `guid` as the document ID makes the check an exact lookup rather than a search.

The full original source is at <https://github.com/FriendlyUser/news-alert/blob/master/News.cs>. The repo also has a `checkPrices` stub for stock price alerts that never got past printing the ticker, so it's left out here.

## The code

This is a .NET 8+ console app (`dotnet new console`) with no extra packages. Set `DISCORD_WEBHOOK` to a Discord webhook URL and `ES_INSTANCE` to the Elasticsearch base URL.

```csharp
using System.Net.Http.Json;
using System.Xml;

var http = new HttpClient();

string? webhook = Environment.GetEnvironmentVariable("DISCORD_WEBHOOK");
string? esInstance = Environment.GetEnvironmentVariable("ES_INSTANCE");
if (webhook is null || esInstance is null)
{
    Console.WriteLine("Set DISCORD_WEBHOOK and ES_INSTANCE first.");
    return;
}

string[] searchItems = ["hydrogen", "analyticGPT", "natural gas", "recession", "Tech layoffs", "Bard AI"];

foreach (string searchText in searchItems)
{
    string url = $"https://news.google.com/rss/search?q={Uri.EscapeDataString(searchText)}";
    string xml;
    try
    {
        xml = await http.GetStringAsync(url);
    }
    catch (HttpRequestException e)
    {
        Console.WriteLine($"{searchText}: {e.Message}");
        continue;
    }

    var doc = new XmlDocument();
    doc.LoadXml(xml);
    XmlNodeList items = doc.GetElementsByTagName("item");

    for (int i = 0; i < Math.Min(5, items.Count); i++)
    {
        XmlNode item = items[i]!;
        string? title = item["title"]?.InnerText;
        string? link = item["link"]?.InnerText;
        string? guid = item["guid"]?.InnerText;
        string? pubDateText = item["pubDate"]?.InnerText;
        if (title is null || link is null || guid is null || pubDateText is null)
        {
            continue;
        }

        // DateTimeOffset keeps the GMT offset; DateTime.Parse would convert to local time
        DateTimeOffset pubDate = DateTimeOffset.Parse(pubDateText);
        if (DateTimeOffset.UtcNow - pubDate > TimeSpan.FromDays(2))
        {
            continue;
        }

        // GET returns 404 if the document (or the index) doesn't exist yet
        string docUrl = $"{esInstance.TrimEnd('/')}/post/_doc/{Uri.EscapeDataString(guid)}";
        using var existing = await http.GetAsync(docUrl);
        if (existing.IsSuccessStatusCode)
        {
            Console.WriteLine($"Already sent: {title}");
            continue;
        }

        string message = $"{title}\n{pubDateText}\n{link}";
        using var sent = await http.PostAsJsonAsync(webhook, new { content = message });
        sent.EnsureSuccessStatusCode();

        // PUT creates the "post" index on first use if auto-create is enabled
        using var indexed = await http.PutAsJsonAsync(docUrl, new { guid, title, link });
        indexed.EnsureSuccessStatusCode();
    }
}
```

If your cluster needs authentication, set `http.DefaultRequestHeaders.Authorization` (basic auth or an API key) rather than relying on credentials embedded in `ES_INSTANCE`.

## Gotchas

- The old version read `items[i]` for `i < 5` without checking how many items came back. Feeds for niche terms can return fewer than five, so the loop is now capped at `items.Count`.
- The old version parsed `pubDate` with `Convert.ToDateTime`, which returns local time, and compared it with `DateTime.UtcNow`. On a machine outside UTC the two-day window was off by the timezone offset.
- Discord webhooks are rate limited. A run that finds dozens of new stories at once can get `429` responses, so add a delay between posts if you widen the search list.
- Google News links are redirects, not the publisher's URL. If you need the real article URL, follow the redirect or use the `<source>` element for the publisher's site.

## Further reading

- [Discord webhook resource](https://discord.com/developers/docs/resources/webhook)
- [Elasticsearch index and get document APIs](https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-document)
- [`HttpClient` guidelines](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines)
