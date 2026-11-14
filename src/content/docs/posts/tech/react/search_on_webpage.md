---
tags: ['react', 'context', 'javascript', 'php']
title: "Five ways to add search to a website: Algolia, Fuse.js, Google, PHP and Pagefind"
description: Working examples of site search with Algolia, Fuse.js in React, Google Programmable Search, a PHP and MySQL query, and Pagefind for static sites.
pubDate: Fri, 15 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/481242631.webp
---

There are roughly three ways to add search to a site: send queries to a hosted service (Algolia, Google), search on your own server (a database query), or ship an index to the browser and search there (Fuse.js, Pagefind). Which one fits depends on how much content you have, whether it changes often, and whether you run a backend at all.

## Algolia

Algolia is a hosted search service. You push records to an index, then query it from the browser or your server. It handles typo tolerance, ranking and faceting, and it is paid beyond the free tier.

These examples use the v5 JavaScript client (`algoliasearch` 5.64.0 at the time of writing). Older tutorials that call `client.initIndex()` or `index.addObjects()` with callbacks are for v3/v4; those methods are gone in v5.

```bash
npm install algoliasearch
```

Index your data from a server or build script, using an API key with write access. Never ship that key to the browser.

```js
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch('APPLICATION_ID', 'ADMIN_API_KEY');

const products = [
  { objectID: '1', title: 'Product 1', description: 'This is the first product' },
  { objectID: '2', title: 'Product 2', description: 'This is the second product' },
  { objectID: '3', title: 'Product 3', description: 'This is the third product' },
];

await client.saveObjects({ indexName: 'products', objects: products, waitForTasks: true });
```

In the browser, use the lite client and a search-only API key:

```js
import { liteClient as algoliasearch } from 'algoliasearch/lite';

const searchClient = algoliasearch('APPLICATION_ID', 'SEARCH_ONLY_API_KEY');
const searchInput = document.querySelector('#search-input');

searchInput.addEventListener('input', async () => {
  const { results } = await searchClient.search({
    requests: [{ indexName: 'products', query: searchInput.value }],
  });
  console.log(results[0].hits);
});
```

For a full UI (search box, hits, facets, pagination), Algolia's InstantSearch libraries build on this client.

## Fuse.js in React

Fuse.js is a fuzzy-search library that runs entirely in the browser. It suits a few hundred to a few thousand items that you already have in memory, such as a product list or a JSON file of blog posts. There is no server or index to maintain.

```bash
npm install fuse.js
```

```jsx
import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';

const Search = ({ data }) => {
  const [query, setQuery] = useState('');

  // Build the Fuse index once per data set, not on every keystroke.
  const fuse = useMemo(
    () => new Fuse(data, { keys: ['title', 'author.name'] }),
    [data],
  );

  const results = query ? fuse.search(query) : [];

  return (
    <div>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {results.map(({ item }) => (
          <li key={item.id}>
            {item.title} by {item.author.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Search;
```

`data` here is an array of books like `{ id, title, author: { name } }`. Note that `fuse.search()` returns wrapper objects of the form `{ item, refIndex }`, not the original records, so you read the record from `result.item`. Options such as `threshold` control how fuzzy the match is.

## Google Programmable Search Engine

Google's Programmable Search Engine (formerly Custom Search Engine) gives you a search box and results page backed by Google's index of your site. Create an engine in the [control panel](https://programmablesearchengine.google.com/), add your domain under "Sites to search", and copy the engine ID (`cx`). Then paste the snippet Google gives you:

```html
<script async src="https://cse.google.com/cse.js?cx=YOUR_SEARCH_ENGINE_ID"></script>
<div class="gcse-search"></div>
```

The results only include pages Google has crawled, so new pages can take a while to appear, and the free edition shows ads.

As of January 2026, Google requires new engines to use "Sites to search" (no more "Search the entire web"), and existing engines must move off whole-web search by January 1, 2027. Searching your own site is still supported.

## PHP and MySQL

If your content already lives in a database and you run PHP, a SQL query is the simplest option. The search form:

```html
<form action="search.php" method="get">
  <input type="text" name="query" placeholder="Search...">
  <button type="submit">Search</button>
</form>
```

And `search.php`, using PDO with a prepared statement so the query can't inject SQL, and `htmlspecialchars` so results can't inject HTML:

```php
<?php
$query = trim($_GET['query'] ?? '');

if ($query !== '') {
    $pdo = new PDO('mysql:host=localhost;dbname=database;charset=utf8mb4', 'username', 'password', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $stmt = $pdo->prepare(
        'SELECT title, description, url FROM articles WHERE title LIKE :q1 OR content LIKE :q2'
    );
    $like = '%' . $query . '%';
    $stmt->execute(['q1' => $like, 'q2' => $like]);

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $title = htmlspecialchars($row['title']);
        $description = htmlspecialchars($row['description']);
        $url = htmlspecialchars($row['url']);
        echo "<div class='result'><h3>{$title}</h3><p>{$description}</p><a href='{$url}'>Read more</a></div>";
    }
}
```

`LIKE '%term%'` can't use an index, so it scans the whole table and has no relevance ranking. That is fine for a small site. For more content, add a `FULLTEXT` index and use `MATCH ... AGAINST`, or move to a dedicated search engine.

## Pagefind for static sites

[Pagefind](https://pagefind.app/) indexes the HTML your static site generator produces and serves the index as static files, so there's no server or third-party service. The browser downloads only the index chunks a query needs. Starlight, the framework this blog runs on, uses Pagefind for its built-in search.

Because it indexes built output, run it after your build. It won't find anything in a dev server that hasn't been built and indexed.

```bash
npx pagefind --site dist
```

Replace `dist` with your build output folder. This writes a `pagefind/` directory into it.

To add the prebuilt search UI (the Component UI, added in Pagefind 1.5.0):

```html
<link href="/pagefind/pagefind-component-ui.css" rel="stylesheet">
<script src="/pagefind/pagefind-component-ui.js" type="module"></script>

<pagefind-modal-trigger></pagefind-modal-trigger>
<pagefind-modal></pagefind-modal>
```

On older Pagefind versions, use the Default UI instead: load `/pagefind/pagefind-ui.css` and `/pagefind/pagefind-ui.js`, then call `new PagefindUI({ element: '#search' })`.

To build your own UI, use the JavaScript API. Each result loads its data separately, so you only fetch what you display:

```js
const pagefind = await import('/pagefind/pagefind.js');

const search = await pagefind.search('static');
const results = await Promise.all(search.results.slice(0, 10).map((r) => r.data()));

for (const result of results) {
  console.log(result.url, result.meta.title, result.excerpt);
}
```

## Which one to pick

- Static site and no backend: Pagefind.
- A small data set already loaded in a React app: Fuse.js.
- A large or frequently changing catalogue where ranking and facets matter, and you can pay for it: Algolia.
- An existing PHP/MySQL site: a prepared SQL query, moving to `FULLTEXT` as it grows.
- No build step or code at all: Google Programmable Search, if you accept its ads and crawl delay.
