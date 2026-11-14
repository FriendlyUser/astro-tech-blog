---
tags: ['rust']
title: "OpenGMK: building the Rust GameMaker Classic runner, TAS tools and decompiler"
description: "OpenGMK is a Rust rewrite of the GameMaker Classic (GM8) runner with TAS tooling and a decompiler. How to build it from source and run, record and decompile games."
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1340975325.png"
---

:::caution
An earlier version of this post described OpenGMK as an "Open Generalized Markup Language" with a Rust
library called `opengmk-rs`. Neither exists: there is no such markup language, and no `opengmk-rs` (or any
`opengmk`) crate on crates.io. The code samples were invented and have been removed. The real OpenGMK is
described below.
:::

[OpenGMK](https://github.com/OpenGMK/OpenGMK) is an open-source rewrite, in Rust, of the runners for
*GameMaker Classic*, the pre-Studio versions of GameMaker such as GameMaker 8. It plays old GM8-era game
executables and adds tooling the original engine never had, mainly for tool-assisted speedruns (TAS). It is
licensed GPL-2.0 and, per its README, is a work in progress maintained by a few people in their free time.
GameMaker: Studio games are not supported.

It isn't a library you add to `Cargo.toml`; it's a Cargo workspace of programs and supporting crates:

- **`gm8emulator`**: the runner. Plays a game, and records and replays TAS input with savestates.
- **`gm8decompiler`**: extracts the assets (sprites, rooms, GML code) from a game executable and rebuilds a
  GameMaker project file (`.gmk` / `.gm81`). It was previously the standalone
  [GM8Decompiler](https://github.com/OpenGMK/GM8Decompiler) project.
- Supporting crates for reading GameMaker executables and parsing GML, plus `gm8emulator-wow64`, a helper
  needed on 64-bit Windows for games that load 32-bit DLLs.

## Building from source

The README recommends building from source because the pre-built releases are old. You need a Rust
toolchain; on Windows only the MSVC toolchain is supported. The repository uses git submodules:

```sh
git clone --recurse-submodules https://github.com/OpenGMK/OpenGMK
cd OpenGMK
cargo build --release
```

The `gm8emulator` and `gm8decompiler` binaries end up in `target/release`. Games that depend on 32-bit DLLs
also need the WoW64 server, built separately for the `i686-pc-windows-msvc` target; see the README for the
exact steps.

## Running a game

Pass the game's executable:

```sh
gm8emulator path/to/game.exe
```

## Recording a TAS

Add a project name with `-n` to start (or continue) recording:

```sh
gm8emulator path/to/game.exe -n my-run
```

In record mode each savestate is written as a `save#.bin`. You can export a `save#.gmtas`, which holds only
the inputs and is the file to share. Savestates can break between OpenGMK versions, so keep the `.gmtas`:
replaying it regenerates the `.bin`. To do that quickly with the frame limiter off (`-l`):

```sh
gm8emulator path/to/game.exe -l -f path/to/save1.gmtas -o path/to/save1.bin
```

On Windows, TAS projects are stored in a `projects/` folder.

## Decompiling a game

`gm8decompiler` takes a GameMaker 8.x executable and writes back a project file you can open in the original
GameMaker editor. The README doesn't document its command-line options, so check the `gm8decompiler`
source in the repository for the flags your build supports.

## Limitations

- The README says a stable release may never happen; expect savestate formats to change between builds.
- The README documents the Windows TAS project folder; the Linux location is described as a near-future feature.
- If you're interested in emulator or interpreter internals, the source is a readable reference for how
  GameMaker Classic executables and GML are structured.

## Further reading

- [OpenGMK on GitHub](https://github.com/OpenGMK/OpenGMK) (README covers building, TAS workflow and known
  limitations)
- [GM8Decompiler](https://github.com/OpenGMK/GM8Decompiler)
