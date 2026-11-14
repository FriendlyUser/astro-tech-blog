---
title: "Building a Flutter Pokédex, part I: Figma, DhiWise and an infinite-scroll grid"
description: Starting a Flutter Pokédex from a Figma design and DhiWise-generated code, then building a lazily loading Pokémon grid and type-coloured cards.
pubDate: Saturday, 16 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["flutter", "pokeapi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-29 12.27.48 - ball cartoon on grass red white like pokeball.png'
---

To start the Pokédex app, I used Figma to get a good design and DhiWise to turn it into Flutter
boilerplate. Recreating a layout by hand takes a while, and the generated code gave me the theme,
text styles and sizing helpers up front, so I could spend my time on the list and data loading. You
can see those generated helpers (`AppStyle`, `AppDecoration`, `getVerticalSize`, `getMargin` and so
on) in the card code below.

DhiWise has since rebranded as [Rocket](https://www.rocket.new/), which still offers Figma-to-Flutter
import.

## The list view

The list screen loads every Pokémon from a local JSON file once, then shows them in a grid a page at
a time. When the user scrolls to the bottom, the next page is added.

```dart
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:pokedex/components/empty_card.dart';

import '../components/pokemon_card.dart';
import '../core/utils/get_data.dart';

class PokemonListView extends StatefulWidget {
  const PokemonListView({super.key});

  @override
  State<PokemonListView> createState() => _PokemonListViewState();
}

class _PokemonListViewState extends State<PokemonListView> {
  int pageCount = 1;
  late final ScrollController _scrollController;

  // every Pokémon from the JSON file
  List<Pokemon> allPokemonList = <Pokemon>[];
  // the ones currently shown in the grid
  List<Pokemon> pokemonList = <Pokemon>[];

  @override
  void initState() {
    super.initState();

    _scrollController = ScrollController(initialScrollOffset: 5.0)
      ..addListener(_scrollListener);

    // load the first page
    readJson().then((result) {
      if (!mounted) return;
      setState(() => allPokemonList = result);
      addItemIntoList(1);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (allPokemonList.isEmpty) {
      return EmptyCard();
    }

    // more columns on wider screens
    final width = MediaQuery.of(context).size.width;
    final columnCount = width < 600 ? 2 : (width < 900 ? 3 : 6);

    return Scaffold(
      appBar: AppBar(title: const Text('Pokemon List View')),
      body: GridView.count(
        controller: _scrollController,
        crossAxisCount: columnCount,
        mainAxisSpacing: 10.0,
        physics: const AlwaysScrollableScrollPhysics(),
        // extra bottom padding so the grid can always scroll far enough
        // to trigger the next page
        padding: const EdgeInsets.only(bottom: 500),
        children: pokemonList.map((pokemon) => PokemonCard(pokemon)).toList(),
      ),
    );
  }

  void _scrollListener() {
    if (_scrollController.offset >= _scrollController.position.maxScrollExtent &&
        !_scrollController.position.outOfRange &&
        pokemonList.length < allPokemonList.length) {
      pageCount++;
      addItemIntoList(pageCount);
    }
  }

  void addItemIntoList(int pageCount) {
    if (allPokemonList.isEmpty) {
      return;
    }
    // show more per page on wide (desktop) screens
    final perPage = MediaQuery.of(context).size.width > 900 ? 30 : 10;
    // sublist throws a RangeError if the end is past the list, so clamp it
    final end = min(perPage * pageCount, allPokemonList.length);
    setState(() {
      pokemonList = allPokemonList.sublist(0, end);
    });
  }
}
```

`readJson()` and the `Pokemon` model come from `core/utils/get_data.dart`. Until the JSON has
loaded, the screen shows an `EmptyCard` placeholder.

The scroll listener fires when the grid reaches its maximum scroll extent, bumps the page number and
re-slices `allPokemonList`. The large bottom padding is a workaround: without it, the first page can
fit on screen, the grid can't scroll, and the listener never fires. A `GridView.builder` that loads
more when it builds an item near the end of the list avoids that problem and only builds the
visible cards.

## The Pokémon card

Each card shows the Pokémon's image, number, name and type chips, coloured by its first type.
Tapping it opens the detail page with [go_router](https://pub.dev/packages/go_router).

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:pokedex/components/custom_image_view.dart';
import 'package:pokedex/components/touchable_opacity.dart';
import 'package:pokedex/theme/app_decoration.dart';
import 'package:pokedex/theme/size_utils.dart';

import '../core/utils/get_data.dart';
import '../core/utils/type_to_color.dart';
import '../theme/app_style.dart';

class PokemonCard extends StatelessWidget {
  const PokemonCard(this.pokemon, {super.key});

  final Pokemon pokemon;

  List<Widget> labelsForTypes(Pokemon mon) {
    final labels = <Widget>[];
    for (final type in mon.pokemonV2Pokemontypes!) {
      final typeName = type.pokemonV2Type!.name ?? '';
      // [0] is the main colour, [1] the secondary colour
      final colors = getColorsFromType(typeName);
      labels.add(Chip(
        padding: EdgeInsets.zero,
        backgroundColor: colors[0].color,
        label: Text(typeName,
            style: TextStyle(color: colors[1].color, fontSize: 12)),
      ));
    }
    return labels;
  }

  @override
  Widget build(BuildContext context) {
    final name = pokemon.name ?? '';
    final id = pokemon.id ?? 0;
    final imgSrc = pokemon.imgSrc ?? '';

    // larger images on desktop
    final double imgSize = MediaQuery.of(context).size.width > 900 ? 144 : 72;

    // colour the card by the Pokémon's first type
    final type = pokemon.pokemonV2Pokemontypes![0].pokemonV2Type!.name ?? '';
    final colors = getColorsFromType(type);
    final mainColor = colors[0];
    final secondaryColor = colors[1];

    return Container(
      decoration: mainColor.copyWith(
        borderRadius: BorderRadiusStyle.roundedBorder8,
      ),
      child: TouchableOpacity(
        onTap: () => context.go('/pokemon/$id'),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: getVerticalSize(83.00),
              width: getHorizontalSize(160.00),
              margin: getMargin(top: 4, right: 8),
              child: Stack(
                alignment: Alignment.bottomLeft,
                children: [
                  Align(
                    alignment: Alignment.topRight,
                    child: Row(children: [
                      ...labelsForTypes(pokemon),
                      Text(
                        '# $id',
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.left,
                        style: AppStyle.txtPoppinsRegular8Bluegray200
                            .copyWith(height: 1.50),
                      ),
                    ]),
                  ),
                  CustomImageView(
                    url: imgSrc,
                    height: getSize(imgSize),
                    width: getSize(imgSize),
                    alignment: Alignment.bottomCenter,
                  ),
                ],
              ),
            ),
            Container(
              width: getHorizontalSize(104.00),
              padding: getPadding(left: 30, top: 3, bottom: 3),
              decoration: secondaryColor,
              child: Text(
                name,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.left,
                style: AppStyle.txtPoppinsRegular10WhiteA700.copyWith(
                  height: 1.50,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

`getColorsFromType` maps a type name to a pair of `BoxDecoration`s: the main one colours the card
background and the type chips, the secondary one colours the name banner and chip text.
`TouchableOpacity` and `CustomImageView` are small components in the project (the latter loads the
sprite from its URL), and the sizing and style helpers come from the DhiWise-generated
`size_utils.dart`, `app_style.dart` and `app_decoration.dart`.

A few things I'd watch for:

- `pokemonV2Pokemontypes![0]` assumes every Pokémon has at least one type. That holds for real
  Pokémon data, but the `!` and `[0]` will throw if an entry in the JSON is missing them.
- A `Row` of chips plus the number can overflow on narrow cards for dual-type Pokémon; a `Wrap`
  handles that more gracefully.
- `context.go` builds the page stack from the route tree, so the detail page only gets a back button
  to the list if `/pokemon/:id` is nested under the list route. Otherwise use `context.push`.
