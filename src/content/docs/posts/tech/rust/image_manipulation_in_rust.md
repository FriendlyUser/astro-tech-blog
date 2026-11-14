---
title: Resize, rotate and adjust brightness of images in Rust with the image crate
description: Build a small Rust library with the image and imageproc crates that loads, resizes, rotates, brightens and adjusts the contrast of images, then saves the results.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/2543580613.webp'
---

The [`image`](https://crates.io/crates/image) crate is the standard way to read, write and edit raster images in pure Rust. It decodes common formats (PNG, JPEG, GIF, WebP, BMP, TIFF and more) into a `DynamicImage` and has methods for resizing, flipping, 90° rotations, blurring and colour adjustments. For anything beyond that, such as rotation by an arbitrary angle, the companion [`imageproc`](https://crates.io/crates/imageproc) crate adds more operations.

This post wraps a few of those operations in a small library crate and calls it from a binary. It's written against `image` 0.25.10 and `imageproc` 0.27.0.

## Setting up the project

```bash
cargo new image_manipulation_lib
cd image_manipulation_lib
cargo add image@0.25 imageproc@0.27
```

`Cargo.toml` ends up with:

```toml
[dependencies]
image = "0.25"
imageproc = "0.27"
```

We'll put the functions in `src/lib.rs` and the program that uses them in `src/main.rs`. Cargo builds both, and the binary can import the library by the package name.

## The library

`src/lib.rs`:

```rust
use image::imageops::FilterType;
use image::{DynamicImage, ImageResult, Rgba};
use imageproc::geometric_transformations::{rotate_about_center, Border, Interpolation};

/// Load an image; the format is chosen from the file extension.
pub fn load_image(path: &str) -> ImageResult<DynamicImage> {
    image::open(path)
}

/// Save an image; the format is chosen from the file extension.
pub fn save_image(image: &DynamicImage, path: &str) -> ImageResult<()> {
    image.save(path)
}

/// Resize to fit within `width` x `height`, keeping the aspect ratio.
pub fn resize_image(image: &DynamicImage, width: u32, height: u32) -> DynamicImage {
    image.resize(width, height, FilterType::Lanczos3)
}

/// Rotate clockwise by `degrees` around the centre. The output keeps the
/// original size, so corners are cropped and uncovered areas are transparent.
pub fn rotate_image(image: &DynamicImage, degrees: f32) -> DynamicImage {
    let rgba = image.to_rgba8();
    let rotated = rotate_about_center(
        &rgba,
        degrees.to_radians(),
        Interpolation::Bilinear,
        Border::Constant(Rgba([0, 0, 0, 0])),
    );
    DynamicImage::ImageRgba8(rotated)
}

/// Brighten by `brightness` (negative values darken), then change contrast
/// by `contrast` (positive increases, negative decreases).
pub fn adjust_image(image: &DynamicImage, brightness: i32, contrast: f32) -> DynamicImage {
    image.brighten(brightness).adjust_contrast(contrast)
}
```

A few notes on the API:

- `image::open` picks the decoder from the file extension. If you need more control (guessing the format from the file contents, decoder limits), use `image::ImageReader` instead. It replaced `image::io::Reader`; the `io` module is deprecated in 0.25.
- `DynamicImage::save` picks the encoder from the extension. There's no separate writer type to open first.
- `resize` preserves the aspect ratio, so an 800x600 target on a portrait image gives something narrower than 800 pixels. Use `resize_exact` to stretch to the exact size, or `resize_to_fill` to crop.
- `DynamicImage` only has fixed rotations (`rotate90`, `rotate180`, `rotate270`). For other angles we use `imageproc::geometric_transformations::rotate_about_center`, which takes radians and works on a concrete pixel type, so we convert to RGBA first. `Border::Constant` sets what fills the corners that end up outside the source image.
- `brighten` takes an `i32` added to each channel; `adjust_contrast` takes an `f32` where 0 means no change.

## Using the library

`src/main.rs`:

```rust
use image_manipulation_lib::{adjust_image, load_image, resize_image, rotate_image, save_image};

fn main() -> image::ImageResult<()> {
    let image = load_image("input.jpg")?;

    save_image(&resize_image(&image, 800, 600), "resized.jpg")?;
    // JPEG has no alpha channel, so save the RGBA rotation as PNG.
    save_image(&rotate_image(&image, 45.0), "rotated.png")?;
    save_image(&adjust_image(&image, 20, 15.0), "adjusted.jpg")?;

    Ok(())
}
```

Put an `input.jpg` in the project root and run:

```bash
cargo run --release
```

Use `--release` for image work. Debug builds of the resampling and pixel loops are many times slower, which is noticeable on large photos.

## Where to go next

- Other `DynamicImage` methods worth knowing: `crop_imm`, `thumbnail` (fast, lower quality than `resize`), `blur`, `grayscale`, `huerotate`, `fliph`/`flipv`.
- `imageproc` also has drawing (lines, shapes, text), filters, edge detection and morphology.
- [`image` docs](https://docs.rs/image) and [`imageproc` docs](https://docs.rs/imageproc)
