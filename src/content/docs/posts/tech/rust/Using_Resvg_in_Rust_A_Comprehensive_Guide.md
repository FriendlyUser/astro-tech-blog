---
tags: ['rust']
title: Rendering SVG to PNG in Rust with resvg
description: How to parse an SVG with usvg, render it with resvg into a tiny-skia pixmap, scale the output, and save it as a PNG using the current resvg API.
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1340975325.webp"
---

[resvg](https://github.com/linebender/resvg) is an SVG renderer written in Rust. It's split into three crates that you use together:

- **usvg** parses SVG and simplifies it into a render tree (resolving CSS, `use` elements, text-to-paths and so on).
- **resvg** renders that tree.
- **tiny-skia** is the 2D raster backend that resvg draws into, and it can encode the result as PNG.

The `resvg` crate re-exports `usvg` and `tiny_skia`, so one dependency is enough. A common use is turning SVG icons, charts or diagrams into PNGs in a build script or a server, without shelling out to Inkscape or a headless browser.

The code here targets resvg 0.50.0. The API has changed several times since 0.19 (the version this post originally used): `usvg::Tree::from_file`, `usvg::FitTo`, `resvg::Options` and `resvg::Image` no longer exist, so older examples won't compile.

## Adding the dependency

```toml
[dependencies]
resvg = "0.50.0"
```

All default features are on, including `text` and `system-fonts` (needed to render `<text>`) and `raster-images` (embedded PNG/JPEG/GIF/WebP).

## Converting an SVG file to PNG

The flow is: read the bytes, parse them into a `usvg::Tree`, create a `Pixmap` the size of the image, render, save.

```rust
use resvg::{tiny_skia, usvg};
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let input = "assets/example.svg";
    let output = "example.png";

    let mut opt = usvg::Options::default();
    // Resolve relative paths in <image href="..."> against the SVG's folder
    opt.resources_dir = std::fs::canonicalize(input)
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    // Without fonts, <text> elements are skipped
    opt.fontdb_mut().load_system_fonts();

    let svg_data = std::fs::read(input)?;
    let tree = usvg::Tree::from_data(&svg_data, &opt)?;

    let size = tree.size().to_int_size();
    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or("SVG has zero width or height")?;

    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    pixmap.save_png(output)?;

    println!("Wrote {output}");
    Ok(())
}
```

This is close to the [minimal example](https://github.com/linebender/resvg/blob/main/crates/resvg/examples/minimal.rs) in the resvg repository. A few details:

- `Tree::from_data` takes raw bytes and also accepts gzip-compressed `.svgz` (via the default `svgz` feature). There's also `Tree::from_str` if you already have a `&str`.
- `Pixmap::new` returns `None` for a zero-sized image, hence the `ok_or`.
- `load_system_fonts()` scans the system font directories, which takes a noticeable amount of time. If you render many SVGs, build the `Options` once and reuse it.

## Rendering at a different size

`resvg::render` takes a `tiny_skia::Transform`, so scaling is a matter of making the pixmap bigger and passing a scale transform. This renders at 2x, for example for high-DPI icons:

```rust
use resvg::{tiny_skia, usvg};

fn render_scaled(tree: &usvg::Tree, scale: f32) -> Option<tiny_skia::Pixmap> {
    let size = tree.size();
    let width = (size.width() * scale).ceil() as u32;
    let height = (size.height() * scale).ceil() as u32;

    let mut pixmap = tiny_skia::Pixmap::new(width, height)?;
    resvg::render(
        tree,
        tiny_skia::Transform::from_scale(scale, scale),
        &mut pixmap.as_mut(),
    );
    Some(pixmap)
}
```

To fit a target width instead, compute `scale = target_width as f32 / size.width()`. If you need the PNG bytes rather than a file (for an HTTP response, say), `pixmap.encode_png()` returns a `Vec<u8>`.

## Limitations

resvg renders static SVG. It doesn't run scripts or animations, and it has no interactivity. The pixmap starts transparent, so if you want a background color call `pixmap.fill(...)` before rendering. The repository's README documents which parts of the SVG spec are supported.

## Further reading

- [resvg API docs](https://docs.rs/resvg/latest/resvg/)
- [usvg API docs](https://docs.rs/usvg/latest/usvg/)
- [resvg on GitHub](https://github.com/linebender/resvg)
