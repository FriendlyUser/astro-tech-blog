---
title: "Optimizing PNG files from Rust with the oxipng crate"
pubDate: "2023-04-20T14:45:32.788Z"
lastUpdated: 2026-11-14
description: "Use oxipng as a Rust library to losslessly shrink PNG files on disk or in memory, and tune its presets, filters, metadata stripping and Zopfli."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/549017699.png
---

[oxipng](https://github.com/shssoichiro/oxipng) is a lossless PNG optimizer written in Rust. It tries different color type and bit depth reductions, row filters and DEFLATE settings, then keeps whichever encoding is smallest. The pixels don't change, only the file size. Most people use it as a CLI, but it's also a library, which is handy when your app generates or receives PNGs and you want to shrink them before storing or serving them.

The examples below are written against oxipng 10.2.1. The API changed a lot between the 0.x/2.x releases and now, so older snippets you find online (including the original version of this post) won't compile.

## Adding the dependency

```toml
[dependencies]
oxipng = "10.2.1"
```

The default features are `binary`, `parallel` and `zopfli`. `binary` pulls in the CLI's dependencies (clap, env_logger, glob, parse-size), which a library user doesn't need. You can turn it off and keep the rest:

```toml
[dependencies]
oxipng = { version = "10.2.1", default-features = false, features = ["parallel", "zopfli"] }
```

## Optimizing a file on disk

`optimize` takes an `InFile`, an `OutFile` and `Options`. It returns a `Result` whose `Ok` value is a tuple of the original and optimized sizes in bytes.

```rust
use oxipng::{optimize, InFile, Options, OutFile};
use std::path::PathBuf;

fn main() {
    let input = InFile::Path(PathBuf::from("input.png"));
    let output = OutFile::from_path(PathBuf::from("optimized.png"));
    let options = Options::default();

    match optimize(&input, &output, &options) {
        Ok((before, after)) => println!("{before} -> {after} bytes"),
        Err(err) => eprintln!("Optimization failed: {err}"),
    }
}
```

`OutFile::Path { path: None, .. }` overwrites the input in place, and `OutFile::None` runs the optimization without writing anything, which is useful if you only want to know how much you'd save.

## Optimizing bytes in memory

If the PNG is already in a `Vec<u8>` (an upload, or something you just encoded with the `image` or `png` crate), use `optimize_from_memory` and skip the temporary file:

```rust
use oxipng::{optimize_from_memory, Options};

fn shrink(png: &[u8]) -> Result<Vec<u8>, oxipng::PngError> {
    optimize_from_memory(png, &Options::default())
}
```

## Customizing the options

`Options::from_preset(level)` gives you the same presets as the CLI's `-o` flag (0 to 6; the default is 2). Higher presets try more filter combinations and are slower. `Options::max_compression()` is the most thorough setting. Start from a preset and override individual fields:

```rust
use oxipng::{indexset, optimize, Deflater, FilterStrategy, InFile, Options, OutFile, RowFilter, StripChunks};
use std::path::PathBuf;

fn main() {
    let mut options = Options::from_preset(4);
    // Drop every non-critical chunk (text, EXIF, color profiles, etc.)
    options.strip = StripChunks::All;
    // Write a non-interlaced image (Some(true) would force Adam7 interlacing)
    options.interlace = Some(false);
    // Highest libdeflate compression level (0-12)
    options.deflater = Deflater::Libdeflater { compression: 12 };
    // Only try the Paeth filter and the entropy heuristic
    options.filters = indexset! {
        FilterStrategy::Basic(RowFilter::Paeth),
        FilterStrategy::Entropy,
    };

    let input = InFile::Path(PathBuf::from("input.png"));
    let output = OutFile::from_path(PathBuf::from("optimized.png"));

    match optimize(&input, &output, &options) {
        Ok((before, after)) => println!("{before} -> {after} bytes"),
        Err(err) => eprintln!("Optimization failed: {err}"),
    }
}
```

Some notes on these fields:

- `strip`: `StripChunks::None` (the default) keeps metadata, `Safe` removes chunks that don't affect how the image is displayed, and `All` removes every non-critical chunk. `All` also removes color profile chunks, which can change how colors render, so `Safe` is the better choice if you aren't sure.
- `interlace`: interlaced PNGs are usually *larger*. Only turn it on if you need progressive loading.
- `deflater`: `Deflater::Zopfli(...)` (behind the `zopfli` feature) compresses better than libdeflate but is much slower. It's fine for a build step that optimizes static assets once, and a bad idea on a request path.
- `timeout`: an `Option<Duration>` that caps how long oxipng spends trying alternatives. Set it if you run oxipng on user uploads.

## When not to bother

oxipng is lossless, so the gains depend on how badly the input was encoded. PNGs exported from image editors or screenshot tools often shrink a lot. PNGs that have already been through oxipng, pngcrush or similar tools barely shrink at all. If you need a much smaller file and can accept some loss, a lossy step (palette quantization with something like pngquant, or switching to WebP/AVIF) will do more than any lossless optimizer.

## Further reading

- [oxipng API docs on docs.rs](https://docs.rs/oxipng/latest/oxipng/)
- [oxipng on GitHub](https://github.com/shssoichiro/oxipng)
