---
title: Scrapping comments from Yahoo Finance using dotnet Part 2
description: Explaining how I updated my conscrap project to handle comment formats from yahoo finance 
alt: Explaining how conscrap project grabs comments from yahoo finance using selenium.
pubDate: Friday, 11 November 2022 13:00:00 GMT
tags: ["dotnet", "stonks", "selenium"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-11-11 09.22.04 - spiderweb.png'
imgAlt: 'Conscrap'
---

## Summary

Recently the format of the comments on yahoo finance changed. This caused my conscrap project to break. I had to update the code to handle the new format.

This involves accessing an iframe loaded for the comments, surprising this does not impact news scrapping. I also added cron tests to ensure I am notified if the code breaks.

```csharp
Thread.Sleep(15000);
IWebElement iFrame = driver.FindElement(By.XPath("//iframe[contains(@id, 'jacSandbox')]"));
driver.SwitchTo().Frame(iFrame);
String pageSource = driver.PageSource;
driver.SwitchTo().DefaultContent();
```


Changes to the xpaths are listed below.

```csharp
  public const string postDateXPath = "//*[@data-spot-im-class='message-timestamp']";
  public const string postDateXPathLegacy = "//div/div[1]/span/span";
  
  public const string contentXPath = "//*[@data-spot-im-class='message-text']/text()";
  // public const string contentXPathLegacy = "//div/div[2]/div";

  public const string authorXPathLegacy = "//div/div[1]/button";

  public const string authorXPath = "//span[@data-spot-im-class='message-username']";

  // components-MessageActions-components-VoteButtons-index__votesCounter
  public const string likesXPath = "//span[contains(@class, 'components-MessageActions-components-VoteButtons-index__votesCounter')]/text()";

  public const string likesXPathLegacy = "//div/div[4]/div[2]/button[1]//text()";
  public const string dislikesXPath = "//div/div[4]/div[2]/button[2]//text()";

  public const string showMoreXPath = "//button[contains(., 'Show More Comments')]";
  // button that contains reply text
  public const string repliesXPath = "//button[contains(., 'Replies')]";

  public const string sortButtonXPath = "//button[contains(@class, 'sort-filter-button')]";
```

So for xpaths we are matching custom attributes, class names and text. This is a bit of a pain but it works. Feel like its easier.

Anyway, we are looking for custom attributes added to yahoo finance comments, there are test cases to reflect the new format.

Outside of that, havent made too many changes, test coverage has been lower.


For the time being for use in order projects, I have not published the code to nuget. If you would like to use the code, please clone the repo and build it yourself. An example of this is the [dli-invest](https://github.com/dli-invest/stonk_reports) project.