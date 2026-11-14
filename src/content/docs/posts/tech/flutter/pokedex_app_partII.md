---
title: "Building a Flutter Pokédex, part II: the Pokémon details screen"
description: "The details screen of my Flutter Pokédex: loading a Pokémon from bundled JSON and PokeAPI, then showing its description, abilities, size and a base-stat chart."
pubDate: Monday, 7 July 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["flutter", "pokeapi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/music-album.webp'
---

[Part I](/posts/tech/flutter/pokedex_app_partI/) built the list view. This post covers the screen you land on after tapping a Pokémon. It combines two data sources:

- the bundled `clean_pokemon.json` asset (name, ID, types, image), produced by the [scraping script](/posts/tech/flutter/scrapping_data_for_pokedex/)
- PokeAPI's REST endpoints `/pokemon/{id}` (abilities, height, weight, base stats) and `/pokemon-species/{id}` (the Pokédex description)

The code below is from the [flutter_pokedex repo](https://github.com/FriendlyUser/flutter_pokedex), cleaned up while revising this post. The original version had a few bugs, which are noted where they were fixed. Helpers such as `getMargin`, `ColorConstant` and `AppDecoration` come from the DhiWise boilerplate described in part I.

## The widget

The screen takes the Pokémon's ID. Widget fields should be `final`, since Flutter rebuilds widgets rather than mutating them:

```dart
import 'package:flutter/material.dart';
import 'package:pokedex/core/api/poke_api.dart';

import '../components/pokemon_description.dart';
import '../components/pokemon_header.dart';
import '../components/pokemon_metric.dart';
import '../components/pokemon_stats.dart';
import '../components/pokemon_type.dart';
import '../components/pokemon_types.dart';
import '../core/utils/color_constant.dart';
import '../core/utils/get_data.dart';
import '../core/utils/image_constant.dart';
import '../core/utils/logger.dart';
import '../core/utils/poke_classes.dart';
import '../core/utils/type_to_color.dart';
import '../theme/app_decoration.dart';
import '../theme/size_utils.dart';

class PokemonDetailsScreen extends StatefulWidget {
  const PokemonDetailsScreen({super.key, required this.pokemonId});

  final int pokemonId;

  @override
  State<PokemonDetailsScreen> createState() => _PokemonDetailsScreenState();
}
```

## Loading the data

The state loads three things. The local Pokémon entry and the `/pokemon/{id}` details are fetched in parallel. The species request has to wait for the details, because its URL comes from the details response. Each source has its own loading flag, so each part of the screen can show a spinner until its data arrives.

```dart
class _PokemonDetailsScreenState extends State<PokemonDetailsScreen> {
  Pokemon? pokemon;
  PokemonDetails? pokemonDetails;
  PokemonSpecies? pokemonSpecies;
  bool isLoading = true;
  bool isLoadingDetails = true;
  bool isLoadingSpecies = false;

  @override
  void initState() {
    super.initState();
    loadPokemon();
    loadDetails();
  }

  Future<void> loadPokemon() async {
    try {
      final pokemonList = await readJson();
      // Look up by ID: the bundled list has gaps where no image was found,
      // so pokemonList[pokemonId - 1] can return the wrong Pokémon.
      pokemon = pokemonList.firstWhere((p) => p.id == widget.pokemonId);
    } catch (error) {
      Logger.log(error);
    }
    if (!mounted) return;
    setState(() => isLoading = false);
  }

  Future<void> loadDetails() async {
    try {
      final details = await fetchPokemonDetails(widget.pokemonId.toString());
      if (!mounted) return;
      setState(() {
        pokemonDetails = details;
        isLoadingDetails = false;
      });
      final speciesUrl = details.species?.url;
      if (speciesUrl != null) {
        await loadSpecies(speciesUrl);
      }
    } catch (error) {
      Logger.log(error);
      if (!mounted) return;
      setState(() => isLoadingDetails = false);
    }
  }

  Future<void> loadSpecies(String url) async {
    setState(() => isLoadingSpecies = true);
    try {
      final species = await fetchPokemonSpecies(url);
      if (!mounted) return;
      setState(() {
        pokemonSpecies = species;
        isLoadingSpecies = false;
      });
    } catch (error) {
      Logger.log(error);
      if (!mounted) return;
      setState(() => isLoadingSpecies = false);
    }
  }
```

Fixes compared with the original:

- `pokemon` was declared `late Pokemon pokemon;` and then compared to `null`. A `late` field that was never assigned throws a `LateInitializationError` when read, so a failed JSON load crashed the screen. It's nullable now.
- The original wrapped `fetchPokemonSpecies(url).then(...)` in a `try`/`catch`. That `catch` never sees errors from the future; only `.catchError` or `await` inside a `try` does. Using `async`/`await` throughout removes the duplication.
- The `if (!mounted) return;` checks stop `setState` from being called after the user has left the screen, which Flutter reports as an error.

## Building the sections

Each section of the screen has its own builder. They return a spinner while their data loads and an empty box if there's nothing to show.

```dart
  Widget buildAbilities() {
    final bgColor = getBgColor();
    if (isLoadingDetails) {
      return CircularProgressIndicator(color: bgColor);
    }
    final abilities = pokemonDetails?.abilities ?? [];
    return Column(
      children: abilities
          .map((e) => PokemonAbility(ability: e.ability!.name!, bgColor: bgColor))
          .toList(),
    );
  }

  Widget buildDescription() {
    final bgColor = getBgColor();
    if (isLoadingSpecies) {
      return CircularProgressIndicator(color: bgColor);
    }
    // Flavor text entries come in many languages; pick English explicitly
    // instead of relying on the order.
    final entries = (pokemonSpecies?.flavorTextEntries ?? [])
        .where((e) => e.language?.name == 'en');
    if (entries.isEmpty) {
      return const SizedBox.shrink();
    }
    // The game text contains hard line breaks and form feeds (\f).
    final description =
        (entries.first.flavorText ?? '').replaceAll(RegExp(r'\s+'), ' ');
    return SizedBox(
      width: MediaQuery.of(context).size.width,
      height: 100,
      child: PokemonDescription(description: description),
    );
  }
```

PokeAPI reports weight in hectograms and height in decimetres, so both are multiplied by 0.1. The original used `toStringAsPrecision(1)`, which keeps one *significant* digit: Bulbasaur's 6.9 kg showed as "7 kg" and Snorlax's 460 kg as "5e+2 kg". `toStringAsFixed(1)` keeps one decimal place instead.

```dart
  Widget buildMetrics() {
    final bgColor = getBgColor();
    if (isLoadingDetails) {
      return CircularProgressIndicator(color: bgColor);
    }
    final weight = pokemonDetails?.weight;
    final height = pokemonDetails?.height;
    if (weight == null || height == null) {
      return const SizedBox.shrink();
    }
    return Row(
      children: [
        PokemonMetric(
          text: "weight",
          label: "${(weight * 0.1).toStringAsFixed(1)} kg",
          icon: ImageConstant.imgMusic,
        ),
        PokemonMetric(
          text: "height",
          label: "${(height * 0.1).toStringAsFixed(1)} m",
          icon: ImageConstant.imgFrame,
        ),
      ],
    );
  }

  Widget buildChart() {
    final bgColor = getBgColor();
    if (isLoadingDetails) {
      return CircularProgressIndicator(color: bgColor);
    }
    final stats = pokemonDetails?.stats ?? [];
    if (stats.isEmpty) {
      return const SizedBox.shrink();
    }
    final points =
        stats.map((e) => PokemonBaseStat(e.stat!.name!, e.baseStat!)).toList();
    return Column(
      children: [
        const Text("Base Stats"),
        BarChartWidget(points: points, bgColor: bgColor),
      ],
    );
  }

  Color getBgColor() {
    final types = pokemon?.pokemonV2Pokemontypes ?? [];
    final typeName = types.isEmpty ? null : types.first.pokemonV2Type?.name;
    if (typeName == null) {
      return ColorConstant.whiteA700;
    }
    // Use the second colour of the Pokémon's first type as the background.
    return getColorsFromType(typeName)[1].color!;
  }
```

`BarChartWidget` is a small wrapper around [fl_chart](https://pub.dev/packages/fl_chart)'s `BarChart`, with one bar per stat.

## The build method

The scaffold's background takes the type colour. The header (image and name) sits at the top, and a white rounded card below it holds a `ListView` with the description, types, metrics, abilities and stat chart.

```dart
  @override
  Widget build(BuildContext context) {
    final bgColor = getBgColor();
    final pokemon = this.pokemon;

    Widget body;
    if (isLoading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (pokemon == null) {
      body = const Center(child: Text("Could not load this Pokémon."));
    } else {
      body = Column(
        children: [
          PokemonHeader(pokemon: pokemon),
          Flexible(
            child: Container(
              margin: getMargin(bottom: 4),
              padding: getPadding(left: 20, top: 20, right: 20, bottom: 2),
              decoration: AppDecoration.fillWhiteA700.copyWith(
                borderRadius: BorderRadiusStyle.roundedBorder8,
              ),
              child: Padding(
                padding: getPadding(left: 10, top: 8, right: 10, bottom: 8),
                child: ListView(
                  children: [
                    buildDescription(),
                    PokemonTypes(pokemon: pokemon),
                    SizedBox(height: getVerticalSize(16)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [buildMetrics(), buildAbilities()],
                    ),
                    buildChart(),
                    SizedBox(height: getVerticalSize(64)),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    return SafeArea(
      child: Scaffold(backgroundColor: bgColor, body: body),
    );
  }
}
```

## Gotchas

- In the repo, `BarChartWidget` sets `maxY: 100`. Base stats go up to 255 (Blissey's HP), so tall bars get cut off. Setting `maxY` to 255, or to the highest stat in `points`, fixes it.
- The screen makes two PokeAPI requests every time it opens. PokeAPI's fair-use policy asks clients to cache responses, so if you build on this, cache the details and species responses locally.

The full app is on GitHub: [FriendlyUser/flutter_pokedex](https://github.com/FriendlyUser/flutter_pokedex).
