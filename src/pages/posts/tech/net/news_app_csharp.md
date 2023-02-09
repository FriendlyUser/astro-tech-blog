---
tags: ['googleNews', 'C#']
title: Searching for news with google news rss feeds
description: Here we'll look at how to use google news rss feeds to create custom news rss feeds.
pubDate: Tues, 7 December 2023
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/4067359065.png'
---
Google News is a news aggregator and personalized news service developed by Google. It was launched in 2002 and has since become one of the largest news aggregators on the web. The service collects news articles from thousands of sources, including national and international news organizations, as well as local and regional publishers, and presents them in a format that makes it easy to quickly find and read the news that interests you. Google News uses algorithms to analyze and rank news articles, ensuring that the most relevant and up-to-date articles are displayed first. The service is free and can be accessed through a web browser or mobile app.


You can use the Google News RSS (Really Simple Syndication) feed to find news articles based on a custom search query. The basic format for using the Google News RSS feed is as follows:

<https://news.google.com/rss/search?q=SEARCH_QUERY>

Replace "SEARCH\_QUERY" with the keyword or phrase you want to search for, and include it in the URL. For example, if you want to find news articles about technology, you can use the following URL:

<https://news.google.com/rss/search?q=technology>

You can use this URL to subscribe to the RSS feed using a news reader or aggregator, or you can access the feed directly in your web browser to see a list of news articles related to your search query.

Note that the Google News RSS feed is subject to change and may not be available in all countries. Also, be aware that the terms of service for Google News state that you may not use the service to scrape or display its content on another website or application without permission.


For the full source code please view

https://github.com/FriendlyUser/news-alert/blob/master/News.cs


```csharp 
 using System;
//Request library
using System.Net;
using System.IO;
using System.Web;
using System.Xml;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Collections.Generic;
using System.Threading.Tasks;
using Elasticsearch.Net;
using System.Net.Http;
namespace news_alert
{
    public class News
    {
        public static readonly HttpClient client = new HttpClient();
    
        static public void SendItemToDiscord(XmlNode item) {
            // set discord webhook as private env
            string webhook = Environment.GetEnvironmentVariable("DISCORD_WEBHOOK");
            string esInstance = Environment.GetEnvironmentVariable("ES_INSTANCE");
            if (webhook == null) {
                Console.WriteLine("GET A DISCORD WEBHOOK");
                return;
            }
            var request = (HttpWebRequest)WebRequest.Create(webhook);
            request.ContentType = "application/json";
            request.Method = "POST";
            DateTime pubDate = Convert.ToDateTime(item["pubDate"].InnerText);
            string postLink = item["link"].InnerText;
            string discordTemplate = "{0} \n {1} \n {2} ";
            string discordMessage = string.Format(discordTemplate, item["title"].InnerText,
                item["pubDate"].InnerText, postLink);
            // write message of data sent to discord
            var w = new WebhookData() { content = discordMessage };
            using (var streamWriter = new StreamWriter(request.GetRequestStream()))
            {
                streamWriter.Write(JsonSerializer.Serialize<WebhookData>(w));
            }
            var httpResponse = (HttpWebResponse)request.GetResponse();
            using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
            {
                var result = streamReader.ReadToEnd();
            }
            // send data to es instance
            var settings = new ConnectionConfiguration(new Uri(esInstance))
                .RequestTimeout(TimeSpan.FromMinutes(2));
            var lowlevelClient = new ElasticLowLevelClient(settings);
            var post = new Post
            {
                guid = item["guid"].InnerText
            };
            var asyncIndexResponse = lowlevelClient.Index<StringResponse>("post", PostData.Serializable(post)); 
            string responseString = asyncIndexResponse.Body;
            Console.WriteLine(responseString);
        }

        static async Task Main(string[] args)
        {
            await checkNews();
            await Task.Run(() => checkPrices());
        }
        static async public Task checkPrices() {
            string stockUrl = Environment.GetEnvironmentVariable("STOCK_URL");
            if (stockUrl == null) {
                Console.WriteLine("GET A Stock URL WEBHOOK");
                return;
            }
            List<StockData> stocks = new List<StockData>();
            stocks.Add(new StockData() {ticker="NEXCF", targetPrice=1.60});
            foreach (StockData stock in stocks)
            {
                Console.WriteLine(stock.ticker);
                // query api
            }
            // either return a completed Task, or await for it (there is a difference!
            await Task.CompletedTask;
        }
        static async public Task checkNews() {
            var searchItems = new List<string> { "hydrogen",
                "analyticGPT", "natural gas", "recession",
                "Tech layoffs", "Bard AI"
            };
            foreach (string searchText in searchItems)
            {
                // line of items of cli list
                string xml = await FetchData(searchText);
                XmlDocument doc = new XmlDocument();
                doc.LoadXml(xml);
                // only print the first few elements
                XmlNodeList items = doc.GetElementsByTagName("item");
                DateTime utcDate = DateTime.UtcNow;
                for (int i=0; i < 5; i++)
                {   string pubDateStr = "";
                    try {
                        pubDateStr = items[i]["pubDate"].InnerText;
                    } catch (NullReferenceException e) {
                        Console.WriteLine("\nException Caught!");	
                        Console.WriteLine("Message :{0} ",e.Message);
                        continue;
                    }
                    DateTime pubDate = Convert.ToDateTime(pubDateStr);
                    // Console.WriteLine(pubDate);
                    if (utcDate.Subtract(pubDate).TotalHours < 24 * 2) {
                        Console.WriteLine("Within 2 days");
                        // check if id is in db
                        string esInstance = Environment.GetEnvironmentVariable("ES_INSTANCE");
                        var settings = new ConnectionConfiguration(new Uri(esInstance))
                            .RequestTimeout(TimeSpan.FromMinutes(2));
                        var lowlevelClient = new ElasticLowLevelClient(settings);
                        var searchResponse = lowlevelClient.Search<StringResponse>("post", PostData.Serializable(new
                        {
                            query = new
                            {
                                match = new
                                {
                                    guid = items[i]["guid"].InnerText// items[i]["guid"].InnerText
                                }
                            }
                        }));
                        var successful = searchResponse.Success;
                        var responseJson = searchResponse.Body;
                        SearchResult searchResult = JsonSerializer.Deserialize<SearchResult>(responseJson);
                        if (searchResult.hits.total.value == 0) {
                            SendItemToDiscord(items[i]);
                        } else {
                            Console.WriteLine("Match Already in DB, not going to print");
                        }
                    }
                }
            }
            await Task.CompletedTask;
        }
        static async public Task<string> FetchData(string searchText) {
            var query = HttpUtility.ParseQueryString(string.Empty);
            query["q"] = searchText;
            string queryString = query.ToString();

            string htmlData = string.Empty;
            string urlTemplate = @"https://news.google.com/rss/search?{0}";
            string url = string.Format(urlTemplate, queryString);
            try	
            {
              string responseBody = await client.GetStringAsync(url);

              Console.WriteLine(responseBody);
              return await Task.FromResult(responseBody);
            }
            catch(HttpRequestException e)
            {
              Console.WriteLine("\nException Caught!");	
              Console.WriteLine("Message :{0} ",e.Message);
            }
            return await Task.FromResult("");
        }
    }
}
 
 ```

This code is a .NET Core console application that performs two main functions: checking for news articles and checking for stock prices. The news checking function fetches the latest news articles from an API and sends a summary of the latest articles that contain keywords from a predefined list of search terms to a Discord channel. The function also sends the information to an Elasticsearch instance for tracking. The stock price checking function queries a stock API to get the latest stock prices of a predefined list of stocks and logs the results.

Here's a high-level overview of the code:

1. The "News" class contains the main logic for the application.
2. The "SendItemToDiscord" method sends a summary of a news article to a Discord channel. The method uses the Discord webhook URL, which is stored as an environment variable, to post a message to a specific Discord channel. The method also uses the Elasticsearch instance URL, stored as another environment variable, to index the article for tracking purposes.
3. The "checkNews" method checks for the latest news articles that contain the keywords from a predefined list of search terms. The method calls the "FetchData" method to retrieve the latest news articles in XML format and parses the XML to extract the article summaries. The method then sends the latest articles to the Discord channel using the "SendItemToDiscord" method.
4. The "checkPrices" method checks for the latest stock prices of a predefined list of stocks. The method uses the stock API URL, stored as an environment variable, to retrieve the latest stock prices. The method logs the results of the stock prices.
5. The "Main" method is the entry point of the application and calls the "checkNews" and "checkPrices" methods. The "checkNews" and "checkPrices" methods are executed as asynchronous tasks.

Using RSS feeds as a news source for investing purposes can be a useful way to stay up to date on the latest financial news and market developments. This can be especially useful for investors who are interested in a particular sector or industry, as they can subscribe to RSS feeds from news sources that specialize in that area.

By subscribing to these feeds, investors can receive notifications as soon as new articles or reports are published, which can provide them with valuable insights and information about the market and specific investments. Additionally, investors can use RSS feeds to track the latest news on companies they are interested in, which can help them stay informed about important developments and trends.

However, it is important for investors to keep in mind that not all news sources are created equal. Some sources may have biases or agendas, and it is important to be critical and evaluate the information being presented. It is also important to seek out multiple sources of information, as relying solely on one source may lead to a skewed or incomplete view of the market and individual investments.


Elasticsearch is a search engine based on the Lucene library. It provides a distributed, multitenant-capable full-text search engine with a RESTful web interface and schema-free JSON documents. It is used for various purposes, including:

1. Full-Text Search: Elasticsearch is particularly useful for full-text search queries, with its ability to search through large volumes of data quickly and efficiently.
2. Analytics and Business Intelligence: Elasticsearch can be used to gather insights from data and to perform advanced analytics tasks, such as aggregations and data analysis.
3. Log Management and Analysis: Elasticsearch is widely used for log management and analysis, making it possible to quickly search through large amounts of log data to identify patterns and troubleshoot issues.
4. Application Performance Monitoring: Elasticsearch can be used to monitor the performance of applications, as well as to store and analyze log data, providing real-time visibility into the health of the application and its components.
5. Geospatial Data: Elasticsearch has built-in support for geospatial data, making it possible to search, filter and aggregate data based on location.
6. E-commerce: Elasticsearch can be used to power search and recommendations in e-commerce applications, helping users find the products they are looking for quickly and easily.
7. Security Information and Event Management (SIEM): Elasticsearch can be used as part of a SIEM solution to collect, store, and analyze security-related data from various sources, such as network devices and applications.

These are just a few of the many use cases for Elasticsearch, and it is a highly versatile technology that can be used in a wide range of applications and industries.


Yes, Bonsai.io is one of the providers that offer free hosting for Elasticsearch. With their free plan, you can host a single cluster with up to 3GB of storage and 20GB of bandwidth per month. However, it's worth noting that the free plan is intended for experimentation and learning, and may not be suitable for production-level workloads. Bonsai.io also offers paid plans with more advanced features, higher storage, and better performance.


