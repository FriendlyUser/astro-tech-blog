---
title: "Web Scraping for Construction and Procurement Data"
description: "What I learned scraping permit reports, open data and bid-opportunity sites for YellowSheet, plus a small C# scraper at CSPS."
tags: ["Web Scraping", "Python", "OCR", "Camoufox", "Proxies", "C#"]
pubDate: "2023-11-07T16:20:00.000Z"
---

Most of my scraping work has been for YellowSheet, a construction data subscription on Vancouver Island. I built the pipelines that pull building permits and tenders into the weekly issues. That work ended up split across three pieces: a FastAPI service for permit PDFs and open data, a set of GitHub Actions scrapers for permit trackers and bid sites, and an ingest API on the PHP site. At CSPS I also maintained a small C# function that scrapes the NJC kilometric rates page.

## What gets scraped

- **Permit PDFs.** Municipalities and regional districts publish monthly permit reports as PDFs, and every one of them uses a different layout. I started with a pdfplumber prototype behind a file-upload endpoint. Most of the early effort went into parsers and OCRmyPDF, plus an admin review page where staff include or exclude each scraped row before it is saved.
- **Open data and permit trackers.** City of Victoria ArcGIS permits and Nanaimo's open-data CSV. Later, Tempest/Prospero portals for Saanich, Victoria, Colwood, Courtenay and others, including decoding JS-obfuscated contact emails.
- **Bid opportunities.** Bonfire portals, BC Bid, CanadaBuys, bidsandtenders (Campbell River), the CRD bid site, plus Port Hardy and Strathcona RD.

## Plain requests first, browsers when forced

- For ASP.NET permit portals, plain `requests` sessions posting the form payloads worked without Selenium. I tested them against saved HTML fixtures.
- I tried zendriver, nodriver, SeleniumBase and proxies against CivicInfo, and ended up back on plain request logic.
- The bid sites forced a real browser. Camoufox handled Cloudflare on Bonfire at first. Later I preferred Pydoll wherever no login was needed, and when Camoufox broke I rewrote the Bonfire scraper on Pydoll Chrome, with humanized scrolling and the Cloudflare bypass only on the first detail pages.
- BC Bid was the hardest. I made about 30 "try again" commits with SeleniumBase, plain Selenium, Camoufox and Pydoll. It finally worked on Pydoll, with mouse movement to look human and a macOS runner that got through reCAPTCHA v2 reliably. Most of the commits from that stretch were trial and error on runner OS, headless vs Xvfb, and FFmpeg recordings.

## When sources change

- **Report layouts.** Comox Valley RD has two layouts. Alberni-Clayoquot changed its format partway through. Newer Ladysmith reports needed new mappings, and a hardcoded thousands multiplier on values became an opt-in flag. Each fix got a regression case in the test suite, which grew to about 90 reference PDFs.
- **Bad text layers.** PDFs with no text layer, or a gibberish one, go to the ocrmypdf service. Parse failures retry with forced OCR. The CRD Gulf Islands report led to a "garbage" check that forces OCR when the text contains "PI PI" or every line is under 7 characters.
- **AI fallback.** Hardcoded Comox/Cowichan parsing was replaced with Gemini. The regex parsers' output now gets a score, and the PDF goes to Gemini when the poor-quality ratio is 0.4 or higher. I also added a generic Gemini parser with a fixed JSON schema, so a new report doesn't always need new code.
- **Library changes.** A Pydoll upgrade turned `tab.page_source` into a method call, and I had to update every scraper.
- **Text cleanup.** Unicode dashes, zero-width spaces and other non-ASCII text kept breaking inserts until I added `unidecode` and NFKD normalization.
- **CSPS kilometric rates.** The NJC directive page is versioned, so the old C# function kept reading an outdated URL. I updated it to take the "Current" link from the version dropdown first and log a warning when a "Notice to the reader" alert shows up:

```dotnet
HtmlNode latestVersionLink = val.DocumentNode.SelectSingleNode("//ul[@aria-labelledby='section-versions']//li//a");
```

After that change, the function picked up the next rate update without anyone touching it.

## Scheduling, proxies and monitoring

- GitHub Actions crons run in UTC, so date filters like "entries from today" have to account for that.
- Each run reads the time of the last successful run from the GitHub API, so it only uploads what's new since then. Later I capped that lookback at 2 days to avoid huge backfills.
- Discord embeds report found/mapped/inserted/failed counts, and a missing CSV sends a red alert. BC Bid exclusions are logged with the reason and the matched phrase.
- Proxies moved from free Canadian lists to a paid residential provider, plus a small self-hosted proxy. Access to .gov sites is tightly restricted, so good proxies cost real money.
- For BC Bid, I split the target organizations into 1-3 random chunks per run so the request pattern varies.

## Lessons

- Try plain HTTP first. A browser adds runner, fingerprinting and proxy problems on top of the scraping itself.
- Keep a regression file for every source format. Layouts change without notice, and the tests are how I find out.
- Make every run report its counts, and treat browser-automation libraries as replaceable. Over time I went through Selenium, SeleniumBase, Camoufox and Pydoll.
