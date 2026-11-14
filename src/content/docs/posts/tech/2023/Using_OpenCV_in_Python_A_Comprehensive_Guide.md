---
title: "OpenCV in Python: reading images, basic transforms, edges and face detection"
pubDate: "2023-11-24T14:04:38.000Z"
lastUpdated: 2026-11-14
description: "Load, display and save images with OpenCV in Python, then resize, rotate, threshold, blur, find edges and detect faces with a Haar cascade."
tags:
  - python
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3437532028.png
---

OpenCV is a C++ computer vision library with official Python bindings (`cv2`). In Python, images are plain NumPy arrays, so you can mix OpenCV calls with NumPy slicing and arithmetic. This post walks through the basics: I/O, simple transforms, thresholding, blurring, edge detection, and face detection with a Haar cascade.

## Installation

The official wheels on PyPI come in four variants. Install **only one** of them in a given environment; they all provide the same `cv2` module and conflict with each other.

```bash
pip install opencv-python            # main modules, with GUI support (imshow)
pip install opencv-contrib-python    # main + extra "contrib" modules
pip install opencv-python-headless   # no GUI; for servers and Docker
pip install opencv-contrib-python-headless
```

The examples below were checked against OpenCV 4.x. OpenCV 5 moved the Haar cascade classifier into the contrib modules; see the note in the face detection section.

## Reading, displaying and saving images

```python
import sys
import cv2

image = cv2.imread("image.jpg")
if image is None:
    sys.exit("could not read image.jpg")

print(image.shape)  # (height, width, 3)
```

Two things trip people up here:

- `imread` does **not** raise an exception when the file is missing or unreadable; it returns `None`. Check for it, or the error surfaces later as a confusing failure in another function.
- Colour images are loaded in **BGR** channel order, not RGB. Convert with `cv2.cvtColor(image, cv2.COLOR_BGR2RGB)` before passing the array to Matplotlib or Pillow.

To show the image in a window:

```python
cv2.imshow("Image", image)
cv2.waitKey(0)           # wait for any key press
cv2.destroyAllWindows()
```

`imshow` needs a desktop session and a non-headless build. In Jupyter or on a server, convert to RGB and display with Matplotlib instead.

`imwrite` picks the format from the file extension and returns `True` on success:

```python
cv2.imwrite("output.png", image)
```

## Basic operations

### Grayscale

```python
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
```

Many algorithms (thresholding, Canny, Haar cascades) work on a single-channel image, so this is usually the first step.

### Resizing

`resize` takes the target size as `(width, height)`, the opposite order to `image.shape`:

```python
small = cv2.resize(image, (200, 150), interpolation=cv2.INTER_AREA)

# or scale by a factor and keep the aspect ratio
half = cv2.resize(image, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
```

`INTER_AREA` gives better results when shrinking; `INTER_LINEAR` (the default) or `INTER_CUBIC` are better when enlarging.

### Rotating

`getRotationMatrix2D` builds a 2×3 affine matrix from a centre, an angle in degrees (positive is counter-clockwise), and a scale. `warpAffine` applies it:

```python
height, width = image.shape[:2]
center = (width // 2, height // 2)

matrix = cv2.getRotationMatrix2D(center, 30, 1.0)
rotated = cv2.warpAffine(image, matrix, (width, height))
```

The output keeps the original size, so the corners get cut off. For exact 90° turns, `cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)` is simpler and loses nothing.

## Image processing

### Thresholding

`threshold` returns a tuple of the threshold used and the result image. Pixels above the threshold become `maxval`, the rest become 0:

```python
_, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

# let Otsu's method pick the threshold from the histogram
otsu_value, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
```

For uneven lighting, `cv2.adaptiveThreshold` computes a threshold per neighbourhood instead of one for the whole image.

### Blurring

```python
gaussian = cv2.GaussianBlur(image, (5, 5), 0)   # kernel size must be odd; sigma 0 = derive from size
median = cv2.medianBlur(image, 5)               # good for salt-and-pepper noise
bilateral = cv2.bilateralFilter(image, 9, 75, 75)  # smooths while keeping edges sharp
```

### Edge detection

`Canny` takes a low and a high threshold for the hysteresis step. Blurring first reduces edges from noise:

```python
edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
```

A high-to-low ratio of about 2:1 to 3:1 is a common starting point; tune from there.

## Face detection with a Haar cascade

:::caution
In OpenCV 5, `CascadeClassifier` moved from the main `objdetect` module to `xobjdetect` in opencv_contrib, so with 5.x you need `opencv-contrib-python`. For new projects the OpenCV maintainers suggest the DNN-based `cv2.FaceDetectorYN` (YuNet), which is more accurate but needs a separately downloaded ONNX model.
:::

Haar cascades are an older, fast but fairly inaccurate detector. The pip wheels ship the pre-trained XML files, and `cv2.data.haarcascades` gives you their directory:

```python
import sys
import cv2

image = cv2.imread("people.jpg")
if image is None:
    sys.exit("could not read people.jpg")
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
if face_cascade.empty():
    sys.exit("could not load cascade")

faces = face_cascade.detectMultiScale(
    gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
)

for x, y, w, h in faces:
    cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)  # green in BGR

cv2.imwrite("faces.jpg", image)
print(f"found {len(faces)} face(s)")
```

`scaleFactor` controls how much the image shrinks between detection passes (smaller is slower but finds more sizes), and `minNeighbors` is how many overlapping detections a candidate needs before it counts; raise it if you get false positives. Like `imread`, a bad path doesn't raise: the classifier just loads empty, which is why the `empty()` check is there.

## Further reading

- [OpenCV-Python tutorials](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [opencv-python on PyPI](https://pypi.org/project/opencv-python/), which explains the four package variants
