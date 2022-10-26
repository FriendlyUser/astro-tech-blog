---
title: Scrapping comments from Yahoo Finance using dotnet
description: Explaining how conscrap project grabs comments from yahoo finance using selenium. 
alt: Explaining how conscrap project grabs comments from yahoo finance using selenium.
pubDate: Tuesday, 25 October 2022 13:00:00 GMT
tags: ["dotnet", "stonks", "selenium"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-25 08.48.53 - man slicing through a bench with a katana.png'
imgAlt: 'Conscrap'
---

# Summary

One of my most useful projects is [conscrap](https://github.com/dli-invest/conscrap)

Like any good web scrapping you have to adhere to rate limits in order to not get blocked.

```cs
public async static Task FetchStocks(string[] stocks, bool sendDiscord = true, string dataPath = "data")
{
    bool exists = System.IO.Directory.Exists(dataPath);

    if (!exists)
        System.IO.Directory.CreateDirectory(dataPath);
    SemaphoreSlim discordThrottler = new SemaphoreSlim(30, 30);
    SemaphoreSlim seleniumThroller = new SemaphoreSlim(5);
    // Console.WriteLine(fetchConfig);
    Types.FetchConfig fetchConfig = new Types.FetchConfig
    {
        sendDiscord = sendDiscord,
        dataPath = dataPath,
        discordThrottler = discordThrottler,
        seleniumThroller = seleniumThroller
    };
    foreach (string stock in stocks)
    {
        await ProcessStock(stock, fetchConfig);
    }
}
```

The code above is the main function that is called to fetch comments from yahoo finance. It creates a semaphore to throttle the number of discord messages sent at once and another semaphore to throttle the number of selenium instances running at once.

Afterwards it processes each stock in the list of stocks.

In order to process each stock, we need to get all the yahoo comments for that stock.

```cs
public static List<Types.YahooComment> GetYahooComments(string ticker = "ACT.CN")
{
    string readText = Browser.GetAllEntries(ticker);
    var htmlDoc = Parse.MkHtmlDoc(readText);
    var yahooData = Parse.ExtractYahooConversationsHtml(readText);
    // htmlDoc = Parse.MkHtmlDoc(yahooData.ToString());
    var yahooComments = Parse.ExtractComments(yahooData);
    return yahooComments;
}
```

In order to get all entries we use selenium, sort by newest comments, retry again if it failed and then click on the show more button until there are no more comments to show.

```cs
 public static string GetAllEntries(string ticker = "PKK.CN")
{
    IWebDriver driver = Browser.MkBrowser();
    // use base url from contant
    string msgUrls = String.Format("https://finance.yahoo.com/quote/{0}/community?p={0}", ticker);
    Console.WriteLine(String.Format("Parsing messages for {0}", ticker));
    driver.Navigate().GoToUrl(msgUrls);
    Boolean success = SortByNewestComments(driver);
    if (!success) 
    {
        Console.WriteLine(String.Format("Sort By newest Comments failed for {0}", ticker));
        SortByNewestComments(driver);
    }
    ShowAllComments(driver);

    // click on all the replies elements
    // string repliesXPath = Constants.YahooXPaths.repliesXPath;
    // driver.FindElement(By.ClassName("replies-button")).Click();
    OpenQA.Selenium.Interactions.Actions action = new OpenQA.Selenium.Interactions.Actions(driver);

    String pageSource = driver.PageSource;
    // System.IO.File.WriteAllText(@"WriteText.txt", pageSource);
    return pageSource;
}
```

In order to sort by SortByNewestComments we need to click on the sort by newest comments button.

```cs
public static Boolean SortByNewestComments(IWebDriver driver)
{
    try
    {
        Thread.Sleep(5000);
        // make into function
        string sortXPath = Constants.YahooXPaths.sortButtonXPath;
        var sortEle = driver.FindElement(By.XPath(sortXPath));
        sortEle.Click();
        Thread.Sleep(1000);
        string createdXPath = Constants.YahooXPaths.sortByCreatedAtXPath;
        var createdEle = driver.FindElement(By.XPath(createdXPath));
        createdEle.Click();
        Thread.Sleep(1000);
        return true;
    }
    catch (NoSuchElementException)
    {
        return false;
    }
}
```

SO the code above is pretty simple, we just click on the sort button, then click on the sort by created at button.


NExt we need to show all comments.

```cs
public static void ShowAllComments(IWebDriver driver)
{
    // sort by newest
    string showMoreXPath = Constants.YahooXPaths.showMoreXPath;
    int numFailure = 0;
    for (int i = 0; i < 100; i++)
    {
        try
        {
            var element = driver.FindElement(By.XPath(showMoreXPath));
            // need a delay to show elements
            // click on element using javascript
            ((IJavaScriptExecutor)driver).ExecuteScript("arguments[0].click();", element);
            // element.Click();
            Thread.Sleep(300);

        }
        catch (NoSuchElementException)
        {
            numFailure++;
            if (numFailure > 4)
            {
                Console.WriteLine(i + " Element does not exist! Stopping Loop");
                break;
            }
        } catch(OpenQA.Selenium.ElementClickInterceptedException ex) {
            Console.WriteLine("ElementClickInterceptedException");
            numFailure++;
            Console.WriteLine(ex);
            if (numFailure > 4)
            {
                Console.WriteLine(i + " ElementClickInterceptedException! Stopping Loop");
                break;
            }
        }
    }
}
```

The code above is pretty simple, we just click on the show more button until it doesn't exist anymore or we have tried 100 times.

To view detailed documentation of the code, please visit the [conscrap](https://dli-invest.github.io/conscrap) page.

For the time being for use in order projects, I have not published the code to nuget. If you would like to use the code, please clone the repo and build it yourself. An example of this is the [dli-invest](https://github.com/dli-invest/stonk_reports) project.