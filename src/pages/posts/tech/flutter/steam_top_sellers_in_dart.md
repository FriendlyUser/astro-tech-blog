---
tags: ['bs4', 'dart', 'alfred']
title: Scrapping the steam top sellers with dart
description: Adding an endpoint on a dart backend to get the top sellers from steam
pubDate: Fri, 28 Feburary 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/986397498.png"
---

Web scraping is a technique used to extract data from websites, with the help of a software program. This process involves sending HTTP requests to the URL of a website and then parsing the HTML response to extract data from it. The data that can be scraped from websites includes text, images, videos, and links to other pages. The extracted data can be saved to a local file or a database, or it can be used to perform further analysis and processing.

Web scraping is commonly used for a variety of purposes, including data mining, data analysis, price comparison, sentiment analysis, and much more. It's an efficient and automated way to collect information from websites, and it can save a significant amount of time compared to manual data collection.

However, it's important to note that web scraping can be unethical if it is performed without the consent of the website owner or if it violates the website's terms of service. Additionally, some websites may have protections in place to prevent web scraping, such as CAPTCHAs or rate limiting, so it's important to respect the rules of the websites you scrape.


```dart 
 
Future<List<SteamTopSeller>> findTopSteamSellers() async {
  var url = Uri.https('store.steampowered.com', 'search/?filter=topsellers');
  var html = await http.get(url);
  return parseSteamTopSellers(html.body);
}

List<SteamTopSeller> parseSteamTopSellers(String rawHTML ) {
  BeautifulSoup  soup = BeautifulSoup(rawHTML);
  var searchResultsDiv = soup.find('div', attrs: {'id': 'search_resultsRows'});
  if (searchResultsDiv == null) {
    return <SteamTopSeller>[];
  }
  var topSellers = searchResultsDiv.findAll('a');

  if (topSellers.isEmpty) {
    return <SteamTopSeller>[];
  }
  var topSellersList = <SteamTopSeller>[];
  for (var topSeller in topSellers) {
    var imageDiv = topSeller.find('img');
    String? imageSrc = '';
    if (imageDiv != null) {
      imageSrc = imageDiv.attributes['src'];
    }
    var title = topSeller.find('span', attrs: {'class': 'title'})?.text;
    var publishDate = topSeller.find('div', attrs: {'class': 'col search_released responsive_secondrow'})?.text;
    // var publishDate = topSeller.find('div', attrs: {'class': 'tab_item_top_tags'}).text;
    // get data-price-final
    var price = topSeller.find('div', attrs: {'class': 'search_price_discount_combined'})?.attributes['data-price-final'];
    var discountDiv = topSeller.find('div', attrs: {'class': 'search_discount'});
    String discount = "";
    if (discountDiv != null) {
      var discountSpan = discountDiv.find("span");
      if (discountSpan != null) {
        discount = discountSpan.text;
      }
    }
    topSellersList.add(SteamTopSeller(imageSrc, title, price, publishDate, discount));
  }

  return topSellersList; 
 ```

This code is a function in Dart that performs web scraping. It uses the `http` library to make a GET request to the Steam store's top sellers page and retrieve its HTML content. Then it uses the `BeautifulSoup` library to parse the HTML and extract information about the top-selling games on Steam.

The `parseSteamTopSellers` function takes the raw HTML as a string as an argument, and uses the `BeautifulSoup` library to create a soup object. It then searches the HTML for the `div` element with an `id` of `search_resultsRows`, which contains the information about the top-selling games. If this `div` element is not found, the function returns an empty list.

Next, the code finds all the `a` elements within the `div` element, which correspond to individual games. For each game, the code extracts information such as the image source, title, publication date, price, and discount. It creates a `SteamTopSeller` object with this information and adds it to a list. Finally, the function returns this list of `SteamTopSeller` objects.


```dart 
 class SteamTopSeller {
  String? imageSrc;
  String? title;
  String? price;
  String? publishDate;
  String? discount;


  SteamTopSeller(this.imageSrc, this.title, this.price, this.publishDate, this.discount);

  fromJson(Map<String, dynamic> json) {
    this.imageSrc = json['imageSrc'];
    this.title = json['title'];
    this.price = json['price'];
    this.publishDate = json['publishDate'];
    this.discount = json['discount'];
  }

  Map<String, dynamic> toJson() {
    return {
      'imageSrc': this.imageSrc,
      'title': this.title,
      'price': this.price,
      'publishDate': this.publishDate,
      'discount': this.discount,
    };
  }
}
 
 ```

This is a class definition for the `SteamTopSeller` object in Dart. It contains fields for the image source, title, price, publication date, and discount of a top-selling game on the Steam store.

The class has a constructor that takes these fields as arguments and sets them to the instance's fields. It also has a `fromJson` method that creates a `SteamTopSeller` object from a JSON map and a `toJson` method that returns a JSON map representation of the object. These methods can be used for serializing and deserializing the `SteamTopSeller` object to and from JSON data, respectively.

For alfred classes, we require a `fromJson` and `toJson` method to be defined. This is because the `alfred` library uses the method  serialize and deserialize objects to and from JSON data. The `alfred` package requires that a `fromJson` and `toJson` method be defined for each class that needs to be serialized and deserialized.


```dart 
 // load sample.html and run findTopSteamSellers, expect list of top steam sellers
import 'dart:io';
import 'package:test/test.dart';
import "package:dart_off_server/core.dart" as core;
import "package:path/path.dart" as p;

void main() {
  test('calculate', () {
      var rawHTMLPath = p.join(p.current, 'test', 'sample.html');
      // load rawHTML from rawHTMLPath
      File file = File(rawHTMLPath);
      var rawHTML = file.readAsStringSync();
      var steamSellers = core.parseSteamTopSellers(rawHTML);
      // greater than 5
      expect(steamSellers.length, greaterThan(5));
  });
}
 
 ```

This is a test case for the `parseSteamTopSellers` function, which is defined in the `core.dart` file. The test case is written using the `test` function from the `test` package.

The test case starts by loading the sample HTML file, `sample.html`, into a string, `rawHTML`, using the `readAsStringSync` method of the `File` class. The `rawHTML` string is then passed to the `parseSteamTopSellers` function, which returns a list of `SteamTopSeller` objects.

The test case then uses the `expect` function to check that the length of the list of top sellers is greater than 5. This is just a simple example to verify that the `parseSteamTopSellers` function is correctly parsing the HTML and returning a list of `SteamTopSeller` objects. In a real scenario, you might want to write more tests to check the contents of the list, as well as edge cases where the HTML is not in the expected format.



## References
- https://friendlyuser.github.io/posts/tech/flutter/alfred_backend_with_open_food_facts_api/
- https://huggingface.co/spaces/FriendlyUser/dart_off_server/tree/main
