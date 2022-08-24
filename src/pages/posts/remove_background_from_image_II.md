---
title: Flutter Remove background from image web app Part II
description: WIP web app that allows the user to download an image after the remove.bg api has been applied.
alt: my first blog post
tags: ["flutter", "remove-bg-app"]
layout: '@/templates/BasePost.astro'
pubDate: Sunday, 23 July 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-07-16 19.02.16 - corgi riding a skateboard through the rain, digital art.png'
imgAlt: 'Image post 3'
---


Full code for this post can be seen at [github](https://github.com/FriendlyUser/remove_bg_flutter_app/tree/483074e626afb9118213a5942bcfac1e3cbb6493).

Continuing from the previous post, I decided to add mobile support for the flutter project.

```dart
  if (kIsWeb) {
      return Scaffold(
          appBar: AppBar(title: const Text('Display the Picture')),
          // The image is stored as a file on the device. Use the `Image.file`
          // constructor with the given path to display the image.
          body: Container(
              child: Row(children: [
            Column(children: [
              Text("Original Image"),
              image,
            ]),
            Column(children: [
              Text("Background Removed Image"),
              otherImage,
              downloadButton,
            ]),
          ])));
    }

    // add bigger font and padding on the item.
    // extra padding on the save file item
    return Scaffold(
        appBar: AppBar(title: const Text('Display the Picture')),
        // The image is stored as a file on the device. Use the `Image.file`
        // constructor with the given path to display the image.
        body: SingleChildScrollView(
            child: Column(children: [
              // Original Image with 16 font and padding of 16
          Text("Original Image", style: const TextStyle(fontSize: 16)),
          Padding(padding: EdgeInsets.symmetric(vertical: 4)),
          image,
          Text("Background Removed Image", style: const TextStyle(fontSize: 16)),
          Padding(padding: EdgeInsets.symmetric(vertical: 4)),
          otherImage,
          Padding(padding: EdgeInsets.symmetric(vertical: 4)),
          downloadButton,
        ])));
```

Oftentimes this involves conditional rendering based on the platform. Essentially for desktop have the images next to each other and for mobile, have the user scroll down to see the original and the image removed from the background.

I think simply using the remove.bg site would be better in most cases, but its interesting to have an app do it on the go.

Future improvements could include

- adding a button to the image to enlarge the image.
- change the save logic around to let the user select the file name.

As flutter supports multiple platforms, some features are not fully supported cross platform.

```dart
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

class DownloadButtonProps {
    List<int> imageInBytes;
    DownloadButtonProps({ required this.imageInBytes});
}

class DownloadButton extends StatelessWidget {

  final DownloadButtonProps data;
  const DownloadButton({Key? key, required this.data}): super(key: key);

  Future<String> getFilePath() async {
    Directory? appDocumentsDirectory; 
    try {
      appDocumentsDirectory ??= await getExternalStorageDirectory();
    } catch (e) {
      print(e);
    }
    print(appDocumentsDirectory);
    appDocumentsDirectory ??= await getApplicationDocumentsDirectory();
    String appDocumentsPath = appDocumentsDirectory.path;
    // random file name to avoid overwriting existing files.
    String fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
    String filePath = '$appDocumentsPath/$fileName';
    print(filePath);
    return filePath;
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () async {
        // saveFile(uploadedImage.toString())
        {
          File file = File(await getFilePath());
          await file.writeAsBytes(data.imageInBytes);
        }
      },
      child: const Text("Save File"),
    );
  }
}
```

I also updated the floating action button to return if the remove.bg api returns a string (likely an error message)


```dart

 floatingActionButton: FloatingActionButton(
    // Provide an onPressed callback.
    onPressed: () async {
        // Take the Picture in a try / catch block. If anything goes wrong,
        // catch the error.
        try {
        // Ensure that the camera is initialized.
        await _initializeControllerFuture;

        // Attempt to take a picture and get the file `image`
        // where it was saved.
        final image = await _controller.takePicture();

        final uploadedImageResp = await uploadImage(image);
        // If the picture was taken, display it on a new screen.
        if (uploadedImageResp.runtimeType == String) {
            errorMessage = "Failed to upload image";
            return;
        }
        // if response is type string, then its an error and show, set message
        await Navigator.of(context).push(
            MaterialPageRoute(
            builder: (context) => DisplayPictureScreen(
                // Pass the automatically generated path to
                // the DisplayPictureScreen widget.
                imagePath: image.path,
                uploadedImage: uploadedImageResp),
            ),
        );
        } catch (e) {
        // If an error occurs, log the error to the console.
        print(e);
        }
    },
    child: const Icon(Icons.camera_alt),
```

In the next article I will cover setting up fastlane to deploy the app to the google play store.

