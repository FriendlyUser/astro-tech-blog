---
title: Image manipulation in Rust
description: In this article, we will explore how to create a basic image manipulation library in Rust. We will use the image crate for handling different image formats and implement basic image operations like resizing, rotating, and adjusting brightness/contrast..
pubDate: Saturday, 24 November 2023 13:00:00 GMT
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/2543580613.png'
---

Introduction

Image manipulation is a common task in many applications, from image editing software to computer vision systems. In this article, we will explore how to create a basic image manipulation library in Rust. We will use the image crate for handling different image formats and implement basic image operations like resizing, rotating, and adjusting brightness/contrast.

Setting up the Project

To get started, we need to set up a new Rust project. To create a new Rust project, open a terminal window and run the following command:

```
$ cargo new image_manipulation_lib
```

This command will create a new Rust project named `image_manipulation_lib`. The project will contain a `Cargo.toml` file that describes the project's dependencies and a `src` directory that contains the project's source code.

The `Cargo.toml` file will look like this:

```toml
[package]
name = "image_manipulation_lib"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2018"

[dependencies]
```

We will add dependencies to the `Cargo.toml` file as we need them.

Loading and Saving Images

To load and save images, we will use the image crate. The image crate provides a simple and convenient API for handling different image formats.

We will create a function named `load_image` that will load an image from a file and return an `image::DynamicImage` object.

```rust
use image::{DynamicImage, ImageResult, io::Reader};

fn load_image(path: &str) -> ImageResult<DynamicImage> {
    Reader::open(path)?.decode()
}
```

In this function, we use the `io::Reader` struct to open the image file and decode it into a `DynamicImage` object.

We will also create a function named `save_image` that will save an image to a file.

```rust
use image::{DynamicImage, ImageResult, io::Writer};

fn save_image(image: &DynamicImage, path: &str) -> ImageResult<()> {
    Writer::open(path)?.write_image(image)
}
```

In this function, we use the `io::Writer` struct to open a file for writing and write the image data to the file.

Resizing Images

To resize an image, we will use the `resize` method of the `DynamicImage` object. We will create a function named `resize_image` that will take an image and new width and height values as parameters and return the resized image.

```rust
use image::{DynamicImage, ImageResult, GenericImageView};

fn resize_image(image: &DynamicImage, width: u32, height: u32) -> DynamicImage {
    image.resize(width, height, image::imageops::FilterType::Lanczos3)
}
```

In this function, we use the `resize` method of the `DynamicImage` object to resize the image. We specify the new width and height values and the `Lanczos3` filter type, which provides high-quality resizing.

Rotating Images

To rotate an image, we will use the `rotate` method of the `DynamicImage` object. We will create a function named `rotate_image` that will take an image and an angle value as parameters and return the rotated image.

```rust
use image::{DynamicImage, ImageResult, GenericImageView};

fn rotate_image(image: &DynamicImage, angle: f32) -> DynamicImage {
    image.rotate(angle, image::imageops::FilterType::Lanczos3)
}
```

In this function, we use the `rotate` method of the `DynamicImage` object to rotate the image. We specify the rotation angle and the `Lanczos3` filter type.

Adjusting Brightness and Contrast

To adjust the brightness and contrast of an image, we will use the `adjust_contrast` and `brighten` methods of the `DynamicImage` object. We will create a function named `adjust_image` that will take an image, brightness value, and contrast value as parameters and return the adjusted image.

```rust
use image::{DynamicImage, ImageResult, GenericImageView};

fn adjust_image(image: &DynamicImage, brightness: i32, contrast: f32) -> DynamicImage {
    let adjusted = image.brighten(brightness);
    adjusted.adjust_contrast(contrast)
}
```

In this function, we first use the `brighten` method of the `DynamicImage` object to adjust the brightness of the image. We then use the `adjust_contrast` method to adjust the contrast of the image.

Testing the Library

Now that we have implemented the image manipulation library, we can test it by writing a simple Rust program that uses it. We will create a new Rust file named `main.rs` in the `src` directory and add the following code:

```rust
use image_manipulation_lib::{load_image, save_image, resize_image, rotate_image, adjust_image};

fn main() {
    let image_path = "path/to/image.jpg";

    let image = load_image(image_path).unwrap();
    let resized_image = resize_image(&image, 800, 600);
    let rotated_image = rotate_image(&image, 45.0);
    let adjusted_image = adjust_image(&image, 20, 1.5);

    save_image(&resized_image, "path/to/resized_image.jpg").unwrap();
    save_image(&rotated_image, "path/to/rotated_image.jpg").unwrap();
    save_image(&adjusted_image, "path/to/adjusted_image.jpg").unwrap();
}
```

In this program, we first load an image using the `load_image` function. We then create resized, rotated, and adjusted versions of the image using the `resize_image`, `rotate_image`, and `adjust_image` functions, respectively. Finally, we save the modified images to files using the `save_image` function.

To run the program, open a terminal window, navigate to the project directory, and run the following command:

```bash
$ cargo run
```

This will compile and run the program, which will load an image, create modified versions of it, and save them to files.

Conclusion

In this article, we have explored how to create a basic image manipulation library in Rust. We have used the image crate for handling different image formats and implemented basic image operations like resizing, rotating, and adjusting brightness/contrast. With this knowledge, you can now create your own Rust image manipulation applications and explore the full potential of this powerful programming language.