---
tags: ['alfred', 'dart', 'backend']
title: Wrapping the Open Food Facts API with an Alfred server in Dart
description: A small Dart backend built with Alfred that turns query-string parameters into an Open Food Facts product search and returns the results as JSON.
pubDate: Mon, 30 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/2421950579.webp'
---
This post follows on from my last post at https://friendlyuser.github.io/posts/tech/flutter/how_to_deploy_dart_to_hs.html. I'm reusing the same Dart backend to wrap the [Open Food Facts](https://world.openfoodfacts.org/data) API, a free, open database of food products with ingredients, allergens and nutrition data. The server uses [Alfred](https://pub.dev/packages/alfred) for HTTP and the official [openfoodfacts](https://pub.dev/packages/openfoodfacts) Dart package for the API calls.

I wanted a simple HTTP endpoint that takes query-string parameters, so I could search products from any client without pulling the full SDK into it.

## Building the search query

The `search` function maps query-string keys onto the package's search parameters: search terms, no additives, sort order, PNNS food group, page size, page number, and tag filters.

```dart
import 'package:openfoodfacts/openfoodfacts.dart';

Future<SearchResult> search(Map<String, String> query) {
  final parametersList = <Parameter>[];

  // ?terms=pizza,cheese
  final terms = query['terms'];
  if (terms != null && terms.isNotEmpty) {
    parametersList.add(SearchTerms(terms: terms.split(',')));
  }

  // ?withoutAdditives=true
  if (query['withoutAdditives'] == 'true') {
    parametersList.add(const WithoutAdditives());
  }

  // ?sort=POPULARITY (any SortOption name)
  final sort = query['sort'];
  if (sort != null && sort.isNotEmpty) {
    final option = SortOption.values.firstWhere(
      (e) => e.name == sort,
      orElse: () => SortOption.PRODUCT_NAME,
    );
    parametersList.add(SortBy(option: option));
  }

  // ?pnnsGroup2=PIZZA_PIES_AND_QUICHE (any PnnsGroup2 name)
  final pnnsGroup2 = query['pnnsGroup2'];
  if (pnnsGroup2 != null && pnnsGroup2.isNotEmpty) {
    final group = PnnsGroup2.values.firstWhere(
      (e) => e.name == pnnsGroup2,
      orElse: () => PnnsGroup2.PIZZA_PIES_AND_QUICHE,
    );
    parametersList.add(PnnsGroup2Filter(pnnsGroup2: group));
  }

  // ?size=20&page=2
  final size = int.tryParse(query['size'] ?? '');
  if (size != null) {
    parametersList.add(PageSize(size: size));
  }
  final page = int.tryParse(query['page'] ?? '');
  if (page != null) {
    parametersList.add(PageNumber(page: page));
  }

  // ?tags=CATEGORIES:pizzas,LABELS:organic (TagFilterType name : tag value)
  final rawTags = query['tags'];
  if (rawTags != null && rawTags.isNotEmpty) {
    for (final tag in rawTags.split(',')) {
      final separator = tag.indexOf(':');
      if (separator == -1) continue;
      final typeName = tag.substring(0, separator);
      final value = tag.substring(separator + 1);
      final type = TagFilterType.values.firstWhere(
        (e) => e.name == typeName,
        orElse: () => TagFilterType.CATEGORIES,
      );
      parametersList.add(TagFilter.fromType(tagFilterType: type, tagName: value));
    }
  }

  final configuration = ProductSearchQueryConfiguration(
    parametersList: parametersList,
    version: ProductQueryVersion.v3,
  );
  // Searching is read-only, so no user credentials are needed.
  return OpenFoodAPIClient.searchProducts(null, configuration);
}

void mkConfiguration() {
  OpenFoodAPIConfiguration.userAgent = UserAgent(
    name: 'dart_off_server',
    url: 'https://friendlyuser-dart-off-server.hf.space/',
  );
  OpenFoodAPIConfiguration.globalLanguages = <OpenFoodFactsLanguage>[
    OpenFoodFactsLanguage.ENGLISH,
  ];
  OpenFoodAPIConfiguration.globalCountry = OpenFoodFactsCountry.CANADA;
}
```

A few details:

- Enum values are matched with `.name`, so the query string uses the bare value (`POPULARITY`). The original version compared against `toString()`, which would have required `SortOption.POPULARITY` in the URL.
- `searchProducts` takes a nullable `User`. Passing `null` is cleaner than a user with empty credentials.
- `mkConfiguration` sets a User-Agent. Open Food Facts asks every app to identify itself so its requests aren't mistaken for abuse. It also sets English and Canada as the default language and country.

## Exposing it with Alfred

```dart
import 'package:alfred/alfred.dart';
import 'package:dart_off_server/core.dart' as openfood;

Future<void> main(List<String> arguments) async {
  openfood.mkConfiguration();

  final app = Alfred();

  app.get('/food/search', (req, res) async {
    try {
      final result = await openfood.search(req.uri.queryParameters);
      return result.toJson();
    } catch (error) {
      res.statusCode = 500;
      return {'error': error.toString()};
    }
  });

  await app.listen(3000);
}
```

Alfred serializes a returned `Map` as JSON, so the handler returns `SearchResult.toJson()` directly. The original version passed the raw exception object to `res.json`, which can't be JSON-encoded. This version sets a 500 status and returns the error message.

A request like `/food/search?terms=pizza&size=5` then returns the first five matching products.

## References
* https://friendlyuser-dart-off-server.hf.space/food/search?terms=%22Pizza%22
* https://huggingface.co/spaces/FriendlyUser/dart_off_server/tree/main
* [openfoodfacts on pub.dev](https://pub.dev/packages/openfoodfacts)
* [Alfred on pub.dev](https://pub.dev/packages/alfred)
