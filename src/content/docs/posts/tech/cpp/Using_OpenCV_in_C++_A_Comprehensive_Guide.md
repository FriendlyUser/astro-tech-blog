---
title: "OpenCV in C++: images, video, and object detection with the dnn module"
pubDate: "2023-05-03T14:16:44.846Z"
lastUpdated: 2026-11-14
description: "Set up OpenCV with CMake, then load, resize, crop and rotate images, play video with VideoCapture, and run a MobileNet-SSD detector in C++."
tags: ["opencv", "cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2125743054.webp
---

OpenCV is an open-source computer vision library written in C++. The core type is `cv::Mat`, an n-dimensional array that holds images, and the library adds image processing, video I/O, a simple GUI (`highgui`) for debugging, and a `dnn` module that runs trained neural networks.

This post walks through the basics in C++: building against OpenCV, reading and displaying images, a few common transforms, reading video, and running an object detector.

## Setup

Building OpenCV from source is rarely necessary. Use a package manager:

```sh
# Debian/Ubuntu
sudo apt install libopencv-dev

# macOS
brew install opencv

# Windows (or any platform)
vcpkg install opencv
```

If you need extra modules (`opencv_contrib`) or CUDA, follow the [official build guide](https://docs.opencv.org/4.x/d7/d9f/tutorial_linux_install.html).

A minimal `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.16)
project(opencv_demo CXX)

set(CMAKE_CXX_STANDARD 17)
find_package(OpenCV REQUIRED)

add_executable(opencv_demo main.cpp)
target_include_directories(opencv_demo PRIVATE ${OpenCV_INCLUDE_DIRS})
target_link_libraries(opencv_demo PRIVATE ${OpenCV_LIBS})
```

OpenCV 5 requires C++17, so set that even if you're on 4.x today.

## Reading and displaying an image

`cv::imread` returns an empty `Mat` instead of throwing when the file can't be read, so always check `empty()`. Note that colour images are loaded in **BGR** order, not RGB.

```cpp
#include <iostream>
#include <opencv2/opencv.hpp>

int main() {
    cv::Mat img = cv::imread("image.jpg", cv::IMREAD_COLOR);
    if (img.empty()) {
        std::cerr << "Could not load image.jpg\n";
        return 1;
    }

    cv::imshow("My Image", img);
    cv::waitKey(0);  // wait for a key press
    cv::destroyAllWindows();
    return 0;
}
```

`imshow` needs a build with a GUI backend (GTK, Qt, Cocoa or Win32). On a headless server, write results with `cv::imwrite` instead.

## Resizing, cropping and rotating

These snippets assume `img` was loaded as above.

```cpp
// Resize to a fixed size. INTER_AREA is a good choice when shrinking.
cv::Mat resized;
cv::resize(img, resized, cv::Size(300, 200), 0, 0, cv::INTER_AREA);

// Crop: a Rect ROI is a view into the same pixel data, not a copy.
cv::Rect roi(100, 50, 200, 150);
cv::Mat cropped = img(roi & cv::Rect(0, 0, img.cols, img.rows)).clone();

// Rotate 45 degrees around the centre.
cv::Point2f center(img.cols / 2.0f, img.rows / 2.0f);
cv::Mat rotation = cv::getRotationMatrix2D(center, 45.0, 1.0);
cv::Mat rotated;
cv::warpAffine(img, rotated, rotation, img.size());
```

Two gotchas: indexing a ROI that extends past the image throws an exception, which is why the crop intersects it with the image bounds first (`&`); and without `.clone()`, writing to `cropped` modifies `img`. `warpAffine` with the original size also cuts off the corners of the rotated image. For exact 90-degree rotations, `cv::rotate` is simpler and lossless.

## Reading video

`cv::VideoCapture` reads files, image sequences, network streams and cameras (pass an integer device index such as `0` for a webcam).

```cpp
#include <iostream>
#include <opencv2/opencv.hpp>

int main() {
    cv::VideoCapture video("video.mp4");
    if (!video.isOpened()) {
        std::cerr << "Could not open video.mp4\n";
        return 1;
    }

    double fps = video.get(cv::CAP_PROP_FPS);
    int delay_ms = fps > 0 ? static_cast<int>(1000 / fps) : 25;

    cv::Mat frame;
    while (video.read(frame)) {
        cv::imshow("My Video", frame);
        if (cv::waitKey(delay_ms) == 'q') break;
    }

    cv::destroyAllWindows();
    return 0;  // VideoCapture releases itself in its destructor
}
```

Video decoding relies on a backend such as FFmpeg or GStreamer. If `isOpened()` fails on a file you know is valid, check `cv::getBuildInformation()` for the "Video I/O" section.

## Object detection with MobileNet-SSD

The `dnn` module runs networks trained in other frameworks; OpenCV doesn't train them itself. This example uses the Caffe version of MobileNet-SSD, trained on the 20 PASCAL VOC classes. The `.prototxt` and `.caffemodel` files come from the [chuanqi305/MobileNet-SSD](https://github.com/chuanqi305/MobileNet-SSD) repository.

:::caution
`cv::dnn::readNetFromCaffe()` is available in OpenCV 4.x but was removed in OpenCV 5, along with the Darknet importer. On OpenCV 5, convert the model to ONNX and load it with `cv::dnn::readNetFromONNX()`. The output layout then depends on the exported model.
:::

The network's output is a 4-D blob of shape `[1, 1, N, 7]`, where each of the N rows is `[image_id, class_id, confidence, x1, y1, x2, y2]` with coordinates normalised to 0–1. `cv::Mat::at` has no four-index overload, so wrap the last two dimensions in a 2-D `Mat` header before reading it.

```cpp
#include <iostream>
#include <opencv2/opencv.hpp>
#include <opencv2/dnn.hpp>

int main() {
    cv::dnn::Net net = cv::dnn::readNetFromCaffe("MobileNetSSD_deploy.prototxt",
                                                 "MobileNetSSD_deploy.caffemodel");

    cv::Mat img = cv::imread("image.jpg", cv::IMREAD_COLOR);
    if (img.empty()) {
        std::cerr << "Could not load image.jpg\n";
        return 1;
    }

    // This model expects 300x300 input, scaled to [-1, 1]: (pixel - 127.5) / 127.5.
    cv::Mat blob = cv::dnn::blobFromImage(img, 1.0 / 127.5, cv::Size(300, 300),
                                          cv::Scalar(127.5, 127.5, 127.5),
                                          /*swapRB=*/false, /*crop=*/false);
    net.setInput(blob);
    cv::Mat output = net.forward();

    // View the [1, 1, N, 7] output as an N x 7 matrix (no copy).
    cv::Mat detections(output.size[2], output.size[3], CV_32F, output.ptr<float>());

    const float confidence_threshold = 0.5f;
    for (int i = 0; i < detections.rows; ++i) {
        float confidence = detections.at<float>(i, 2);
        if (confidence < confidence_threshold) continue;

        int class_id = static_cast<int>(detections.at<float>(i, 1));
        int x1 = static_cast<int>(detections.at<float>(i, 3) * img.cols);
        int y1 = static_cast<int>(detections.at<float>(i, 4) * img.rows);
        int x2 = static_cast<int>(detections.at<float>(i, 5) * img.cols);
        int y2 = static_cast<int>(detections.at<float>(i, 6) * img.rows);

        cv::rectangle(img, cv::Point(x1, y1), cv::Point(x2, y2), cv::Scalar(0, 255, 0), 2);
        cv::putText(img, std::to_string(class_id), cv::Point(x1, y1 - 5),
                    cv::FONT_HERSHEY_SIMPLEX, 0.5, cv::Scalar(0, 255, 0), 1);
    }

    cv::imshow("Object Detection", img);
    cv::waitKey(0);
    return 0;
}
```

`class_id` indexes the VOC label list used by that model (0 is background, 15 is person). MobileNet-SSD is small and fast on a CPU but not very accurate by current standards; for new work, export a recent detector to ONNX and load it with `readNetFromONNX`, which works in both 4.x and 5.x.

## Further reading

- [OpenCV documentation](https://docs.opencv.org/4.x/)
- [Deep Learning in OpenCV (wiki)](https://github.com/opencv/opencv/wiki/Deep-Learning-in-OpenCV)
- [OpenCV 4 to 5 migration guide](https://github.com/opencv/opencv/wiki/OpenCV-4-to-5-migration)
