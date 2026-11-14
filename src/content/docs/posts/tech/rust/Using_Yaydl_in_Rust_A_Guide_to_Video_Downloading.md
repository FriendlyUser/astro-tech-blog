---
title: Downloading videos with yaydl and driving it from a Rust program
pubDate: "2023-04-20T14:45:32.911Z"
lastUpdated: 2026-11-14
description: "Install the yaydl video downloader, use its command-line options, and call it from Rust with std::process::Command, since it has no library API."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/336369522.webp
---

:::caution
An earlier version of this post showed `yaydl` used as a library (`yaydl::download_video`,
`DownloadOptions`). That API does not exist: the [`yaydl` crate](https://crates.io/crates/yaydl)
ships only a binary, with no library target. This version uses the command-line tool and calls it
from Rust as a subprocess.
:::

`yaydl` ("yet another youtube (and more) down loader") is a video downloader written in Rust. It
compiles to a single binary with no Python runtime, which is its main difference from tools like
`yt-dlp`. It supports YouTube (through an Invidious instance), Vimeo, direct `.mp4`/`.mpg` links
and a handful of other sites, and can optionally keep only the audio track.

## Installing

With a Rust toolchain installed:

```sh
cargo install yaydl
```

The examples here were checked against yaydl 0.19.0. Some distributions (pkgsrc, Void Linux) also package it, and the
project publishes prebuilt Windows binaries; see the
[README](https://github.com/dertuxmalwieder/yaydl) for links. The licence is CDDL-1.0.

Audio extraction (`--only-audio`) and some format conversions shell out to `ffmpeg`, so install
`ffmpeg` and put it on your `PATH` if you need them.

## Command-line usage

```sh
# Download a video; yaydl picks the file name from the video title
yaydl "https://www.youtube.com/watch?v=jNQXAC9IVRw"

# Choose the output file name
yaydl --output first-video.mp4 "https://www.youtube.com/watch?v=jNQXAC9IVRw"

# Keep only the audio, converted to mp3 (the default audio format)
yaydl --only-audio "https://www.youtube.com/watch?v=jNQXAC9IVRw"

# Audio as ogg instead
yaydl -x -f ogg "https://www.youtube.com/watch?v=jNQXAC9IVRw"
```

The other options are `--verbose` (`-v`), `--keep-temp-file` (`-k`, keep the downloaded video
when extracting audio) and `--webdriver <PORT>` for sites that need a headless browser to run
their JavaScript. There is deliberately no quality or format selection: yaydl downloads what the
site handler picks.

## Calling yaydl from Rust

Because there is no library API, the way to use yaydl from a Rust program is to run the binary
with `std::process::Command`. Create a project:

```sh
cargo new yaydl_rust_example
cd yaydl_rust_example
```

Then replace `src/main.rs`:

```rust
use std::path::Path;
use std::process::Command;

fn download(url: &str, output: &Path) -> Result<(), String> {
    let status = Command::new("yaydl")
        .arg("--output")
        .arg(output)
        .arg(url)
        .status()
        .map_err(|e| format!("could not run yaydl (is it on PATH?): {e}"))?;

    // yaydl can exit with status 0 even when it finds no handler for the URL,
    // so check for the output file as well as the exit status.
    if status.success() && output.exists() {
        Ok(())
    } else {
        Err(format!("yaydl did not produce {} (exit status: {status})", output.display()))
    }
}

fn main() {
    let url = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
    match download(url, Path::new("output.mp4")) {
        Ok(()) => println!("Video downloaded."),
        Err(e) => eprintln!("Error: {e}"),
    }
}
```

`Command::status` inherits stdout and stderr, so yaydl's own progress output shows up in your
terminal. Use `.output()` instead if you want to capture it.

## Gotchas

- **YouTube goes through Invidious.** Since 0.13.0 yaydl fetches YouTube videos via an Invidious
  instance. If the built-in default instance stops working, set `YAYDL_INVIDIOUS_INSTANCE` to the
  URL (including `https://`) of
  [another instance](https://docs.invidious.io/instances/).
- **Web driver sites.** Some handlers need ChromeDriver, msedgedriver or geckodriver running;
  pass its port with `--webdriver` or set `YAYDL_WEBDRIVER_PORT`.
- **Don't trust the exit code alone**, as noted in the code above.
- Only download content you have the right to download, and check the site's terms.

## Further reading

- [yaydl on crates.io](https://crates.io/crates/yaydl)
- [yaydl GitHub mirror](https://github.com/dertuxmalwieder/yaydl) (the upstream repository is
  Fossil at code.rosaelefanten.org)
- [`std::process::Command`](https://doc.rust-lang.org/std/process/struct.Command.html)
