---
description: Open, convert and save images with Pillow, then resize, rotate, flip, blur, adjust brightness and contrast, and read EXIF metadata.
imgSrc: /imgs/2023/1793654723_jerome_powell_burning_down_nyse_looking_like_a_boss.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-05-24T17:15:41.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: "Image processing in Python with Pillow: resize, rotate, filter and EXIF"
---

Pillow is the maintained fork of PIL, the original Python Imaging Library, and it's what you import as `PIL`. It covers everyday image work: format conversion, resizing and thumbnails, rotation, simple filters, colour adjustments, and metadata. For heavier computer vision, reach for OpenCV or scikit-image instead.

## Installation

```bash
pip install pillow
```

The package name is `pillow`, but the import is `PIL`.

## Opening and saving images

```python
from PIL import Image

with Image.open("photo.jpg") as image:
    print(image.format, image.size, image.mode)  # e.g. JPEG (4032, 3024) RGB
    image.save("photo.png")
```

`Image.open` is lazy: it reads the header straight away and the pixel data only when needed, so using it as a context manager closes the file when you're done. `save` picks the output format from the extension.

`image.size` is `(width, height)`, and `image.mode` is the pixel format (`RGB`, `RGBA`, `L` for grayscale, `P` for palette). Mode matters when saving: JPEG has no alpha channel, so saving an `RGBA` image as JPEG raises `OSError: cannot write mode RGBA as JPEG`. Convert first:

```python
image.convert("RGB").save("photo.jpg", quality=90)
```

`image.format` is only set on images loaded from a file. Images produced by `resize`, `rotate`, and similar methods have `format` set to `None`.

## Basic operations

The snippets from here on assume `image` is an open image, for example `image = Image.open("photo.jpg")`. All of these methods return a new image and leave the original unchanged, except `thumbnail`, which works in place.

### Resizing

```python
resized = image.resize((800, 600))  # exact size; may distort

thumb = image.copy()
thumb.thumbnail((800, 800))  # fits inside 800x800, keeps aspect ratio, in place
```

### Rotating

`rotate` takes degrees **counter-clockwise**. By default the output keeps the original size, so the corners are cropped; pass `expand=True` to grow the canvas to fit:

```python
rotated = image.rotate(45, expand=True)
```

### Flipping

Use `transpose`, or the `ImageOps` helpers:

```python
from PIL import Image, ImageOps

mirrored = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)  # horizontal
flipped = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)   # vertical

mirrored = ImageOps.mirror(image)  # same as FLIP_LEFT_RIGHT
flipped = ImageOps.flip(image)     # same as FLIP_TOP_BOTTOM
```

`ImageOps.mirror` flips left to right and `ImageOps.flip` flips top to bottom; the names are easy to mix up.

## Filters and enhancements

### Filters

```python
from PIL import ImageFilter

blurred = image.filter(ImageFilter.GaussianBlur(radius=5))
sharpened = image.filter(ImageFilter.SHARPEN)
edges = image.filter(ImageFilter.FIND_EDGES)
```

### Brightness, contrast and saturation

Each `ImageEnhance` class takes a factor where `1.0` returns the original image:

```python
from PIL import ImageEnhance

brighter = ImageEnhance.Brightness(image).enhance(1.5)  # 50% brighter
more_contrast = ImageEnhance.Contrast(image).enhance(2)
less_saturated = ImageEnhance.Color(image).enhance(0.5)  # 0.0 = grayscale
```

## EXIF metadata

Use the public `getexif()` method. It returns an `Image.Exif` object that behaves like a dict keyed by numeric tag IDs; `ExifTags.TAGS` maps those IDs to names:

```python
from PIL import Image, ExifTags

with Image.open("photo.jpg") as image:
    exif = image.getexif()
    for tag_id, value in exif.items():
        print(ExifTags.TAGS.get(tag_id, tag_id), value)

    print(exif.get(ExifTags.Base.Model))  # camera model, or None
```

Older tutorials (including an earlier version of this post) use `image._getexif()`. It's a private method, so prefer the public `getexif()`.

`getexif()` returns the main (IFD0) tags such as camera make, model and orientation. Exposure details and GPS data live in sub-IFDs; read them with `exif.get_ifd(ExifTags.IFD.Exif)` and `exif.get_ifd(ExifTags.IFD.GPSInfo)`.

A related gotcha: phone photos are often stored sideways with an EXIF Orientation tag telling viewers to rotate them. Pillow doesn't apply it automatically, so call `ImageOps.exif_transpose(image)` before resizing or cropping, or the output can come out rotated.

Further reading: [Pillow documentation](https://pillow.readthedocs.io/en/stable/), in particular the [Image module reference](https://pillow.readthedocs.io/en/stable/reference/Image.html).
