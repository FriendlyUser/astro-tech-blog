---
tags: ['chatgpt', 'flutter']
title: In this blog post I will show you to build a markdown viewer in Flutter.
description: For chatgpt usage, it is easier to view the prompts in a markdown viewer as a chrome extension.
pubDate: Fri, 7 July 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

Web scraping is the process of extracting data from websites. It is a powerful tool for data scientists and analysts who need to collect data from various sources. In this article, we will walk through the process of building a web scraper in Rust using popular libraries like `reqwest`, `select`, and `scraper`.

Before we get started, it is important to note that web scraping can be a contentious issue. Some website owners may view web scraping as a violation of their terms of service or even as an illegal activity. As such, it is important to ensure that you are not violating any laws or terms of service when building your web scraper.

Step 1: Setup

The first step in building a web scraper in Rust is to set up a new Rust project. You can use your favorite IDE or text editor to create a new Rust project. For this tutorial, we will be using the `cargo` command to create a new project:

```bash
cargo new my_scraper
cd my_scraper
```

Step 2: Dependencies

The next step is to add the necessary dependencies to our project. We will be using the `reqwest`, `select`, and `scraper` libraries for this. Add the following lines to your `Cargo.toml` file:

```toml
[dependencies]
reqwest = "0.11.4"
select = "0.6.0"
scraper = "0.13.0"
```

The `reqwest` library is used for making HTTP requests to websites. The `select` library is used for parsing HTML documents and selecting specific elements from them. The `scraper` library is built on top of `select` and provides a more convenient interface for parsing HTML documents.

Step 3: Making HTTP requests

Now that we have our dependencies set up, we can start making HTTP requests to websites. In this example, we will be scraping data from the Hacker News website.

```rust
use reqwest::Error;
use scraper::{Html, Selector};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let url = "https://news.ycombinator.com/";
    let body = reqwest::get(url).await?.text().await?;

    let document = Html::parse_document(&body);
    let selector = Selector::parse(".storylink").unwrap();

    for element in document.select(&selector) {
        let link = element.value().attr("href").unwrap_or("");
        let title = element.text().collect::<Vec<_>>().join("");
        println!("{} ({})", title, link);
    }

    Ok(())
}
```

We start by defining the URL of the website we want to scrape. We then use the `reqwest` library to make an HTTP request to the website and get the HTML body of the response. We use the `Html::parse_document` function from the `scraper` library to parse the HTML document and create a `Document` object.

We then use the `Selector::parse` function from the `select` library to select all elements with the class `storylink`. We loop through each of these elements and extract the link and title information using the `attr` and `text` methods provided by the `scraper` library.

Step 4: Saving data

Once we have scraped the data we need, we can save it to a file or database for further processing. In this example, we will simply print the data to the console.

```rust
use std::fs::File;
use std::io::prelude::*;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let url = "https://news.ycombinator.com/";
    let body = reqwest::get(url).await?.text().await?;

    let document = Html::parse_document(&body);
    let selector = Selector::parse(".storylink").unwrap();

    let mut file = File::create("output.txt").unwrap();

    for element in document.select(&selector) {
        let link = element.value().attr("href").unwrap_or("");
        let title = element.text().collect::<Vec<_>>().join("");
        let line = format!("{} ({})\n", title, link);
        file.write_all(line.as_bytes()).unwrap();
    }

    Ok(())
}
```

In this example, we create a new file called `output.txt` and write each scraped line to the file using the `write_all` method provided by the `std::io::prelude` module.

Conclusion

In this article, we have walked through the process of building a web scraper in Rust using popular libraries like `reqwest`, `select`, and `scraper`. We have shown how to make HTTP requests to websites, parse HTML documents, and save the scraped data to a file. With this knowledge, you can build powerful web scraping tools to collect and analyze data from the web.