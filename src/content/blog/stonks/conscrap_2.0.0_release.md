---
title: Conscrap 2.0.0 Release
description: Explaining how I fixed conscrap using the new shadow root api 
alt: Explaining how conscrap project grabs comments from yahoo finance using selenium.
pubDate: Friday, 25 August 2023 13:00:00 GMT
tags: ["dotnet", "stonks", "selenium"]
projects: ["conscrap"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/conscrap200.png'
imgAlt: 'Conscrap'
---

## Shadow Root

The ShadowRoot interface represents the root of a shadow DOM subtree, which is a separate DOM tree that is hidden from the main document tree. The Element.shadowRoot property allows you to access the shadow root of an element, but only if it was created using the Element.attachShadow() method with the mode set to "open".


Web scraping shadow roots with Selenium can be a bit more challenging than scraping regular web pages because shadow roots are not directly accessible from the main DOM tree. However, it is still possible to scrape data from shadow roots using Selenium by utilizing its JavaScript execution capabilities.

Here's an example of how you might do this in Python:

```python
from selenium import webdriver

# create a new instance of the Firefox driver
driver = webdriver.Firefox()

# navigate to the page you want to scrape
driver.get("https://example.com")

# execute a JavaScript script to get the shadow root
shadow_root = driver.execute_script("return arguments[0].shadowRoot", element)

# now you can access the shadow root like a regular DOM tree
# and scrape the data you need
data = shadow_root.find_element_by_css_selector("#data").text

# close the browser
driver.quit()
```

Here, element is the element whose shadow root you want to access.

It's worth noting that if the website you want to scrape is using Shadow DOM v0, you can directly access the shadow root of an element using the element.shadowRoot property. But for Shadow DOM v1 or later, you need to use the above script.

Also, keep in mind that some website might have anti-scraping measures or CORS policy that might block Selenium scraping and in that case, you might have to use a proxy or a VPN to bypass it.

With the changes to the yahoo finance comments api, the comments are added to the dom via a shadow root. In order to scrap the comments from yahoo finance, I have to access the shadow root.

Instead of leverage selenium bindings in C#, I decided to use plain javascript to access all shadowroots and return the comments as a html string.

The js command I send over to selenium, creates a function to get all shadow roots and then finds a certain selector.
```csharp
String getCommentsCmd = Constants.jsQuerySelectorAllShadows + """const results = querySelectorAllShadows("ul.spcv_messages-list"); return results[0].outerHTML.toString();""";
```

That selector has dom elements that contain all the comments for the yahoo finance stock.

The function takes two arguments:

* selector: a string containing a CSS selector that specifies the elements to search for.
* el: (optional) The DOM element to start searching from, defaults to document.body if not provided. The function first searches for all elements with shadowRoot property and recursively calls itself on each of these shadow roots.

It then takes the results of these recursive calls and concatenates them with the results obtained from the current el.querySelectorAll(selector) call.
Finally, it flattens the results array and returns it.
```csharp
        public const string jsQuerySelectorAllShadows = 
@"function querySelectorAllShadows(selector, el = document.body) {
                // recurse on childShadows
                const childShadows = Array.from(el.querySelectorAll('*')).
                    map(el => el.shadowRoot).filter(Boolean);
                // console.log('[querySelectorAllShadows]', selector, el, `(${childShadows.length} shadowRoots)`);
                const childResults = childShadows.map(child => querySelectorAllShadows(selector, child));
                
                // fuse all results into singular, flat array
                const result = Array.from(el.querySelectorAll(selector));
                return result.concat(childResults).flat();
            }
";
```

The disadvantage of selenium based web-scrapping tends to be the speed.


```csharp
try {
    // find Maybe later by text Maybe Later
    IWebElement maybeLater = driver.FindElement(By.XPath("//button[contains(text(), 'Maybe later')]"));
    // IWebElement maybeLater = driver.FindElement(By.XPath("//button[contains(@class, 'btn btn-primary')]"));
    maybeLater.Click();
} catch (NoSuchElementException) {
    Console.WriteLine("No Maybe Later Button");
}
```

After swapping to the iframe containing all the comments, I attempt to hide the Maybe later popout that yahoo finance shows for unauthenticated users.

Outside of that, there are some minor xpath adjustments that were made due to changes in the comment format.

## Migrating to .NET 7.0
In general it was pretty simple for this project to migrate to .net 7.0, have not encountered any major issues.

Migrating from .NET 6.0 to .NET 7.0 will depend on the specific applications and libraries that you are using. Here are a few general steps that you can follow:

Check for compatibility: Before you begin, check if your application and its dependencies are compatible with .NET 7.0. Some libraries or frameworks may not have been updated to work with the latest version of .NET, and you may need to find alternatives or wait for updates.

Update the target framework: Update your application's target framework to .NET 7.0. You can do this by opening your project in Visual Studio and navigating to the Properties page.

## Publishing to nuget

In this release, I added a deployment action to nuget for github and nuget packages.


```yaml
if: startsWith(github.ref, 'refs/heads/release')
run: |
  dotnet pack --configuration $BUILD_CONFIG --no-restore
  nuget setapikey "${{ secrets.NUGET_KEY }}"
  nuget push **\*.nupkg -Source "https://api.nuget.org/v3/index.json" -SkipDuplicate
  dotnet nuget add source --username dli-invest --password ${{ secrets.GITHUB_TOKEN }} --store-password-in-clear-text --name github "https://nuget.pkg.github.com/dli-invest/index.json"
  dotnet nuget push **\*.nupkg --api-key "${{ secrets.GITHUB_TOKEN }}" --source "github"
```

## References

View the documentation for conscrap at

* https://github.com/dli-invest/conscrap