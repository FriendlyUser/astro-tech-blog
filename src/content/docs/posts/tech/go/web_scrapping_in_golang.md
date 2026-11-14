---
tags: ['go', 'web', 'web scraping']
title: Web scraping in Go with net/http and goquery
description: Fetch a page with Go's net/http, parse it with goquery's CSS selectors, and extract Hacker News story titles and links, plus the gotchas that break scrapers.
pubDate: Fri, 17 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1797349317.webp"
---

Web scraping means fetching a page over HTTP and pulling structured data out of its HTML. In Go the standard library handles the HTTP side, and [goquery](https://github.com/PuerkitoBio/goquery) gives you jQuery-style CSS selectors over the parsed document. This post builds a small scraper that lists the stories on the Hacker News front page.

The examples were checked against goquery v1.13.0.

## Fetching a page with net/http

```go
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
)

func main() {
	resp, err := http.Get("https://example.com/")
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("unexpected status: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%s\n", body)
}
```

Two things to note:

- `http.Get` only returns an error for network-level failures. A 404 or 500 is a successful request as far as `err` is concerned, so check `resp.StatusCode` yourself.
- `io.ReadAll` replaces `ioutil.ReadAll`; the `io/ioutil` package has been deprecated since Go 1.16.

## Parsing with goquery

Install goquery:

```bash
go mod init scraper
go get github.com/PuerkitoBio/goquery
```

`goquery.NewDocumentFromReader` parses the response body, and `Find` takes a CSS selector. On Hacker News each story title is a link inside a `span.titleline`, so the selector is `.titleline > a`.

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type story struct {
	Title string
	URL   string
}

func main() {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest(http.MethodGet, "https://news.ycombinator.com/", nil)
	if err != nil {
		log.Fatal(err)
	}
	// Identify your scraper; some sites block Go's default User-Agent.
	req.Header.Set("User-Agent", "go-scraper-example/1.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("unexpected status: %s", resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	var stories []story
	doc.Find(".titleline > a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		stories = append(stories, story{Title: s.Text(), URL: href})
	})

	for i, st := range stories {
		fmt.Printf("%2d. %s\n    %s\n", i+1, st.Title, st.URL)
	}
	fmt.Printf("Found %d stories\n", len(stories))
}
```

Run it with `go run .`. You should get the 30 front-page stories. Self posts like "Ask HN" have relative links such as `item?id=...`; resolve them against the page URL with `url.Parse` and `ResolveReference` if you need absolute URLs.

## Gotchas

- **Selectors break when the site changes.** An earlier version of this post used `a.titlelink`, which Hacker News has since dropped; that selector now matches nothing and the scraper silently returns zero results. Check the count you scrape and fail loudly when it's zero.
- **Prefer an API when there is one.** Hacker News has an official [read-only API](https://github.com/HackerNews/API), which is more stable than its HTML.
- **No JavaScript.** goquery parses the HTML the server returns. Pages that render content client-side need a headless browser (for example [chromedp](https://github.com/chromedp/chromedp)) or the JSON endpoint the page itself calls.
- **Be polite.** Check the site's `robots.txt` and terms, set a timeout, and rate-limit when fetching many pages.
- **Crawling many pages.** For following links, concurrency limits and caching, [Colly](https://github.com/gocolly/colly) wraps this pattern in a framework (and uses goquery for selection).

## Further reading

- [goquery documentation](https://pkg.go.dev/github.com/PuerkitoBio/goquery)
- [net/http documentation](https://pkg.go.dev/net/http)
