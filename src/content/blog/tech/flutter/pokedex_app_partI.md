---
title: Implementing basic pokedex part I
description: Pokemon app using flutter
pubDate: Saturday, 16 June 2023 13:00:00 GMT
tags: ["flutter", "pokeapi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-29 12.27.48 - ball cartoon on grass red white like pokeball.png'
---

In order to create a pokedex app, the first thing I did is use figma to get a good design and dhiwise to create boilerplate code.

Converting Figma designs to Flutter code can be important for a number of reasons:

It helps to bring designs to life: Figma is a design tool that is used to create high-fidelity mockups of user interfaces. By converting these designs to Flutter code, developers can create functional, interactive versions of the designs that can be tested and used in real-world applications.

It saves time: Manually recreating designs in code can be time-consuming, especially for complex layouts or designs with many elements. By using a tool to automatically generate code from Figma designs, developers can save time and focus on other aspects of development.

It helps to ensure accuracy: Automated code generation can help to reduce the risk of errors and inconsistencies in the implementation of designs. This can be especially useful for ensuring that designs are implemented consistently across different platforms or devices.

It facilitates collaboration: Figma is a popular design tool that is used by many designers and developers. By using a tool to convert Figma designs to Flutter code, designers and developers can work together more seamlessly, with designers able to focus on creating high-quality designs and developers able to focus on implementing them in code.

```dart
// simple list view with animation
import 'package:flutter/material.dart';
import 'package:pokedex/components/empty_card.dart';

import '../components/pokemon_card.dart';
import '../core/utils/get_data.dart';

class PokemonListView extends StatefulWidget {
  @override
  _PokemonListViewState createState() => _PokemonListViewState();
}

class _PokemonListViewState extends State<PokemonListView> {
  List dataList = <Pokemon>[];
  bool isLoading = false;
  int pageCount = 1;
  late ScrollController _scrollController;

  // all pokemone list
  List<Pokemon> allPokemonList = <Pokemon>[];
  // scroll view right now
  List<Pokemon> pokemonList = <Pokemon>[];

  @override
  void initState() {
    super.initState();

    ////LOADING FIRST  DATA
    _scrollController = ScrollController(initialScrollOffset: 5.0)
      ..addListener(_scrollListener);
    readJson().then((resultat) {
      setState(() => allPokemonList = (resultat));
      addItemIntoList(1);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}
```
This is a Flutter widget that displays a list of Pokémon cards in a grid layout. It uses a ScrollController to listen for scroll events on the list and loads more Pokémon cards as the user scrolls to the bottom of the list. The addItemIntoList method is called when the user scrolls to the bottom of the list and it adds more Pokémon cards to the list by slicing a portion of the allPokemonList and updating the pokemonList with the new slice. The widget also adjusts the number of columns in the grid based on the screen width of the device. The EmptyCard widget is displayed if the allPokemonList is empty.


```dart

  @override
  Widget build(BuildContext context) {
    var columnCount = 3;
    // if allPokemonList is empty then show empty card
    if (allPokemonList.isEmpty) {
      return EmptyCard();
    }
    // row count based on media query
    if (MediaQuery.of(context).size.width < 600) {
      columnCount = 2;
    } else if (MediaQuery.of(context).size.width < 900) {
      columnCount = 3;
    } else {
      columnCount = 6;
    }
    return Scaffold(
        appBar: AppBar(
          title: Text('Pokemon List View'),
        ),
        body: GridView.count(
          controller: _scrollController,
          scrollDirection: Axis.vertical,
          crossAxisCount: columnCount,
          mainAxisSpacing: 10.0,
          physics: const AlwaysScrollableScrollPhysics(),
          children: pokemonList.map((pokemon) {
            return PokemonCard(pokemon);
          }).toList(),
          // padding bottom
          padding: const EdgeInsets.only(bottom: 500),
        ));
  }

  //// ADDING THE SCROLL LISTINER
  _scrollListener() {
    if (_scrollController.offset >=
            _scrollController.position.maxScrollExtent &&
        !_scrollController.position.outOfRange) {
      setState(() {
        isLoading = true;

        if (isLoading) {

          pageCount = pageCount + 1;

          addItemIntoList(pageCount);
        }
      });
    }
  }

  ////ADDING DATA INTO ARRAYLIST
  void addItemIntoList(var pageCount) {

    // if allPokemonList is empty return
    if (allPokemonList.isEmpty) {
      return;
    }
    var numElements = 10;
    // add more for windows platform
    if (MediaQuery.of(context).size.width > 900) {
      numElements = 30;
    }
    // slice the list from get_data.dart file
    var list = allPokemonList.sublist(0, (numElements * pageCount) as int?);
    setState(() {
      pokemonList = list;
      isLoading = false;
    });
  }
```

This code highlights how to use the ScrollController to listen for scroll events on a list and load more Pokémon cards as the user scrolls to the bottom of the list. The addItemIntoList method is called when the user scrolls to the bottom of the list and it adds more Pokémon cards to the list by slicing a portion of the allPokemonList and updating the pokemonList with the new slice. The widget also adjusts the number of columns in the grid based on the screen width of the device. The EmptyCard widget is displayed if the allPokemonList is empty.


The PokemonCard widget is a stateless widget that displays a Pokémon card. It uses the Pokemon model to display the Pokémon name, image, and type. The Pokemon model is defined in the models/pokemon.dart file.

```dart
import 'package:flutter/material.dart';
import "package:pokedex/components/custom_image_view.dart";
import "package:pokedex/components/touchable_opacity.dart";
import "package:pokedex/theme/app_decoration.dart";
import "package:pokedex/theme/size_utils.dart";
import 'package:badges/badges.dart';
import 'package:go_router/go_router.dart';

import "../core/utils/get_data.dart";
import "../core/utils/image_constant.dart";
import "../core/utils/type_to_color.dart";
import "../theme/app_style.dart";

// ignore: must_be_immutable
class PokemonCard extends StatelessWidget {
  PokemonCard(this.pokemon);

  Pokemon pokemon;

  @override
  List<Widget> labelsForTypes(Pokemon mon) {
    List<Widget> labels = [];
    for (var type in mon.pokemonV2Pokemontypes!) {
      // map type to color
      var typeName = type.pokemonV2Type!.name ?? "";
      var colors = getColorsFromType(typeName);
      var mainColor = colors[0];
      var secondaryColor = colors[1];
      labels.add(Chip(
        padding: EdgeInsets.all(0),
        backgroundColor: mainColor.color,
        label: Text(typeName,
            style: TextStyle(color: secondaryColor.color, fontSize: 12)),
      ));
    }
    return labels;
  }

```

This is a Flutter widget that displays a card for a Pokémon. It takes in a Pokemon object as an argument and displays information about the Pokémon, such as its name, image, and type. The labelsForTypes method is used to generate a list of Chip widgets that display the types of the Pokémon. The Chip widgets use colors that are determined by the TypeToColor class and passed to the getColorsFromType method. The widget also makes use of the CustomImageView, TouchableOpacity, AppDecoration, SizeUtils, Badges, and GoRouter packages.


```dart

  @override
  Widget build(BuildContext context) {
    // get name from pokemon or default it to empty string
    String name = pokemon.name ?? "";
    // get id from pokemon or default it to 0
    int id = pokemon.id ?? 0;

    String imgSrc = pokemon.imgSrc ?? "";
    // scale images and text on desktop
    int fontSize = 12;
    double imgSize = 72;
    if (MediaQuery.of(context).size.width > 900) {
      fontSize = 24;
      imgSize = 144;
    }
    // get pokemon type
    String type = pokemon.pokemonV2Pokemontypes![0].pokemonV2Type!.name ?? "";
    // need to center image and boost text size
    // and boost font size
    // image size
    var colors = getColorsFromType(type);
    var mainColor = colors[0];
    var secondaryColor = colors[1];

    // swap based on pokemon type
    return Container(
      decoration: mainColor.copyWith(
        borderRadius: BorderRadiusStyle.roundedBorder8,
      ),
      child: TouchableOpacity(
        onTap: () {
          // navigate to pokemon detail page with pokemon id
          // go router

          // Navigator.pushNamed(context, "/pokemon/$id");
          // Navigator.pushNamed(context, "/pokemon/:id");
          context.go('/pokemon/$id');
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: getVerticalSize(
                83.00,
              ),
              width: getHorizontalSize(
                160.00,
              ),
              margin: getMargin(
                top: 4,
                right: 8,
              ),
              child: Stack(
                alignment: Alignment.bottomLeft,
                children: [
                  Align(
                    alignment: Alignment.topRight,
                    child: Row(children: [
                      ...labelsForTypes(pokemon),
                      Text(
                        "# " + id.toString(),
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.left,
                        style: AppStyle.txtPoppinsRegular8Bluegray200.copyWith(
                          height: 1.50,
                        ),
                      ),
                    ]),
                  ),
                  CustomImageView(
                    url: imgSrc,
                    height: getSize(
                      imgSize,
                    ),
                    width: getSize(
                      imgSize,
                    ),
                    alignment: Alignment.bottomCenter,
                  ),
                ],
              ),
            ),
            Container(
              width: getHorizontalSize(
                104.00,
              ),
              padding: getPadding(
                left: 30,
                top: 3,
                // right: 40,
                bottom: 3,
              ),
              decoration: secondaryColor,
              child: Text(
                name.toString(),
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.left,
                style: AppStyle.txtPoppinsRegular10WhiteA700.copyWith(
                  height: 1.50,
                  // bold
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
```

This is the build method for the PokemonCard widget. It defines the layout and visual appearance of the card. The method starts by extracting the name and id of the Pokémon from the pokemon object, as well as the source of the image to display. It then adjusts the font size and image size based on the width of the device. Next, it determines the type of the Pokémon and gets the colors to use for the card based on this type using the getColorsFromType method.

The method then returns a Container widget that has a border with rounded corners and a colored background determined by the main color. This Container has a child that is a TouchableOpacity widget, which makes the card tappable and navigates to the Pokémon detail page when tapped. The TouchableOpacity widget has a Column as its child, which contains two other widgets: a Container with the Pokémon image and a Container with the Pokémon name. The Pokémon image is displayed using a CustomImageView widget, which takes in the source of the image and displays it with a specified height and width. The Pokémon name is displayed in a Text widget inside a Container with a colored background determined by the secondary color. The Text widget uses the Pokémon name and a specified font style and size.