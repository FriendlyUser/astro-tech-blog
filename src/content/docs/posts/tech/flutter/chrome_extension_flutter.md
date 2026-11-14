---
tags: ['chatgpt', 'flutter', 'dart']
title: Building a Chrome extension in Flutter to view my ChatGPT prompts
description: A Flutter web app packaged as a Manifest V3 Chrome extension popup that fetches a markdown file of ChatGPT prompts from GitHub and renders it.
pubDate: Fri, 7 July 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1028024527.webp
---
I keep my ChatGPT prompts in a markdown README on GitHub. Having them one click away in the browser toolbar is easier than opening the repo every time, so I built a small Chrome extension that fetches the README and renders it. The UI is a Flutter web app.

An earlier version of this post said you can't build a Chrome extension in Flutter. That's wrong. A Flutter web build is a set of static HTML, JS and asset files, and a Chrome extension popup is an HTML page, so you can package the build as an extension as long as it satisfies the extension's Content Security Policy.

## The app

```dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:http/http.dart' as http;

const promptsUrl =
    'https://raw.githubusercontent.com/FriendlyUser/chatgpt_prompts/main/README.md';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String _markdownData = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    fetchMarkdownData();

    // Refresh the prompts every 50 minutes while the page is open
    _timer = Timer.periodic(const Duration(minutes: 50), (_) {
      fetchMarkdownData();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> fetchMarkdownData() async {
    try {
      final response = await http.get(Uri.parse(promptsUrl));
      if (response.statusCode != 200 || !mounted) return;
      setState(() {
        _markdownData = response.body;
      });
    } catch (e) {
      debugPrint('Failed to fetch prompts: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('ChatGPT Prompt Viewer')),
        body: Markdown(
          data: _markdownData,
          selectable: true,
        ),
      ),
    );
  }
}
```

The app downloads the README with the `http` package and shows it in a scrollable, selectable `Markdown` widget, so I can highlight a prompt and copy it. The periodic timer refreshes the content and is cancelled in `dispose()`. The fetch ignores non-200 responses instead of rendering an error page as markdown.

When I first wrote this I used `flutter_markdown`. The Flutter team has since discontinued that package, and its pub.dev page points to [`flutter_markdown_plus`](https://pub.dev/packages/flutter_markdown_plus), which keeps the same `Markdown` widget API. Add both dependencies with:

```bash
flutter pub add flutter_markdown_plus http
```

## Turning the build into an extension

Replace `web/manifest.json` (the PWA manifest Flutter generates) with an extension manifest:

```json
{
  "name": "Chrome Extension ChatGpt Prompts",
  "description": "Making it easy to find my chat gpt prompts",
  "version": "1.0.0",
  "manifest_version": 3,
  "action": {
    "default_popup": "index.html",
    "default_icon": "icons/Icon-192.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  }
}
```

Chrome's default extension-page policy is `script-src 'self'; object-src 'self';`, which disables WebAssembly. Flutter's CanvasKit renderer is WebAssembly, so the manifest adds `'wasm-unsafe-eval'`. That's the most Manifest V3 allows.

Then build:

```bash
flutter build web --csp --no-web-resources-cdn
```

- `--csp` stops Flutter from generating code at runtime, which Manifest V3's default policy blocks.
- `--no-web-resources-cdn` bundles CanvasKit into the build instead of loading it from Google's CDN. Manifest V3 doesn't allow remotely hosted code.
- Older guides add `--web-renderer html`. The HTML renderer and that flag were removed from Flutter, so leave it out.

The fetch to `raw.githubusercontent.com` works without extra permissions because GitHub serves raw files with permissive CORS headers.

## Loading it in Chrome

1. Open `chrome://extensions/`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `build/web` folder.

The extension icon appears in the toolbar, and clicking it opens the popup. If Chrome reports manifest or CSP errors, they show on the extension's card on the same page.

## Gotchas

- A popup sizes itself to its content, and Flutter's canvas has no intrinsic size. Give the `<body>` in `web/index.html` an explicit width and height, or the popup may open tiny. Chrome caps popups at 800×600.
- The popup closes as soon as it loses focus, so the 50-minute refresh only matters if you open the app as a full tab (`chrome-extension://<id>/index.html`).
- Flutter web output is several megabytes, so it's heavy for a simple viewer. A plain HTML page with a JS markdown library would be smaller, but this let me stay in Dart.

## References
- https://raw.githubusercontent.com/FriendlyUser/chatgpt_chrome_extension/main/lib/main.dart
- [Chrome extensions: manifest Content Security Policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
