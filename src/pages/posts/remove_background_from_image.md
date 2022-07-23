---
title: Flutter Remove background from image web app Part II
description: Web app / mobile app that allows the user to download an image after the remove.bg api has been applied.
alt: my first blog post
tags: ["flutter"]
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'  
pubDate: Sunday, 23 July 2022 13:00:00 GMT
---


Full code for this post can be seen at [github](https://github.com/FriendlyUser/remove_bg_flutter_app/tree/483074e626afb9118213a5942bcfac1e3cbb6493).

In order to familarize myself with flutter, I decided to create a flutter 3 project that allowed me to remove background images from photos. 

Using the excellent remove bg api (limit to 50 api calls a month for free tier), I can simply send an image over and then display it to the user.

Due to my lack of familarity with the flutter ecosystem, I ran into a number of issues. 

The first one is due to the `dio` http library in flutter. Calling the remove.bg api returns a file in bytes, but unless you specific bytes in the http request, you get a string that cannot be used for anything/.

```dart
    var formData = FormData();
    var dio = Dio();
    // flutter add api token
    // hardcoded free access token
    dio.options.headers["X-Api-Key"] = "<API_KEY>";
    try {
      if (kIsWeb) {
        var _bytes = await image.readAsBytes();
        formData.files.add(MapEntry(
          "image_file",
          MultipartFile.fromBytes(_bytes, filename: "pic-name.png"),
        ));
      } else {
        formData.files.add(MapEntry(
          "image_file",
          await MultipartFile.fromFile(image.path, filename: "pic-name.png"),
        ));
      }
      Response<List<int>> response = await dio.post(
          "https://api.remove.bg/v1.0/removebg",
          data: formData,
          options: Options(responseType: ResponseType.bytes));
      return response.data;
```

The remove.bg api expects form_data with the property image data.


For the dio http client
```dart
      Response<List<int>> response = await dio.post(
          "https://api.remove.bg/v1.0/removebg",
          data: formData,
          options: Options(responseType: ResponseType.bytes));
```

you must specific the response type for images otherwise you will get a messed up binary encoded string that is difficult to interact with.

This causes issues and crashes with the loaded image, very difficult to debug, might have been easier with more knowledge of flutter and knowing how and where to track errors.

One additional feature of interest is the download logic. `dart:io` is not supported on web, as a result I needed to have a reach around for the download logic, in case the anchor element is throwing error for mobile complication I will need to conditionally render it based on the situtation or use a dynamic import only for web.

```dart
              downloadButton = _html.AnchorElement(
                href:
                    "$header,$base64String")
              ..setAttribute("download", "file.png")
              ..click()
```

Overall adapting the flutter code to the web is a bit of a challenge, but I am confident that I have a solid foundation to build upon.

See https://docs.flutter.dev/cookbook/plugins/picture-using-camera for more details.

For those interested, I have added a github action to automatically deploy to the github pages website.

```dart
name: Flutter Web
on:
  push:
    branches:
      - main

jobs:
  build:
    name: Build Web
    env:
      my_secret: ${{secrets.commit_secret}}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.0.3'
      - run: flutter pub get
      - run: flutter build web --release
      - name: Deploy 🚀
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          branch: gh-pages # The branch the action should deploy to.
          folder: build/web # The folder the action should deploy.
```

This action will build web for flutter 3.0.3 and then deploy it to the branch that will be displayed on github pages.

In order to have platform specific implementations, the best way is to have nested imports

```dart
import 'package:rm_img_bg/download_button_main.dart'
if (dart.library.html) 'package:rm_img_bg/download_button_web.dart';
```

Make sure the functions and classes are defined the same

```dart
import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:html' as _html;
import 'dart:typed_data';


class DownloadButtonProps {
    List<int> imageInBytes;
    DownloadButtonProps({ required this.imageInBytes});
  }

class DownloadButton extends StatelessWidget {

  final DownloadButtonProps data;
  const DownloadButton({Key? key, required this.data}): super(key: key);
  @override
  Widget build(BuildContext context) {
    String base64String = base64Encode(Uint8List.fromList(data.imageInBytes));
    String header = "data:image/png;base64"; 
    return ElevatedButton(
      onPressed: () => {
        // saveFile(uploadedImage.toString())
          {
            _html.AnchorElement(
              href:
                  "$header,$base64String")
            ..setAttribute("download", "file.png")
            ..click()
          }
      },
      child: const Text("Save File"),
    );
  }
}
```

Mobile (todo)
```dart
import 'package:flutter/material.dart';

class DownloadButtonProps {
    List<int> imageInBytes;
    DownloadButtonProps({ required this.imageInBytes});
}

class DownloadButton extends StatelessWidget {

  final DownloadButtonProps data;
  const DownloadButton({Key? key, required this.data}): super(key: key);
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () => {
        // saveFile(uploadedImage.toString())
          {
            print("DO SOMETHING HERE")
          }
      },
      child: const Text("Save File"),
    );
  }
}
```

Next post is available at [Part II](/posts/remove_background_from_image_II)