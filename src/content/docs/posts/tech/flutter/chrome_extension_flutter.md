---
tags: ['chatgpt', 'flutter']
title: In this blog post I will show you to build a markdown viewer in Flutter.
description: For chatgpt usage, it is easier to view the prompts in a markdown viewer as a chrome extension.
pubDate: Fri, 7 July 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1028024527.png
---
A Chrome extension is a small software program that adds new features to the Google Chrome web browser. Chrome extensions can modify and enhance the functionality of Chrome by adding or removing certain features, or by integrating with other web services or applications. Chrome extensions can be installed from the Chrome Web Store and can be managed and configured through the browser's settings menu.


Flutter is a popular open-source framework for building high-performance mobile and web applications. However, building a Chrome extension in Flutter is not currently possible, as Flutter is primarily designed for building standalone mobile and web applications, rather than browser extensions.

To build a Chrome extension, you can use web development technologies like HTML, CSS, and JavaScript. You can also use popular JavaScript frameworks like React, Vue, or Angular to create more complex extensions.

To get started, you'll need to create a manifest file that defines the structure and behavior of your extension, as well as any required permissions. You can then use JavaScript to create the user interface and implement the functionality of your extension.

Here's a high-level overview of the steps involved in building a Chrome extension:

1. Define the structure and behavior of your extension in a manifest file.
2. Create a popup or settings page for your extension using HTML and CSS.
3. Use JavaScript to implement the functionality of your extension, including any interactions with external APIs or services.
4. Test your extension and submit it to the Chrome Web Store for distribution.

There are many resources available online to help you get started with building Chrome extensions, including the official Chrome Extension Developer Guide and various tutorials and code samples.


```dart 
 import 'dart:async'; // import Timer
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:http/http.dart' as http;
// import clipboard from services
import 'package:flutter/services.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String _markdownData = "";

  @override
  void initState() {
    super.initState();
    fetchMarkdownData();

    // Schedule fetching markdown data again after 50 minutes
    Timer.periodic(const Duration(minutes: 50), (timer) {
      fetchMarkdownData();
    });
  }

  void fetchMarkdownData() async {
    try {
      final response = await http.get(Uri.parse("https://raw.githubusercontent.com/FriendlyUser/chatgpt_prompts/main/README.md"));
      setState(() {
        _markdownData = response.body;
      });
    } catch (e) {
      print(e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: Text("ChatGpt Prompt Viewer"),
        ),
        body: Markdown(
              data: _markdownData,
              selectable: true,
              // onTapLink: (text, href, title) {
              //   Clipboard.setData(ClipboardData(text: text));
              // },
        ),
      ),
    );
  }
} 
 ```

The code above is a Flutter application that fetches Markdown data from a remote server and displays it in a widget. The app is also set up to periodically fetch the data again after a certain time interval.

The `main()` function initializes the application by calling `runApp()` with an instance of the `MyApp` widget. The `MyApp` widget is a `StatefulWidget`, which means it has mutable state that can change over time.

The `fetchMarkdownData()` function is an asynchronous function that uses the `http` package to fetch Markdown data from a remote server. Once the data has been fetched, it updates the `_markdownData` state variable using `setState()`. If an error occurs during the fetch process, it is printed to the console.

The `_MyAppState` class is the state object associated with the `MyApp` widget. In its `initState()` method, it calls `fetchMarkdownData()` to initialize the `_markdownData` state variable. It also sets up a `Timer` to periodically call `fetchMarkdownData()` again every 50 minutes.

In the `build()` method of the `_MyAppState` class, the `_markdownData` state variable is passed to a `Markdown` widget, which displays the Markdown data in a scrollable view. The `selectable` property is set to `true`, which allows the user to select and copy text from the Markdown view.

Note that the code includes commented-out code to handle tapping on links in the Markdown view, but it is currently disabled. The commented-out code uses the `clipboard` package to copy the link text to the device clipboard when a link is tapped.


To install a Chrome extension from a bundle, follow these steps:

1. Download the extension bundle: This will typically be a `.crx` or `.zip` file. You can download the bundle from the developer's website or from a third-party source.
2. Extract the extension files: If the bundle is a `.zip` file, you can extract its contents using a program like WinZip or 7-Zip. If it's a `.crx` file, you can change the file extension to `.zip` and then extract the contents.
3. Open the Chrome extensions page: In the Chrome browser, click on the three-dot menu icon in the upper-right corner and select "More tools" > "Extensions". Alternatively, you can type `chrome://extensions/` in the address bar.
4. Enable developer mode: In the top right corner of the extensions page, toggle the "Developer mode" switch to the "On" position.
5. Click "Load unpacked": This button should now be visible on the extensions page. Click it and select the folder that contains the extracted extension files.
6. Confirm installation: Once you've selected the folder, the extension should be installed and listed on the extensions page. If you see any errors or warnings, review the manifest file for the extension and ensure that it meets the requirements for Chrome extensions.

Note that installing an extension from a bundle that is not from a trusted source can be risky, as it may contain malware or other harmful code. Always be cautious when downloading and installing extensions from third-party sources, and only install extensions from trusted developers and sources.



## References
- https://raw.githubusercontent.com/FriendlyUser/chatgpt_chrome_extension/main/lib/main.dart
