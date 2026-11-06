---
title: Removing Broken Links with the Fetch API
pubDate: "2024-08-29T09:57:22.000Z"
description: "This article will guide you through the process of installing and using Fabric in Python, with practical examples"
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3541980154.png
---

## Removing Broken Links with the Fetch API

When building a website, it's important to regularly check for and remove any broken or dead links that may exist across your pages. Broken links create a poor user experience and can negatively impact your site's SEO. In this article, we'll look at how to use the Fetch API in JavaScript to efficiently identify and eliminate faulty links.

The Fetch API provides a modern way to make network requests directly from JavaScript. A key benefit of Fetch is the ability to make HEAD requests, which retrieve just the headers of a response without the full body. For our purposes, this allows quickly checking the status code of a link without downloading the entire resource. 

Here's example code to loop through all links on a page, make HEAD requests, and remove any that return 400+ status codes:

```js

const links = document.querySelectorAll('a');
//
// ...
// for each link in a
fetch(a.href, {method: 'HEAD'})
  .then(res => {
    if(res.status >= 400) {
      row.remove(); 
    }
  })
  .catch(e => {
    // a.remove();
  }); 
```

This uses document.querySelectorAll to grab all <a> elements, then makes a HEAD request to check each href. If the status is 400 or above, indicating a client or server error, we remove the link's entire row from the DOM. 

document.querySelectorAll allows us to easily select elements by CSS selector syntax. This gives us flexibility to target specific links, like only ones in a table or under a certain class. Overall, combining Fetch, HEAD requests, and querySelectorAll provides a straightforward way to prune dead links on a page.



## Optimizations and Considerations

While the basic technique outlined above works, there are a few ways we can optimize the process and avoid potential pitfalls:

- Check links asynchronously - Making a large number of sequential Fetch requests could lock up the browser. We can make use of async/await to send requests in parallel:

```js
async function checkLinks() {

  const links = document.querySelectorAll('a');

  const requests = Array.from(links).map(async link => {
    const res = await fetch(link.href, {method: 'HEAD'});
    return [link, res]; 
  });

  const results = await Promise.all(requests);

  results.forEach(result => {
   const [link, res] = result;
   if(res.status >= 400) {
     link.remove();
   }
  });

}
```

- Watch for redirects - Some 400+ status codes are for temporary redirects rather than permanent broken links. We may want to allow 3xx responses to avoid removing working links.

- Consider link types - Be thoughtful about which links you want to remove. Deleting JS/CSS assets could break functionality.

- Re-crawl - Check links again after removing to catch any new issues exposed.

- Report issues - Logging or alerting on invalid links can help track down problems.

Properly deployed, an automated Fetch-based solution can greatly reduce the occurrence of dead links. With the ability to refine selector targets and handle redirects/assets, we can keep our sites full of useful, working links.

## Putting It All Together

Now that we've explored the core technique and some optimizations, let's walk through an expanded script to cleanly remove dead links from a site:

```js
// Select links, exclude ones we don't want to check
const links = document.querySelectorAll('a:not([data-ignore])'); 

async function checkStatus(link) {
  const res = await fetch(link.href, {method: 'HEAD'});
  
  if(res.status >= 400 && res.status < 500) {
    // Log 4xx issues
    console.log(`${link.href} returned ${res.status}`);
    return false;
  } else if(res.status >= 500) {
    // Retry 5xx issues 
    return checkStatus(link);
  } else {
    return true; 
  }
}

async function checkLinks() {

  const linkPromises = Array.from(links).map(async link => {
    const valid = await checkStatus(link);
    return [link, valid];
  });
  
  const results = await Promise.all(linkPromises);
  
  results.forEach(result => {
    const [link, valid] = result;
    if(!valid) {
      link.remove();
    }
  });
  
}

// Initially check links 
checkLinks();

// Re-check links periodically
setInterval(checkLinks, 60*60*1000); 
```

This expands on our initial script by:

- Using a `data-ignore` attribute to exclude certain links from checking, like CSS/JS assets we want to leave alone. 

- Logging 4xx status codes to diagnose issues while still removing the links.

- Retrying failed requests in case of transient 5xx errors.

- Running the checker on an interval to detect new broken links over time.

With these enhancements, we have a robust solution to keep our links tidy and users happy. The Fetch API provides the flexibility to implement exactly the checking logic we need.