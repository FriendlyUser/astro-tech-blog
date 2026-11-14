---
title: "Computer vision in Rust: Canny edge detection with the opencv crate"
description: Install OpenCV and the opencv crate, load an image, and run Gaussian blur and Canny edge detection from Rust, with notes on how the bindings map OpenCV's API.
pubDate: Saturday, 24 November 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/235824961.png'
---

Computer vision is about getting structured information out of images: where the edges are, which
pixels belong to an object, whether a face is present. [OpenCV](https://opencv.org/) is the
standard C++ library for it, and the [`opencv`](https://crates.io/crates/opencv) crate provides
Rust bindings generated from OpenCV's headers. This post sets the crate up and uses it for Canny
edge detection.

## Installing OpenCV and the crate

The crate does not bundle OpenCV. You need OpenCV 4.x (or 5.x) installed, plus Clang, which the
crate uses to generate bindings at build time. From the crate's
[install guide](https://github.com/twistedfall/opencv-rust/blob/master/INSTALL.md):

```sh
# Debian / Ubuntu
sudo apt install libopencv-dev clang libclang-dev

# macOS
brew install opencv

# Windows (Chocolatey); also set OPENCV_LINK_LIBS, OPENCV_LINK_PATHS and OPENCV_INCLUDE_PATHS
choco install llvm opencv
```

Then add the crate. The examples were checked against version 0.102.0:

```toml
[dependencies]
opencv = "0.102"
```

The first build is slow because the bindings are generated for whatever OpenCV version is installed.

## How the bindings map OpenCV

- OpenCV modules become Rust modules: `cv::imread` is `opencv::imgcodecs::imread`,
  `cv::GaussianBlur` is `opencv::imgproc::gaussian_blur`, `cv::Canny` is `opencv::imgproc::canny`.
- Function names are converted to snake_case. Every call returns `opencv::Result<T>`, so C++
  exceptions become `Err` values you handle with `?`.
- C++ default arguments don't exist in Rust. Each function with defaults also has a `_def` variant
  that takes only the required arguments (`canny_def`, `gaussian_blur_def`, `imwrite_def`). The `_def`
  variants also keep your code compiling when newer OpenCV versions add optional parameters.
- Methods on `Mat` and other classes come from traits, so `use opencv::prelude::*;` is needed.
- Core types live in `opencv::core`: `Mat` (images and matrices), `Size`, `Point`, `Rect`
  (with public `x`, `y`, `width`, `height` fields) and `Scalar` (four `f64` values, used for colours
  in BGR order, e.g. `Scalar::new(0.0, 255.0, 0.0, 0.0)` for green).

## Canny edge detection

The Canny algorithm (John F. Canny, 1986) finds edges in four steps:

1. Smooth the image with a Gaussian filter to suppress noise.
2. Compute the intensity gradient (magnitude and direction) with Sobel filters.
3. Apply non-maximum suppression, keeping only pixels that are local maxima along the gradient
   direction, which thins edges to one pixel.
4. Apply hysteresis thresholding: pixels above the high threshold are strong edges, pixels below
   the low threshold are discarded, and pixels in between are kept only if they connect to a strong
   edge.

OpenCV's `Canny` function does steps 2 to 4 internally, so you only blur the image first and pick
the two thresholds:

```rust
use opencv::{core::Size, imgcodecs, imgproc, prelude::*};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // imread returns an empty Mat (not an Err) if the file can't be read
    let img = imgcodecs::imread("input.jpg", imgcodecs::IMREAD_GRAYSCALE)?;
    if img.empty() {
        return Err("could not read input.jpg".into());
    }

    // 1. Smooth with a 5x5 Gaussian kernel (sigma derived from the kernel size)
    let mut blurred = Mat::default();
    imgproc::gaussian_blur_def(&img, &mut blurred, Size::new(5, 5), 0.0)?;

    // 2-4. Gradients, non-maximum suppression and hysteresis thresholding
    let mut edges = Mat::default();
    imgproc::canny_def(&blurred, &mut edges, 50.0, 150.0)?;

    imgcodecs::imwrite_def("edges.png", &edges)?;
    println!("wrote edges.png ({}x{})", edges.cols(), edges.rows());
    Ok(())
}
```

Put an `input.jpg` in the project directory and run `cargo run`. The output is a black image with
white one-pixel edges.

`canny_def` uses OpenCV's defaults: a 3x3 Sobel aperture and the L1 gradient norm. Call
`imgproc::canny` instead to set `aperture_size` or `l2_gradient`.

## Tuning and next steps

- **Thresholds.** The 50/150 pair is a starting point; a high-to-low ratio of 2:1 to 3:1 is the
  usual advice. Raise both for fewer, stronger edges; lower them to pick up faint ones.
- **Viewing results.** `opencv::highgui::imshow("Edges", &edges)?` followed by
  `highgui::wait_key(0)?` opens a window, if your OpenCV build includes the highgui module.
- **Outlines.** To turn edges into shapes, pass the edge image to `imgproc::find_contours` and draw
  them with `imgproc::draw_contours`.
- **Build problems.** Most failures are the crate not finding OpenCV or libclang; the
  [troubleshooting guide](https://github.com/twistedfall/opencv-rust/blob/master/TROUBLESHOOTING.md)
  covers the common ones.

## Further reading

- [opencv crate on docs.rs](https://docs.rs/opencv)
- [opencv-rust examples](https://github.com/twistedfall/opencv-rust/tree/master/examples)
- [OpenCV Canny tutorial](https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html)
