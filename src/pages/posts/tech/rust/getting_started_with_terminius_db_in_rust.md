---
tags: ['TerminusDB', 'rust']
title: How to use TerminusDB in Rust
description: In this article, we will explore how to use TerminusDB in Rust, and how to integrate the two technologies to build efficient and reliable applications..
pubDate: Fri, 24 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/118660664.png"
---

TerminusDB is a graph database that provides a modern, powerful, and easy-to-use platform for building and deploying applications that require fast and efficient access to large amounts of data. Rust, on the other hand, is a system programming language that provides low-level control over system resources and guarantees memory safety, making it ideal for building high-performance applications that require robustness and stability.

It  offers several advantages over traditional relational databases and other graph databases:

1. Schema flexibility: TerminusDB allows for easy schema evolution without data loss, which is particularly useful in situations where the data model is not fully understood at the outset of a project.

2. Version control: TerminusDB has built-in version control, which allows you to easily track changes to your data over time and revert to previous versions if necessary.

3. Query language: TerminusDB uses a powerful query language called WOQL (Web Ontology Query Language), which allows for complex queries and data manipulation.

4. Graph visualization: TerminusDB includes a built-in graph visualization tool that allows you to explore the relationships between your data in an intuitive way.

5. Collaborative editing: TerminusDB supports collaborative editing, which allows multiple users to work on the same database simultaneously.

6. Open source: TerminusDB is an open-source project, which means that its source code is freely available and can be modified and redistributed by anyone.

In this article, we will explore how to use TerminusDB in Rust, and how to integrate the two technologies to build efficient and reliable applications.

## Getting Started with TerminusDB

To get started with TerminusDB, you need to first install it on your system. TerminusDB provides pre-built binaries for different platforms, including Windows, Linux, and macOS, which can be downloaded from their website.

Once you have installed TerminusDB, you can start using it by running the TerminusDB server, which provides an HTTP API for interacting with the database. You can use any HTTP client library in Rust, such as Reqwest or Hyper, to interact with the TerminusDB server.

## Connecting to TerminusDB from Rust

To connect to TerminusDB from Rust, you need to use an HTTP client library that supports sending JSON payloads and handling JSON responses. In this article, we will use the Reqwest library, which is a popular Rust HTTP client library that provides a simple and easy-to-use interface for making HTTP requests.

First, we need to add the Reqwest library to our Rust project by adding the following line to the `Cargo.toml` file:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
```

This will download and install the latest version of the Reqwest library, along with the `json` feature, which provides support for JSON payloads and responses.

Next, we can create a new Rust module to handle communication with TerminusDB. We will use the `reqwest::Client` struct to create a new HTTP client, and the `reqwest::RequestBuilder` struct to build and send HTTP requests:

```rust
use reqwest::Client;

pub struct TerminusDB {
    client: Client,
    url: String,
}

impl TerminusDB {
    pub fn new(url: &str) -> TerminusDB {
        let client = Client::new();
        TerminusDB { client, url: url.to_string() }
    }

    pub async fn query(&self, query: &str) -> Result<String, reqwest::Error> {
        let url = format!("{}/query", self.url);
        let resp = self.client.post(&url)
            .header("Content-Type", "application/json")
            .json(&json!({ "query": query }))
            .send()
            .await?;
        let body = resp.text().await?;
        Ok(body)
    }
}
```

In this code, we define a `TerminusDB` struct that contains an instance of the `reqwest::Client` struct and the URL of the TerminusDB server. We use the `new` method to create a new instance of the `TerminusDB` struct, and the `query` method to send a query to the TerminusDB server and receive the response.

The `query` method sends a POST request to the `/query` endpoint of the TerminusDB server, with a JSON payload containing the query string. It then reads the response body as a string and returns it as a `Result<String, reqwest::Error>`.

## Using TerminusDB in Rust

Now that we have a Rust module to handle communication with TerminusDB, we can start using it in our Rust application. Let's say we want to query the TerminusDB server for all the nodes in a graph, and print their IDs to the console:

```rust
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db = TerminusDB::new("http://localhost:6363");
    let query = r#"{"@type": "woql:Select","woql:query_result": {"@type": "woql:Variable","woql:variable_name": "X"}}}"#;
    let resp = db.query(query).await?;
    let json: Value = serde_json::from_str(&resp)?;
    let bindings = json["bindings"].as_array().unwrap();
    for binding in bindings {
        let id = binding["X"]["@id"].as_str().unwrap();
        println!("{}", id);
    }
    Ok(())
}
```

In this code, we create a new instance of the `TerminusDB` struct with the URL of the TerminusDB server. We then define a query string in WOQL format, which selects all the nodes in the graph and returns their IDs as variables.

We use the `query` method of the `TerminusDB` struct to send the query to the server and receive the response. We then parse the response body as a JSON value using the `serde_json::from_str` function, and extract the bindings of the query using the `bindings` key of the JSON object.

Finally, we iterate over the bindings and extract the ID of each node using the `@id` key of the JSON object. We print the ID to the console using the `println!` macro.

## Conclusion

TerminusDB is a powerful graph database that provides a modern and easy-to-use platform for building and deploying applications that require fast and efficient access to large amounts of data. Rust is a system programming language that provides low-level control over system resources and guarantees memory safety, making it ideal for building high-performance applications that require robustness and stability.

In this article, we have explored how to use TerminusDB in Rust, and how to integrate the two technologies to build efficient and reliable applications. We have shown how to connect to TerminusDB from Rust using the Reqwest HTTP client library, and how to send queries to the TerminusDB server and receive responses using JSON payloads and responses.

By combining the power of TerminusDB and Rust, you can build high-performance and robust applications that can scale to handle large amounts of data and provide fast and efficient access to it.