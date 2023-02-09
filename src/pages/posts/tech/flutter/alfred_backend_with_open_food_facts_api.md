---
tags: ['alfred', 'dart', 'backend']
title: Alfred backend with openfoodfacts
description: Using alfred backend as a wrapper around the openfoodfacts api.
pubDate: Mon, 27 November 2023
layout: @/templates/BasePost.astro
imgSrc: '/imgs/2023/2421950579.png'
---
This post is related to my last post at https://friendlyuser.github.io/posts/tech/flutter/how_to_deploy_dart_to_hs.html. I will be using the same backend to create a wrapper around the openfoodfacts api. The openfoodfacts api is a free and open source api that provides information about food products. The api is available at https://world.openfoodfacts.org/data. The api is available in different languages and I will be using dart.
Food facts are important for a variety of reasons. First and foremost, they help us understand what we are eating and what nutrients our body is receiving. This information can be used to make informed decisions about our diets, which can impact our health and well-being.

Food facts also play a role in food labeling, which is regulated by government agencies to ensure that consumers have accurate information about the food they are purchasing. This can include information about ingredients, allergens, and calorie content. This helps consumers with specific dietary needs, such as food allergies or weight management, make informed choices.

In addition, food facts can be used to promote public health. For example, information about the sodium content of processed foods can be used to raise awareness about the risks of high sodium diets, and promote the consumption of healthier alternatives.

Overall, food facts are an important tool for empowering consumers to make informed decisions about their diets and for promoting public health.


```dart 
 import 'package:openfoodfacts/openfoodfacts.dart';

Future<SearchResult> search(Map<String, String> query) {
  var parametersList = <Parameter>[];
  // check for terms in query

  if (query.containsKey('terms')) {
    var terms = query['terms'];
    if (terms != null && terms.isNotEmpty) {
      parametersList.add(SearchTerms(terms: terms.split(',')));
    }
  }
  // check for withoutAddictives
  if (query.containsKey('withoutAdditives')) {
    var withoutAdditives = query['withoutAdditives'];
    if (withoutAdditives != null && withoutAdditives == "true") {
      parametersList.add(WithoutAdditives());
    }
  }

  if (query.containsKey('sort')) {
    var sort = query['sort'];
    if (sort != null && sort.isNotEmpty) {
      var option = SortOption.values.firstWhere(
          (e) => e.toString() == sort,
          orElse: () => SortOption.PRODUCT_NAME);
      parametersList.add(SortBy(option: option));
    }
  }

  if (query.containsKey('pnnsGroup2')) {
    // print('pnnsGroup2: ${query['pnnsGroup2']}');
    var pnnsGroup2 = query['pnnsGroup2'];
    if (pnnsGroup2 != null && pnnsGroup2.isNotEmpty) {
       var option = PnnsGroup2.values.firstWhere(
          (e) => e.toString() == pnnsGroup2,
          orElse: () => PnnsGroup2.PIZZA_PIES_AND_QUICHE);
      parametersList.add(PnnsGroup2Filter(pnnsGroup2: option));
    }
  }

  // page size
  if (query.containsKey('size')) {
    var size = query['size'];
    if (size != null && size.isNotEmpty) {
      parametersList.add(PageSize(size: int.parse(size)));
    }
  }

  // page number
  if (query.containsKey('page')) {
    var page = query['page'];
    if (page != null && page.isNotEmpty) {
      parametersList.add(PageNumber(page: int.parse(page)));
    }
  }

  // by tags
  if (query.containsKey('tags')) {
    var rawTags = query['tags'];
    if (rawTags != null && rawTags.isNotEmpty) {
      var tags = rawTags.split(',');
      // iterate over tags
      for (var tag in tags) {
        // check for tag with value
        // check tag
        if (tag.contains(':')) {
          var tagParts = tag.split(':');
          var tagName = tagParts[0];
          var tagValue = tagParts[1];
          var tagType = TagFilterType.values.firstWhere(
              (e) => e.toString() == tagName,
              orElse: () => TagFilterType.CATEGORIES);
          parametersList.add(TagFilter.fromType(tagFilterType: tagType, tagName: tagValue));
        }
      }
    }
  }

  ProductSearchQueryConfiguration configuration =
      ProductSearchQueryConfiguration(
    parametersList: parametersList,
    version: ProductQueryVersion.v3,
  );
  return OpenFoodAPIClient.searchProducts(
    User(userId: '', password: ''),
    configuration,
  );
}

void mkConfiguration() {
  OpenFoodAPIConfiguration.userAgent = UserAgent(
      name: 'dart_off_server',
      url: 'https://friendlyuser-dart-off-server.hf.space/');
  OpenFoodAPIConfiguration.globalLanguages = <OpenFoodFactsLanguage>[
    OpenFoodFactsLanguage.ENGLISH
  ];

  OpenFoodAPIConfiguration.globalCountry = OpenFoodFactsCountry.CANADA;
}
 
 ```

This code is written in Dart and makes use of the OpenFoodFacts API to search for food products. The code first checks for various parameters in the `query` map and adds the relevant filters to the `parametersList` array. These parameters include search terms, without additives, sort option, food category, page size and number, and tags.

The code then creates a `ProductSearchQueryConfiguration` object with the parameters in the `parametersList` and makes a call to the OpenFoodAPIClient's `searchProducts` method to search for products based on the configuration.

Finally, the code sets the `OpenFoodAPIConfiguration` user agent and global language and country.


 ```dart 
 import 'package:openfoodfacts/openfoodfacts.dart';
 import 'package:dart_off_server/core.dart' as openfood;
 void main(List<String> arguments) async  { 
  ...
  openfood.mkConfiguration();
  final app = Alfred();
  app.get('/food/search', (req, res) { 
    final query = req.uri.queryParameters;
    return openfood.search(query).then((value) { 
      res.json(value); }
    ).catchError((error) { 
      res.json(error); 
    }); 
});
``` 
This Dart code defines a REST API endpoint for searching food information.

The first line imports the openfoodfacts library, which is used for accessing food product information through the OpenFoodFacts API.

The second line imports the dart\_off\_server library and creates an alias "openfood".

In the main function, the configuration for the OpenFoodFacts API is set up by calling `openfood.mkConfiguration()`.

An instance of `Alfred` is then created and the API endpoint is defined with the line `app.get('/food/search', (req, res) { ... }`. The endpoint is listening for a GET request to the `/food/search` URL.

The `req.uri.queryParameters` object is used to extract the search parameters passed in the URL query string. The parameters are then passed to `openfood.search(query)` which performs the search.

The result of the search is returned as a JSON object to the client using `res.json(value)`. If an error occurs during the search, it is caught and returned as a JSON object using `res.json(error)`.


 ## References
* https://friendlyuser-dart-off-server.hf.space/food/search?terms=%22Pizza%22 * https://huggingface.co/spaces/FriendlyUser/dart_off_server/tree/main 
