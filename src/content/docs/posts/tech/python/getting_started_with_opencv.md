---
tags: ['python', 'selenium', 'opencv']
title: Getting started with OpenCV in Python by building a cartoon filter
description: Install OpenCV for Python, see which beginner projects it suits, and build a working cartoon filter from blurring, adaptive thresholding and a bilateral filter.
pubDate: Fri, 10 Feb 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3750534419.webp"
---

[OpenCV](https://opencv.org/) is an open-source computer vision library written in C++ with Python bindings. It covers the classic image-processing toolbox (filtering, edge detection, contours, geometric transforms, camera calibration, video I/O) plus a `dnn` module for running pre-trained neural networks. In Python, images are plain NumPy arrays, so OpenCV works well alongside NumPy and the rest of the scientific stack.

Install it from PyPI:

```bash
pip install opencv-python
```

Use `opencv-python-headless` instead on servers or in Docker images without a display. The headless build has no `cv2.imshow` or other GUI functions.

## Beginner project ideas

These all use functions in the core OpenCV package:

- **Color detection**: convert to HSV with `cv2.cvtColor` and keep a color range with `cv2.inRange` (e.g. to track a red ball).
- **Shape detection**: run `cv2.Canny` edge detection, then `cv2.findContours` and `cv2.approxPolyDP` to count each shape's corners.
- **Face detection**: use the Haar cascade files that ship with the package (`cv2.data.haarcascades`) with `cv2.CascadeClassifier`.
- **Motion detection**: subtract the background with `cv2.createBackgroundSubtractorMOG2` and look for large changed regions between frames.
- **Document scanner**: find the four corners of a page, then flatten it with `cv2.getPerspectiveTransform` and `cv2.warpPerspective`.
- **Image classification**: load a pre-trained ONNX model with `cv2.dnn.readNet` and run it on your own photos.

For reading text from images, OpenCV is usually paired with an OCR engine such as Tesseract. OpenCV handles cleanup (thresholding, deskewing) and the OCR engine does the recognition.

## Building a cartoon filter

A cartoon effect has two parts: bold dark outlines, and flat areas of color. OpenCV can produce both, and you combine them with a mask.

```python
import cv2

image = cv2.imread("input.jpg")
if image is None:
    raise FileNotFoundError("input.jpg not found or not a readable image")

# 1. Edges: grayscale, median blur to remove noise, then adaptive threshold.
#    Adaptive thresholding picks a threshold per neighbourhood, so lines
#    stay visible in both light and dark parts of the photo.
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
gray = cv2.medianBlur(gray, 7)
edges = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, blockSize=9, C=2
)

# 2. Color: a bilateral filter smooths flat regions but keeps edges sharp.
#    Running it a few times gives the flat "painted" look.
color = image
for _ in range(3):
    color = cv2.bilateralFilter(color, d=9, sigmaColor=75, sigmaSpace=75)

# 3. Combine: edges is white (255) everywhere except the outlines (0),
#    so using it as a mask paints the outlines black.
cartoon = cv2.bitwise_and(color, color, mask=edges)

cv2.imwrite("cartoon.jpg", cartoon)
```

Run it with an `input.jpg` in the same directory, and it writes `cartoon.jpg`. To view the result in a window instead (not available with the headless package), use:

```python
cv2.imshow("Cartoon", cartoon)
cv2.waitKey(0)
cv2.destroyAllWindows()
```

Parameters worth tuning:

- `medianBlur` kernel size (odd number): larger values give fewer, cleaner outlines.
- `blockSize` and `C` in `adaptiveThreshold`: larger `C` gives thinner lines and less noise.
- Number of bilateral filter passes, and `d`: more passes give flatter color but are slow on large images. Resize big photos first with `cv2.resize`.

## Gotchas

- `cv2.imread` returns `None` instead of raising an error when the path is wrong. Always check it.
- OpenCV stores color images as **BGR**, not RGB. Convert with `cv2.cvtColor(img, cv2.COLOR_BGR2RGB)` before you display them with Matplotlib or pass them to other libraries.
- Install only one of the `opencv-python*` packages in an environment. They all provide the same `cv2` module and conflict with each other.

## Further reading

- [OpenCV-Python tutorials](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [opencv-python on PyPI](https://pypi.org/project/opencv-python/) (explains the four package variants)
