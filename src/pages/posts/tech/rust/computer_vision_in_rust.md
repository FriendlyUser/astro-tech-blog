---
title: "Jumpstarting Computer Vision in Rust: A Beginner's Guide"
description: Computer vision is important because it allows machines to interpret and understand visual information in a way that is similar to how humans do. In this article we explore how to use OpenCV in Rust.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/235824961.png'
---


Computer vision is important because it allows machines to interpret and understand visual information in a way that is similar to how humans do. With the increasing availability of digital cameras and sensors, there is an abundance of visual data being generated every day. Computer vision enables machines to automatically analyze and make sense of this data, which has numerous practical applications in various industries. For example, computer vision is used in healthcare for medical image analysis, in autonomous vehicles for object detection and recognition, in security and surveillance for facial recognition, and in manufacturing for quality control and inspection. Overall, computer vision is a crucial tool for enabling machines to understand and interact with the visual world in a way that is useful and beneficial to humans.


Here are the basic steps to use OpenCV in Rust:

1. Install OpenCV. This can be done through:

- Your system's package manager (apt, brew, etc.)
- Building from source
- Using a wrapper like opencv-rust which builds OpenCV for you

2. Install the opencv crate which provides Rust bindings to OpenCV. You can add it to your Cargo.toml:

```toml
[dependencies]
opencv = "0.11.2"
```

3. Add OpenCV to your crate by importing it:

```rust
extern crate opencv;
```

4. Load the OpenCV library. This is done with:

```rust
opencv::init().unwrap(); 
```

5. You can now call OpenCV functions. For example, to load an image:

```rust
let mut img = cv::imread("path/to/image.jpg", cv::IMREAD_COLOR).unwrap();
```

6. OpenCV functions operate on OpenCV types like:

- Mat for images
- Rect for rectangles 
- Point for points 
- Scalar for colors

These can be created from Rust types and vice versa. For example:

```rust
let rect = Rect::new(10, 20, 100, 50); // OpenCV Rect
let rust_rect = rect.to_rust(); // Rust (i32, i32, u32, u32) 

let scalar = Scalar::new(0.0, 255.0, 0.0, 0.0); // OpenCV color
let (b, g, r, a) = scalar.to_rust(); // Rust (f64, f64, f64, f64)
```

7. You can now perform OpenCV operations on these types like image filtering, drawing shapes, face detection, etc.


For example we can implement the canny edge detection algorithm in Rust:

Canny edge detection is a computer vision algorithm used to detect edges in images. It was developed by John F. Canny in 1986 and is widely used in various applications such as object recognition, image segmentation, and feature extraction.

The canny edge detection algorithm works by first applying a Gaussian filter to the image to smooth out any noise. Then, the gradient of the image is calculated to determine the regions of the image where the intensity changes the most. These regions are likely to be edges.

After the gradient is calculated, non-maximum suppression is applied to thin out the edges to a single pixel width. This helps to remove any noise and makes the edges more precise.

The final step is to apply hysteresis thresholding to the image. This involves setting two threshold values: a high threshold and a low threshold. Any edges above the high threshold are considered strong edges, while any edges below the low threshold are considered weak edges. Any weak edges that are adjacent to strong edges are then included in the final edge map.

```rust
extern crate opencv;

fn main() {
    // Load the OpenCV library 
    opencv::init().unwrap();

    // Read the input image
    let mut img = cv::imread("input.jpg", cv::IMREAD_GRAYSCALE).unwrap();

    // Apply Gaussian blur to smooth the image and remove noise
    let mut blurred = img.clone();
    cv::GaussianBlur(&mut blurred, &mut blurred, (5, 5), 0.0).unwrap();

    // Find the intensity gradients of the image
    let mut grad_x = Mat::default();
    let mut grad_y = Mat::default();
    cv::Scharr(&blurred, &mut grad_x, ddepth, 1, 0, src_type, 1, 0, border_type);
    cv::Scharr(&blurred, &mut grad_y, ddepth, 0, 1, src_type, 1, 0, border_type);

    // Calculate the gradient magnitude and direction
    let mut grad_mag = Mat::default();
    let mut grad_dir = Mat::default();
    cv::cartToPolar(&grad_x, &grad_y, &mut grad_mag, &mut grad_dir, true);

    // Apply non-maximum suppression to the gradient magnitude
    let mut suppressed = Mat::default();
    cv::Canny(&grad_mag,
               &mut suppressed,           
               grad_thresholds.low_threshold, 
               grad_thresholds.high_threshold,
               aperture_sz, 
               L2gradient);

    // Apply double thresholding to gradients
    let mut contours = Mat::default();
    cv::Canny(&suppressed, 
               &mut contours, 
               grad_thresholds.low_threshold,
               grad_thresholds.high_threshold);
              
    // Find contours and draw edges            
    let mut hierarchy = Mat::default();
    let contours = contours.to_vec().unwrap();
    cv::findContours(&contours, &mut hierarchy, cv::RETR_TREE, cv::CHAIN_APPROX_SIMPLE);
    cv::drawContours(&img, contours, -1, Scalar::new(255.0, 0.0, 0.0, 0.0), 2, 8, &hierarchy, 100, Point::default());

    // Show the result
    cv::imshow("Edges", &img).unwrap();
    cv::waitKey(0).unwrap();
}
```

Explanation:

1. Load and smooth the input image using Gaussian blur
2. Calculate the intensity gradients of the image using Scharr operators. This gives us the gradient magnitude and direction.
3. Apply non-maximum suppression to the gradient magnitude to thin out edges 
4. Apply double thresholding to the gradient magnitude to detect edge contours
5. Find contours and draw them on the original image to get the final result
6. Display the output image



Overall, canny edge detection is a powerful tool for detecting edges in images, and it is widely used in various computer vision applications.