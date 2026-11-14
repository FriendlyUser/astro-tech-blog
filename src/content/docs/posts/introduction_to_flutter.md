---
title: "Getting started with Flutter: create and run your first app"
description: "What Flutter is, how its widget model works, and how to create, run and edit a first Flutter app with hot reload."
alt: Bintray Removed
layout: '@/templates/BasePost.astro'
pubDate: Wed, 23 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["flutter", "dart"]
imgSrc: '/assets/images/image-post.jpeg'
imgAlt: 'Image post 6'
---

Flutter is Google's open-source UI toolkit for building apps from one Dart codebase. The same code targets Android, iOS, the web, Windows, macOS and Linux. Instead of wrapping each platform's native UI controls, Flutter draws every pixel itself with its own rendering engine. You get the same layout on every platform, and the Material and Cupertino widget sets are there when you want a platform look.

The steps below were checked against Flutter 3.50, the current stable release.

## How a Flutter UI is built

Everything on screen is a widget, and you build the UI by nesting widgets. A `StatelessWidget` renders purely from its inputs. A `StatefulWidget` keeps a `State` object, and calling `setState` tells Flutter to call `build` again with the new values.

During development Flutter runs your Dart code in a JIT-compiled VM, which is what makes **hot reload** possible. Save a file and the running app picks up the change in about a second while keeping its current state. Release builds are compiled ahead of time to native machine code (or to JavaScript/WebAssembly for the web).

## Create and run an app

Install the SDK by following the [install guide](https://docs.flutter.dev/install) for your OS, then check that your toolchain (Android SDK, Xcode, Chrome, and so on) is set up:

```bash
flutter doctor
```

Create a project and run it:

```bash
flutter create my_app
cd my_app
flutter run
```

`flutter run` builds for a connected device, a running emulator or simulator, or a desktop or browser target. If more than one is available it asks which one to use, or you can pick with `-d`, for example `flutter run -d chrome`.

The generated app is the counter demo: a "Flutter Demo Home Page" app bar, the text "You have pushed the button this many times:", and a floating **+** button that increments the number.

## Edit the app

The code lives in `lib/main.dart`. Replace it with this smaller version to see the pieces:

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(home: CounterPage());
  }
}

class CounterPage extends StatefulWidget {
  const CounterPage({super.key});

  @override
  State<CounterPage> createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My first Flutter app')),
      body: Center(child: Text('Tapped $_count times')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => _count++),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

With `flutter run` still going, save the file and press `r` in the terminal (most editors hot reload on save). Tap the button a few times, then change the `Text` string and reload again: the label changes but the count stays, because hot reload keeps the widget state. Press `R` for a hot restart, which resets the state.

## Things to know early

- Hot reload doesn't re-run `main()`, `initState()`, or the initialisers of global variables and static fields. If a change doesn't show up, use hot restart.
- Changes to native code (Kotlin, Java, Swift, Objective-C), including adding a plugin that has some, need a full restart: stop the app and `flutter run` again.
- Flutter apps are larger than a minimal native app because they ship the engine with them.

## Further reading

- [Flutter documentation](https://docs.flutter.dev/)
- [Learning pathway](https://docs.flutter.dev/learn/pathway)
- [Hot reload](https://docs.flutter.dev/tools/hot-reload)
- [pub.dev](https://pub.dev/), the Dart and Flutter package registry
