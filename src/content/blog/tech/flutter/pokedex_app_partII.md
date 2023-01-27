---
title: Implementing basic pokedex part I
description: Pokemon app using flutter
pubDate: Monday, 7 July 2023 13:00:00 GMT
tags: ["flutter", "pokeapi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/music_album.jpg'
---


This is a StatefulWidget class in the Flutter framework. It appears to define a screen for displaying details about a Pokémon. The widget takes an integer pokemonId as a parameter in its constructor, which is used to look up information about the Pokémon from an API. The createState() method returns an instance of a corresponding _PokemonDetailsScreenState class, which is the State associated with this widget.

```dart
import 'package:flutter/material.dart';
import 'package:pokedex/core/api/poke_api.dart';

import '../components/pokemon_description.dart';
import '../components/pokemon_metric.dart';
import '../components/pokemon_stats.dart';
import '../components/pokemon_type.dart';
import '../components/pokemon_types.dart';
import '../components/pokemon_header.dart';
import '../core/utils/color_constant.dart';
import '../core/utils/get_data.dart';
import '../core/utils/image_constant.dart';
import '../core/utils/logger.dart';
import '../core/utils/poke_classes.dart';
import '../core/utils/type_to_color.dart';
import '../theme/app_decoration.dart';
import '../theme/size_utils.dart';

class PokemonDetailsScreen extends StatefulWidget {
  int pokemonId;

  PokemonDetailsScreen({Key? key, required this.pokemonId}) : super(key: key);
  // pokemon id param
  @override
  _PokemonDetailsScreenState createState() => _PokemonDetailsScreenState();
}
```


```dart


class _PokemonDetailsScreenState extends State<PokemonDetailsScreen> {
  late Pokemon pokemon;
  bool isLoading = false;
  bool isLoadingDetails = false;
  bool isLoadingSpecies = false;
  PokemonDetails? pokemonDetails;
  PokemonSpecies? pokemonSpecies;

  void getSpecies(String url) {
    isLoadingSpecies = true;
    try {
      fetchPokemonSpecies(url).then((resultat) {
        // pokemonDetails = resultat;
        pokemonSpecies = resultat;
        setState(() {
          isLoadingSpecies = false;
        });
      }).catchError((error) {
        Logger.log(error);
        setState(() {
          isLoadingSpecies = false;
        });
      });
    } catch (error) {
      Logger.log(error);
      setState(() {
        isLoadingSpecies = false;
      });
    };
  }

  @override
  void initState() {
    super.initState();
    // reading from json file
    isLoading = true;
    isLoadingDetails = true;
    readJson().then((resultat) {
      // use setState to update pokemon
      pokemon = resultat[widget.pokemonId - 1];
      setState(() {
        isLoading = false;
      });
    }).catchError((error) {
      Logger.log(error);
      setState(() {
        isLoading = false;
      });
    });
    // LOADING SECOND DATA
    fetchPokemonDetails(widget.pokemonId.toString()).then((resultat) {
      // pokemonDetails = resultat;
      pokemonDetails = resultat;
      setState(() {
        isLoadingDetails = false;
      });
      // get species url
      var speciesUrl = pokemonDetails?.species?.url;
      if (speciesUrl != null) {
        getSpecies(speciesUrl);
      }
    }).catchError((error) {
      Logger.log(error);
      setState(() {
        isLoadingDetails = false;
      });
    });
  }
```

This is the _PokemonDetailsScreenState class, which extends State and is associated with the PokemonDetailsScreen widget. It appears to be responsible for loading data about a Pokémon and its details and species from an API, and for displaying this data to the user.

The _PokemonDetailsScreenState class has several variables to store data about the Pokémon, including pokemon, pokemonDetails, and pokemonSpecies, as well as variables to track the loading status of this data.

The initState() method is a lifecycle method in Flutter that is called when the state associated with a StatefulWidget is first created. In this method, the _PokemonDetailsScreenState class is loading data about the Pokémon by calling the readJson() and fetchPokemonDetails() functions, which appear to read data from a JSON file and make an HTTP request to an API, respectively. When this data has been loaded, the setState() method is called to update the state of the widget and trigger a rebuild of the widget's user interface.


```dart

  Widget buildAbilities() {
    var bgColor = getBgColor();
    // parse metrics from pokeomnDetails
    // get all abilities
    var abilities = pokemonDetails?.abilities ?? [];
    if (isLoadingDetails == true) {
      return CircularProgressIndicator(color: bgColor);
    }
    // if no abilities, return empty container
    if (abilities.isEmpty) {
      return Container();
    }
    // map over abilities and make list of widgets
    var widgets = abilities.map((e) {
      var ability = e.ability!.name!;
      return PokemonAbility(
        ability: ability,
        bgColor: bgColor,
      );
    }).toList();
    return Column(children: widgets);
  }

  Widget buildDescription() {
    var bgColor = getBgColor();
     if (isLoadingSpecies == true) {
      return CircularProgressIndicator(color: bgColor);
    }
    if (pokemonSpecies == null) {
      return Container();
    }
    if (pokemonSpecies?.flavorTextEntries == null) {
      return Container();
    }
    if (pokemonSpecies?.flavorTextEntries?.isEmpty == true) {
      return Container();
    }
    var description = pokemonSpecies?.flavorTextEntries?[0]?.flavorText;
    // safe render, remove special characters
    description ??= " ";
    // return description
    return Container(
      width: MediaQuery.of(context).size.width,
      height: 100,
      child: PokemonDescription(
        description: description,
      )
    );
  }
```

These are two helper functions in the _PokemonDetailsScreenState class: buildAbilities() and buildDescription().

The buildAbilities() function appears to build a list of widgets representing the abilities of a Pokémon. It first gets the list of abilities from the pokemonDetails variable. If this variable is null or the list of abilities is empty, the function returns an empty Container widget. If the list of abilities is not empty, the function maps over the list of abilities and creates a list of PokemonAbility widgets, which are passed the name of the ability and a background color. This list of widgets is then returned wrapped in a Column widget.

The buildDescription() function appears to build a widget displaying a description of a Pokémon. It first gets the description from the pokemonSpecies variable. If this variable is null, or if the flavorTextEntries field of the pokemonSpecies variable is null or empty, the function returns an empty Container widget. If the description is not null, the function creates and returns a PokemonDescription widget, which is passed the description.


```dart

  Widget buildMetrics() {
    // if isLoadingDetails is true, return loaded
    var bgColor = getBgColor();
    if (pokemonDetails == null) {
      return CircularProgressIndicator(color: bgColor);
    }
    // parse metrics from pokeomnDetails
    var weight = pokemonDetails?.weight;
    var height = pokemonDetails?.height;
    if (isLoadingDetails == true || weight == null || height == null) {
      return CircularProgressIndicator(color: bgColor);
    }
    String weightString = "";
    String heightString = "";
    // hectograms to kg
    try {
      weightString = "${(weight * 0.1).toStringAsPrecision(1)} kg";
      heightString = "${(height * 0.1).toStringAsPrecision(1)} m";
    } catch (e) {
      Logger.log(e);
    }
    return Row(
      // space between metrics
      children: [
        PokemonMetric(
          text: "weight",
          label: weightString,
          icon: ImageConstant.imgMusic,
        ),
        PokemonMetric(
          text: "height",
          label: heightString,
          icon: ImageConstant.imgFrame,
        ),
      ],
    );
  }

  Widget buildChart() {
    var bgColor = getBgColor();
    if (isLoadingDetails == true) {
      return CircularProgressIndicator(color: bgColor);
    }
    if (pokemonDetails == null) {
      return Container();
    }
    if (pokemonDetails?.stats == null) {
      return Container();
    }
    var stats = pokemonDetails?.stats!;
    // get all stats
    if (stats != null && stats.isEmpty) {
      return Container();
    }
    // map over stats and make seriesList
    var seriesList = stats?.map((e) {
      var name = e.stat!.name!;
      var baseStat = e!.baseStat!;
      return PokemonBaseStat(
        name,
        baseStat,
      );
    }).toList();

    // make sure seriesList is not null
    if (seriesList == null) {
      return Container();
    }


    // make series from stats
    return Column(
      children: [
        const Text("Base Stats"),
        BarChartWidget(points: seriesList, bgColor: bgColor)
      ]
    );
  }

  Color getBgColor() {
    var bgColor = ColorConstant.whiteA700;
    // make sure pokemon is not null
    // make sure pokemon type is set
    if (isLoading == false) {
      // esnure pokemon is not null
      if (pokemon == null) {
        return bgColor;
      }
      if (pokemon.pokemonV2Pokemontypes == null) {
        return bgColor;
      }
      if (pokemon.pokemonV2Pokemontypes!.isEmpty) {
        return bgColor;
      }
      var typeName = pokemon.pokemonV2Pokemontypes![0].pokemonV2Type!.name!;
      var colors = getColorsFromType(typeName);
      // update br color
      bgColor = colors[1].color!;
    }
    return bgColor;
  }

```

These are several more helper functions in the _PokemonDetailsScreenState class: buildMetrics(), buildChart(), and getBgColor().

The buildMetrics() function appears to build a widget displaying the weight and height of a Pokémon. It first gets the weight and height from the pokemonDetails variable. If this variable is null or the weight or height fields are null, the function returns a CircularProgressIndicator widget to indicate that data is still being loaded. If the weight and height fields are not null, the function converts the values from hectograms to kilograms and meters, respectively, and creates and returns a Row widget containing two PokemonMetric widgets, which are passed the name of the metric (e.g. "weight"), the value of the metric as a string, and an icon.

The buildChart() function appears to build a bar chart widget displaying the base stats of a Pokémon. It first gets the list of stats from the pokemonDetails variable. If this variable is null or the stats field is null or empty, the function returns an empty Container widget. If the list of stats is not empty, the function maps over the list of stats and creates a list of PokemonBaseStat objects, which are passed the name of the stat and its base value. This list of objects is then passed to a BarChartWidget along with a background color, and the resulting widget is returned wrapped in a Column widget.

The getBgColor() function appears to get the background color for the widget based on the type of the Pokémon. It first gets the list of types for the Pokémon from the pokemon variable. If this variable is null or the list of types is null or empty, the function returns a default background color. If the list of types is not empty, the function gets the name of the first type in the list and calls the getColorsFromType() function to get a list of colors associated with that type. The function then returns the second color in the list as the background color.

```dart
@override
Widget build(BuildContext context) {
  // print pokemon id
  // get color from type
  var bgColor = getBgColor();
  return SafeArea(
      child: Scaffold(
          backgroundColor: bgColor,
          body: isLoading
              ? Center(
                  child: CircularProgressIndicator(),
                )
              : Container(
                  width: MediaQuery.of(context).size.width * 1,
                  height: MediaQuery.of(context).size.height * 1,
                  child: Column(children: [
                    PokemonHeader(
                      pokemon: pokemon,
                    ),
                    Flexible(
                        child: Container(
                            margin: getMargin(
                              bottom: 4,
                            ),
                            padding: getPadding(
                              left: 20,
                              top: 20,
                              right: 20,
                              bottom: 2,
                            ),
                            decoration: AppDecoration.fillWhiteA700.copyWith(
                              borderRadius: BorderRadiusStyle.roundedBorder8,
                            ),
                            child: Container(
                                height:
                                    MediaQuery.of(context).size.height * 1,
                                width: MediaQuery.of(context).size.width * 1,
                                padding: getPadding(
                                  left: 10,
                                  top: 8,
                                  right: 10,
                                  bottom: 8,
                                ),
                                child: ListView(
                                  children: [
                                    buildDescription(),
                                    PokemonTypes(pokemon: pokemon),
                                    // add padding between types and metrics
                                    SizedBox(
                                      height: getVerticalSize(16),
                                    ),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceEvenly,
                                      children: [
                                        buildMetrics(),
                                        buildAbilities()
                                      ],
                                    ),
                                    buildChart(),
                                    SizedBox(
                                      height: getVerticalSize(64),
                                    ),
                                    
                                    // base stats, draw one chart with fl chart grab data dynamically
                                  ],
                                ),
                                )))
                  ]))));
}
```

This is the build() method of the _PokemonDetailsScreenState class, which is responsible for building the user interface for the PokemonDetailsScreen widget.

The build() method first gets the background color for the widget by calling the getBgColor() function. It then returns a Scaffold widget with a white background, which contains a Column widget as its body. The Column widget has a PokemonHeader widget as its first child, and a Flexible widget as its second child. The Flexible widget has a Container as its child, which in turn has a ListView widget as its child. The ListView widget has several children, including the buildDescription(), PokemonTypes, buildMetrics(), buildAbilities(), and buildChart() functions, which build widgets displaying the description, types, metrics, abilities, and base stats of the Pokémon, respectively.

To view the full app visit the GitHub repository.

* https://github.com/FriendlyUser/flutter_pokedex