---
tags: ['go', 'web']
title: Web Scraping in Golang
description: Web scraping is the process of extracting data from websites in an automated fashion. It is a very useful technique to gather large amounts of data from the web. Golang is a great language for web scraping due to its speed, concurrency, and simplicity. 
pubDate: Fri, 17 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1797349317.png"
---

# Web Scraping in Golang


Web scraping is the process of extracting data from websites in an automated fashion. It is a very useful technique to gather large amounts of data from the web. Golang is a great language for web scraping due to its speed, concurrency, and simplicity. 

In this article, we will explore how to build a basic web scraper in Golang using the goquery package for parsing HTML and making HTTP requests.

## Making HTTP Requests 
The net/http package is used for making HTTP requests in Golang. We can use it to make GET requests to websites we want to scrape. Here is a basic example:

```go
package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
)

func main() {
	resp, err := http.Get("https://example.com/")
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	fmt.Printf("%s", body)
}
```

This makes a GET request to example.com and prints the full response body as a string.

## Parsing the Response 
Now that we have the HTML content, we need to parse it to extract the data we want. For this, we'll use the goquery package which lets us query the DOM using CSS selectors. Here's an example:

```go
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/PuerkitoBio/goquery"
)

func main() {
	resp, err := http.Get("https://news.ycombinator.com/")
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	doc.Find("a.titlelink").Each(func(i int, s *goquery.Selection) {
		fmt.Printf("%d: %s\n", i, s.Text())
	})
}
```

This scrapes the page at news.ycombinator.com and extracts all the story titles into stdout.

## Putting it Together 
We now have all the pieces to build a basic web scraper in Golang. Here is a full example:

```go
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/PuerkitoBio/goquery"
)

func main() {
	resp, err := http.Get("https://news.ycombinator.com/")
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	var titles []string
	doc.Find("a.titlelink").Each(func(i int, s *goquery.Selection) {
		titles = append(titles, s.Text())
	})

	fmt.Printf("Found %d titles!\n", len(titles))
}
```

This program makes a synchronous GET request to hacker news, parses the response to find all story titles, and prints the count.

Conclusion 
The Golang ecosystem provides strong support for building web scrapers with fast HTTP clients and convenient DOM parsing libraries. By leveraging Golang's speed and concurrency, you can build high-performance scrapers to extract data from websites reliably. Hope this helps you get started with web scraping in Golang! Let me know if you have any questions.