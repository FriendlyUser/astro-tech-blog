---
tags: ['googleNews', 'dotnet']
title: Scrapping in C#
description: Introduction to scrapping with dotnet.
pubDate: Tues, 21 November 2023
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/4067359065.png'
---

Web scraping is a technique used to extract data from websites. It can be done manually by a user or automatically by a program. In this post, we'll explore how to perform web scraping using C#.

First, let's understand the basics of web scraping. When we visit a website, our web browser sends a request to the server hosting the website. The server responds with the HTML, CSS, and JavaScript files that make up the website. Our web browser then renders the website based on these files.

Web scraping works in a similar way. Instead of a web browser, we use a program to send a request to the server and receive the response. We can then parse the HTML to extract the data we need.

In C#, we can use the `HttpClient` class to send HTTP requests and receive responses. Here's an example of how to send a GET request to a website and receive the response:

```csharp
using System.Net.Http;
using System.Threading.Tasks;

namespace WebScrapingExample
{
    public static async Task<string> GetWebsiteContentAsync(string url)
    {
        using (var client = new HttpClient())
        {
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
    }
}
```

In this example, we create an instance of the HttpClient class and use its GetAsync method to send a GET request to the specified URL. We then use the EnsureSuccessStatusCode method to ensure that the response was successful. Finally, we use the ReadAsStringAsync method to read the response content as a string.

Once we have the HTML content of the website, we can use an HTML parser to extract the data we need. There are several HTML parsers available for C#, such as HtmlAgilityPack and AngleSharp.

Here’s an example of how to use HtmlAgilityPack to extract the titles of the articles on the front page of a news website:

```csharp
using HtmlAgilityPack;

namespace WebScrapingExample
{
    public static List<string> GetArticleTitles(string html)
    {
        var doc = new HtmlDocument();
        doc.LoadHtml(html);

        var titles = new List<string>();
        foreach (var node in doc.DocumentNode.SelectNodes("//h2[@class='title']/a"))
        {
            titles.Add(node.InnerText);
        }

        return titles;
    }
}
```

In this example, we create an instance of the HtmlDocument class and use its LoadHtml method to load the HTML content. We then use the SelectNodes method to select the nodes that match the specified XPath expression. In this case, we’re selecting all a elements that are children of h2 elements with a class attribute of title. We then use the InnerText property to get the text content of each node and add it to a list.

That’s the basics of web scraping in C#! Of course, there’s a lot more to it, such as handling pagination, dealing with AJAX content, and respecting the website’s terms of service and robots.txt file. But this should give you a good starting point for your own web scraping projects.