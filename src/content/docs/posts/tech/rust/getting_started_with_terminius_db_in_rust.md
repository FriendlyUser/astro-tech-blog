---
tags: ['TerminusDB', 'rust']
title: Using TerminusDB from Rust with reqwest and the HTTP API
description: Run TerminusDB in Docker, then create a database, add a schema, insert documents and read them back from Rust using reqwest and serde_json.
pubDate: Fri, 24 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/118660664.webp"
---

TerminusDB is an open-source (Apache 2.0) document and graph database with git-style version control: every write is a commit, and you can branch, diff, merge, clone and time-travel over your data. It is queried through a JSON document API or WOQL (Web Object Query Language), a Datalog-style query language.

There is no official Rust client, but the server speaks plain HTTP + JSON, so `reqwest` and `serde_json` are enough. This post walks through creating a database, adding a schema, inserting documents and reading them back.

## Run TerminusDB

The quickest way is the official Docker image, which listens on port 6363:

```bash
docker run --pull always -d -p 127.0.0.1:6363:6363 \
  -v terminusdb_storage:/app/terminusdb/storage \
  --name terminusdb terminusdb/terminusdb-server:v12
```

The default user is `admin` with password `root` (set `TERMINUSDB_ADMIN_PASS` on the container to change it). Check that the server is up:

```bash
curl -u admin:root http://localhost:6363/api/info
```

## Project setup

```toml
[dependencies]
reqwest = { version = "0.13", features = ["json", "query"] }
serde_json = "1"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

In reqwest 0.13, `RequestBuilder::query` sits behind the `query` feature, so it has to be enabled explicitly alongside `json`.

## A small client

The endpoints used here are:

- `POST /api/db/{org}/{db}` creates a database. The body needs a `label`.
- `POST /api/document/{org}/{db}` inserts documents. `author` and `message` are commit metadata; `graph_type=schema` targets the schema graph instead of the instance graph. It returns the IDs of the inserted documents.
- `GET /api/document/{org}/{db}?type=...&as_list=true` returns all documents of a type as a JSON array (without `as_list` you get a stream of JSON objects).

```rust
use reqwest::Client;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:6363/api";
const USER: &str = "admin";
const PASS: &str = "root";

struct TerminusDb {
    client: Client,
    path: String, // "{org}/{db}"
}

impl TerminusDb {
    fn new(org: &str, db: &str) -> Self {
        Self {
            client: Client::new(),
            path: format!("{org}/{db}"),
        }
    }

    async fn create_db(&self, label: &str) -> Result<Value, reqwest::Error> {
        self.client
            .post(format!("{BASE}/db/{}", self.path))
            .basic_auth(USER, Some(PASS))
            .json(&json!({ "label": label }))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }

    async fn insert(
        &self,
        docs: &Value,
        graph_type: &str,
        message: &str,
    ) -> Result<Value, reqwest::Error> {
        self.client
            .post(format!("{BASE}/document/{}", self.path))
            .basic_auth(USER, Some(PASS))
            .query(&[
                ("graph_type", graph_type),
                ("author", USER),
                ("message", message),
            ])
            .json(docs)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }

    async fn documents_of_type(&self, type_name: &str) -> Result<Value, reqwest::Error> {
        self.client
            .get(format!("{BASE}/document/{}", self.path))
            .basic_auth(USER, Some(PASS))
            .query(&[("type", type_name), ("as_list", "true")])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }
}
```

`error_for_status()` turns 4xx/5xx responses into errors. Without it, a failed request (wrong password, missing database, schema violation) would be parsed as if it were a normal response.

## Schema, insert, read

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db = TerminusDb::new("admin", "people");

    db.create_db("People").await?;

    // A Person class whose ID is derived from its name.
    let schema = json!([{
        "@type": "Class",
        "@id": "Person",
        "@key": { "@type": "Lexical", "@fields": ["name"] },
        "name": "xsd:string",
        "age": "xsd:integer"
    }]);
    db.insert(&schema, "schema", "Add Person schema").await?;

    let people = json!([
        { "@type": "Person", "name": "Ada", "age": 36 },
        { "@type": "Person", "name": "Grace", "age": 85 }
    ]);
    let ids = db.insert(&people, "instance", "Add two people").await?;
    println!("inserted: {ids}");

    let docs = db.documents_of_type("Person").await?;
    for person in docs.as_array().into_iter().flatten() {
        println!("{} -> {}", person["@id"], person["name"]);
    }

    Ok(())
}
```

Running it twice fails on `create_db`, because the database already exists. Delete it with `DELETE /api/db/admin/people` or pick another name.

Each `insert` call (schema and instance) is its own commit, recorded with the `author` and `message` you passed.

## Notes

- With a `Lexical` key, inserting a second `Person` named "Ada" is rejected because the ID would clash. Use `PUT` on the same endpoint to replace an existing document.
- The document API covers most CRUD work. For joins across documents or path queries, send WOQL to `/api/woql/{org}/{db}`; the JSON form of WOQL is verbose, so it is easier to build queries with the official JavaScript or Python client and copy the JSON they produce.
- Don't hard-code `admin:root` outside local development.

## Further reading

- [TerminusDB documentation](https://terminusdb.com/docs/)
- [Document insertion reference](https://terminusdb.com/docs/document-insertion)
- [reqwest on docs.rs](https://docs.rs/reqwest)
