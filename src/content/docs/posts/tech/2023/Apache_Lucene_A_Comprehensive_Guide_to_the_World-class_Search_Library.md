---
description: How Apache Lucene indexes and searches text, how BM25 ranks results, and a
  runnable Java example that builds an index and queries it with Lucene 10.
imgSrc: /imgs/2023/454515535.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-23T14:36:34.000Z'
lastUpdated: 2026-11-14
tags: ["lucene", "java", "search"]
title: 'Apache Lucene basics: indexing and searching text in Java'
---

Apache Lucene is a Java library for full-text search, maintained by the Apache Software Foundation under the Apache License 2.0. It isn't a server. You embed it in your application, add documents to an index, and run queries against that index. Elasticsearch, OpenSearch and Apache Solr all use Lucene for indexing and search, so learning how Lucene works also explains a lot about how they behave.

This post covers the main concepts and then walks through a small program you can run.

## Core concepts

### Documents and fields

A `Document` is a set of named `Field`s, and Lucene has no fixed schema. What a field does depends on its type:

- `TextField` is analyzed (split into tokens) and indexed for full-text search.
- `StringField` is indexed as one token without analysis. Use it for IDs, tags and exact-match values.
- Numeric fields such as `IntPoint` and `LongPoint` support range queries.
- `Field.Store.YES` keeps the original value so you can read it back from search results. Indexing and storing are separate decisions.

### Analyzers

An `Analyzer` turns text into tokens. It is made of a `Tokenizer`, which splits the text, followed by zero or more `TokenFilter`s, which do things like lowercasing, removing stop words or stemming. `StandardAnalyzer` splits on Unicode word boundaries and lowercases tokens. It ships in `lucene-core`. Language-specific analyzers live in the `lucene-analysis-common` module.

Use the same analyzer at index time and query time. If they differ, query terms won't match the terms stored in the index.

### The index and IndexWriter

Lucene stores an inverted index, which maps each term to the documents that contain it. `IndexWriter` adds, updates and deletes documents. The index is written as immutable segments. New documents go into new segments, deletes are recorded as markers, and a background merge policy combines small segments into larger ones. Because segments never change once written, readers can keep searching while the writer works. Changes become visible when you commit or reopen a near-real-time reader.

### Searching

You build a `Query`, for example a `TermQuery`, `PhraseQuery`, `BooleanQuery` or a range query on a point field, and run it with an `IndexSearcher`. You can also parse a user-entered string into a `Query` with `QueryParser`, which lives in the separate `lucene-queryparser` module.

### Scoring

Since Lucene 6.0, the default ranking function is **BM25** (`BM25Similarity`, with `k1 = 1.2` and `b = 0.75`). Older versions defaulted to a TF-IDF/vector space model, which is still available as `ClassicSimilarity`. To change scoring, set a different `Similarity` on both `IndexWriterConfig` and `IndexSearcher`. The two need to match, because norms are computed at index time.

## A runnable example

These dependencies match Lucene 10.6.0, the current release. Lucene 10 requires Java 21 or later.

```xml
<!-- Maven -->
<dependency>
  <groupId>org.apache.lucene</groupId>
  <artifactId>lucene-core</artifactId>
  <version>10.6.0</version>
</dependency>
<dependency>
  <groupId>org.apache.lucene</groupId>
  <artifactId>lucene-queryparser</artifactId>
  <version>10.6.0</version>
</dependency>
```

```groovy
// Gradle
implementation 'org.apache.lucene:lucene-core:10.6.0'
implementation 'org.apache.lucene:lucene-queryparser:10.6.0'
```

The program below indexes three documents into an in-memory directory, then searches them:

```java
import java.io.IOException;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.index.StoredFields;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.ByteBuffersDirectory;
import org.apache.lucene.store.Directory;

public class LuceneDemo {

  public static void main(String[] args) throws IOException, ParseException {
    Analyzer analyzer = new StandardAnalyzer();

    try (Directory dir = new ByteBuffersDirectory()) {
      // Index
      try (IndexWriter writer = new IndexWriter(dir, new IndexWriterConfig(analyzer))) {
        writer.addDocument(doc("1", "Lucene is a search library written in Java"));
        writer.addDocument(doc("2", "Elasticsearch and Solr are search servers built on Lucene"));
        writer.addDocument(doc("3", "Java records were finalized in Java 16"));
      } // closing the writer commits

      // Search
      try (DirectoryReader reader = DirectoryReader.open(dir)) {
        IndexSearcher searcher = new IndexSearcher(reader);
        Query query = new QueryParser("body", analyzer).parse("search AND java");

        TopDocs hits = searcher.search(query, 10);
        System.out.println(hits.totalHits.value() + " hit(s)");

        StoredFields storedFields = searcher.storedFields();
        for (ScoreDoc hit : hits.scoreDocs) {
          Document d = storedFields.document(hit.doc);
          System.out.printf("id=%s score=%.3f %s%n", d.get("id"), hit.score, d.get("body"));
        }
      }
    }
  }

  private static Document doc(String id, String body) {
    Document doc = new Document();
    doc.add(new StringField("id", id, Field.Store.YES));
    doc.add(new TextField("body", body, Field.Store.YES));
    return doc;
  }
}
```

Only document 1 contains both "search" and "java", so the program prints one hit. To keep the index on disk, replace `ByteBuffersDirectory` with `FSDirectory.open(Path.of("index"))`.

## Gotchas when upgrading older code

Many Lucene tutorials online target 8.x or earlier. Watch for these changes:

- `IndexSearcher.doc(int)` and `IndexReader.document(int)` were removed in Lucene 10. Get a `StoredFields` instance from `searcher.storedFields()` and call `document(docId)` on it. Use that instance only on the thread that created it.
- `TotalHits` is a record in Lucene 10, so you read it with `totalHits.value()` instead of `totalHits.value`. The count can also be a lower bound rather than an exact number. Check `totalHits.relation()` before showing "N results".
- `RAMDirectory` was removed. Use `ByteBuffersDirectory` instead.
- Lucene fully supports indexes from the current and previous major version only. An index written by 8.x needs to be rebuilt before you can use it with Lucene 10.

## When not to use Lucene directly

If you need replication, sharding across machines, a REST API or dashboards, use Elasticsearch, OpenSearch or Solr instead of building those features yourself on raw Lucene. Lucene on its own fits best when you want search embedded in a single JVM process, such as a desktop app, a CLI tool or a service with a local index.

## Further reading

- [Lucene downloads and release notes](https://lucene.apache.org/core/downloads.html)
- [Lucene 10 migration guide](https://lucene.apache.org/core/10_0_0/MIGRATE.html)
- [`IndexSearcher` Javadoc](https://lucene.apache.org/core/10_5_0/core/org/apache/lucene/search/IndexSearcher.html)
