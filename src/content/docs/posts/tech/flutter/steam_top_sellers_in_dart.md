---
tags: ['bs4', 'dart', 'alfred']
title: Scraping Steam's top sellers with Dart and beautiful_soup_dart
description: Fetch Steam's top sellers search page with the http package, parse it with beautiful_soup_dart, and serve the results from an Alfred endpoint.
pubDate: Fri, 28 Feburary 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/986397498.webp"
---

This adds a Steam top sellers endpoint to my Dart backend (the same [Alfred server](https://friendlyuser.github.io/posts/tech/flutter/alfred_backend_with_open_food_facts_api/) I used for the Open Food Facts API). The idea is simple: request Steam's search page filtered to top sellers, parse the HTML, and return a list of games as JSON.

Scraping only works as long as the page markup stays the same, and Steam has changed it before. Check the store's terms before running anything like this on a schedule, and keep the request rate low.

## Dependencies

```bash
dart pub add http beautiful_soup_dart alfred
```

Checked against http 1.6.0, beautiful_soup_dart 0.3.0 and alfred 1.1.3. Note that beautiful_soup_dart hasn't had a release since 2022; it still works, but if it breaks, the `html` package it is built on can do the same job with `querySelector`.

## Fetching and parsing the page

The results live in `div#search_resultsRows`, one `a.search_result_row` per game. Inside each row:

- `span.title` holds the name
- `div.search_released` holds the release date
- `div.search_price_discount_combined` has a `data-price-final` attribute with the final price in cents, in the currency of the region you request from
- `div.discount_pct` (only present on discounted games) holds text like `-20%`

```dart
import 'package:beautiful_soup_dart/beautiful_soup.dart';
import 'package:http/http.dart' as http;

Future<List<SteamTopSeller>> findTopSteamSellers() async {
  final url = Uri.https(
    'store.steampowered.com',
    '/search/',
    {'filter': 'topsellers'},
  );
  final response = await http.get(url);
  if (response.statusCode != 200) {
    throw http.ClientException(
        'Steam returned ${response.statusCode}', url);
  }
  return parseSteamTopSellers(response.body);
}

List<SteamTopSeller> parseSteamTopSellers(String rawHTML) {
  final soup = BeautifulSoup(rawHTML);
  final resultsDiv = soup.find('div', id: 'search_resultsRows');
  if (resultsDiv == null) {
    return <SteamTopSeller>[];
  }

  final topSellers = <SteamTopSeller>[];
  for (final row in resultsDiv.findAll('', selector: 'a.search_result_row')) {
    topSellers.add(SteamTopSeller(
      imageSrc: row.find('img')?.attributes['src'],
      title: row.find('', selector: 'span.title')?.text.trim(),
      publishDate: row.find('', selector: 'div.search_released')?.text.trim(),
      price: row
          .find('', selector: 'div.search_price_discount_combined')
          ?.attributes['data-price-final'],
      discount: row.find('', selector: 'div.discount_pct')?.text.trim() ?? '',
    ));
  }
  return topSellers;
}
```

Two details that are easy to get wrong:

- Build the query string with the third argument of `Uri.https`. Passing `'search/?filter=topsellers'` as the path percent-encodes the `?`, so Steam receives a different URL.
- Matching on the full `class` attribute (for example `attrs: {'class': 'col search_released responsive_secondrow'}`) breaks as soon as Steam adds or removes a class, which is exactly what happened to the original version of this code. CSS selectors on a single class name are more forgiving.

## The model class

```dart
class SteamTopSeller {
  final String? imageSrc;
  final String? title;
  final String? price;
  final String? publishDate;
  final String? discount;

  SteamTopSeller({
    this.imageSrc,
    this.title,
    this.price,
    this.publishDate,
    this.discount,
  });

  factory SteamTopSeller.fromJson(Map<String, dynamic> json) => SteamTopSeller(
        imageSrc: json['imageSrc'] as String?,
        title: json['title'] as String?,
        price: json['price'] as String?,
        publishDate: json['publishDate'] as String?,
        discount: json['discount'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'imageSrc': imageSrc,
        'title': title,
        'price': price,
        'publishDate': publishDate,
        'discount': discount,
      };
}
```

Alfred only needs `toJson`: when a route returns an object with a `toJson` (or `toJSON`) method, Alfred calls it and sends the result as JSON. Returning a list works too, because `jsonEncode` calls `toJson` on each item. `fromJson` isn't required by Alfred; it's there for clients (such as a Flutter app) that decode the response.

## The endpoint

```dart
import 'package:alfred/alfred.dart';

void main() async {
  final app = Alfred();
  app.get('/steam/topsellers', (req, res) => findTopSteamSellers());
  await app.listen(8080);
}
```

## Testing against a saved page

Hitting Steam in a unit test is slow and flaky, so save a copy of the search page to `test/sample.html` and test the parser against that:

```dart
import 'dart:io';

import 'package:dart_off_server/core.dart' as core;
import 'package:path/path.dart' as p;
import 'package:test/test.dart';

void main() {
  test('parses top sellers from a saved Steam page', () {
    final rawHTMLPath = p.join(p.current, 'test', 'sample.html');
    final rawHTML = File(rawHTMLPath).readAsStringSync();

    final steamSellers = core.parseSteamTopSellers(rawHTML);

    expect(steamSellers.length, greaterThan(5));
    expect(steamSellers.first.title, isNotEmpty);
  });
}
```

`path` and `test` need to be in `pubspec.yaml` (`dart pub add path` and `dart pub add dev:test`). A test against a saved file won't notice when Steam changes its markup, so it's worth also checking the live endpoint by hand now and then.

## References

- https://friendlyuser.github.io/posts/tech/flutter/alfred_backend_with_open_food_facts_api/
- https://huggingface.co/spaces/FriendlyUser/dart_off_server/tree/main
- [beautiful_soup_dart API docs](https://pub.dev/documentation/beautiful_soup_dart/latest/)
- [Alfred on pub.dev](https://pub.dev/packages/alfred)
