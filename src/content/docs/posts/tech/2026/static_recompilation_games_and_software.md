---
title: "Static Recompilation: How Old Games (and Old Software) Become Native Apps"
description: "How N64Recomp, XenonRecomp and the 2026 wave of recomps turn console binaries into native PC ports, why nobody recompiles Photoshop, and where AI fits in."
tags: ["Recompilation", "Reverse Engineering", "Game Preservation", "N64", "Xbox 360", "Emulation", "C++"]
pubDate: "2026-11-11T16:00:00.000Z"
imgSrc: "/imgs/2026/static_recompilation_games_and_software.webp"
imgAlt: "MIPS assembly from a game ROM being translated into C code and then a native game.exe"
---

Two years ago "recomp" meant one project: Zelda 64: Recompiled, a native PC version of Majora's Mask. In November 2026 there are recomps for Xbox 360, PS2, Wii U and Switch games. One PS2 project runs in the browser through WebAssembly. Some of the newest projects say Claude Code wrote most of their code, while others ban generative AI outright.

This post explains what static recompilation is, how the main tools work, and what changed in 2026. It also covers why the same trick is rarely used on desktop software like Photoshop.

## Emulation, decompilation and recompilation

There are three ways to run old software on new hardware:

- **Emulation** runs the original machine code inside a simulated CPU and GPU, every time you play. It works for whole game libraries, but it is slow to do accurately and hard to modify.
- **Decompilation** rebuilds human-readable C source that compiles back to a byte-identical ROM. The Super Mario 64 and Ocarina of Time decomps are the famous examples. Once that exists, a PC port is "just" a port. Getting there takes years of matching functions by hand.
- **Static recompilation** translates the game's machine code into C or C++ ahead of time and compiles that with a normal compiler. The output is not meant to be readable. Only the hardware layer (graphics, audio, input, OS calls) is replaced with native code.

Recompilation sits in the middle. You get a native executable that can be patched and modded like a decomp, without waiting for a full decomp to be finished.

## N64Recomp: the project that started the wave

[N64Recomp](https://github.com/N64Recomp/N64Recomp) by Mr-Wiseguy (MIT licensed, about 8.4k stars) translates N64 MIPS instructions into C, one instruction at a time and deliberately literally:

```c
// MIPS: lw $a0, 0x10($t0)   ->   C operating on a context struct
ctx->r4 = MEM_W(0x10, ctx->r8);

// MIPS: jal func_80241A30   ->   a plain C function call
func_80241A30(rdram, ctx);
```

The README credits two earlier projects as prior art: jamulator, an NES static recompiler, and the static recompilation of the IDO compiler.

A few details make this work on real games:

- **Jumps.** `jal` calls become C function calls, and jump tables (`jr` through a table) become `switch` statements.
- **Overlays.** N64 games swap code in and out of memory. The tool tracks those overlays and their relocations.
- **Runtime.** The generated code needs one: N64ModernRuntime provides memory, threads and audio.
- **Rendering.** Graphics go through [RT64](https://github.com/rt64/rt64), a modern renderer with widescreen, high frame rates and ray-traced-style effects.

[Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) shipped v1.0.0 on May 10, 2024. Its FAQ says it is not built on the Majora's Mask decomp source. That is the point: recompilation can produce a port of a game that has no decomp. It does use headers and a few functions from the decomp project for its patches. You supply your own ROM, and the project ships none of the game.

Other N64 ports have followed. [Banjo: Recompiled](https://github.com/BanjoRecomp/BanjoRecomp) reached v1.0.0 on January 24, 2026.

## Xbox 360: XenonRecomp and ReXGlue

[XenonRecomp](https://github.com/hedge-dev/XenonRecomp) (MIT, about 6.7k stars) applies the same idea to the Xbox 360's PowerPC CPU. Its README says it was heavily inspired by N64Recomp. The 360 adds two complications:

- **Endianness.** The 360 is big-endian, so every load and store byte-swaps.
- **Vector instructions.** VMX128 instructions map to x86 SSE intrinsics, or to SIMDe on ARM64.

A companion tool, XenonAnalyse, finds function boundaries and jump tables. XenonRecomp ships no runtime, so each port builds its own.

The best-known result is [Unleashed Recompiled](https://github.com/hedge-dev/UnleashedRecomp), a native port of the 360 version of Sonic Unleashed (v1.0.0 on March 1, 2025). It was created and led by Skyth, with Sajid (XenonAnalyse and the kernel layer) and Darío (the graphics layer).

In January 2026 the [ReXGlue SDK](https://github.com/rexglue/rexglue-sdk) appeared. It is a reusable Xbox 360 recompilation runtime that borrows heavily from the Xenia emulator. Several 2026 ports are built on it, most visibly [Skate 3](https://github.com/mchughalex/skate3recomp): v1.0.0 came out on June 4, 2026, and v2.0 replaced the GPU emulation with a native D3D12/Vulkan renderer.

## What changed in 2026

**More consoles.**
- [PS2Recomp](https://github.com/ran-j/PS2Recomp) translates the PS2's R5900 (another MIPS variant) into C++. It had its first tagged releases in February and March 2026, and it is still early-stage.
- [Wind Waker HD Recomp](https://github.com/ZeldaWWHDRecomp/ZeldaWWHDRecomp) brought the Wii U into it. It reimplements the Cafe OS layer and renders through Vulkan or Metal without Cemu. v0.1.0 shipped on October 5, 2026, and v0.5.1 on November 6.
- Smaller October projects target the Wii, PSP, PS1, GBA, Dreamcast and even x86 PC games.

**The browser as a target.** [ps2-web-recomp](https://github.com/snuri00/ps2-web-recomp) (created October 8, 2026) compiles recompiled PS2 code to WebAssembly and renders with WebGPU. It streams the disc image over HTTP range requests. Its README claims Gran Turismo 4 runs at full speed; I have not tried it.

**Switch-era games.** Projects for Breath of the Wild, Tears of the Kingdom and Link's Awakening appeared in October 2026, with very fast release cadences. These are recent first-party games, which raises the legal stakes; more on that below.

**AI on both sides of the argument.**
- **Projects built with AI.** The SavageWindRecomp (Breath of the Wild) README says it was made "almost entirely with AI" through Claude Code. The Tears of the Kingdom project says most of its code was written by Claude Code agents.
- **Earlier evidence.** In November 2025 [Chris Lewis wrote about](https://blog.chrislewis.au/the-unexpected-effectiveness-of-one-shot-decompilation-with-claude/) using Claude for matching decompilation of an N64 game. He paired it with the standard tools (splat, m2c, decomp-permuter, asm-differ), which can verify whether a decompiled function actually matches.
- **Projects that ban AI.** Banjo: Recompiled's README has a "No-AI stance": the team does not use generative AI, and contributions made with it are banned.

Both positions make sense. Recompilation and matching decompilation are unusually good fits for an AI agent, because a compiler and a byte-for-byte diff tell you whether the output is right. But the people who built the toolchains did years of careful work, and some of them don't want to review AI-generated pull requests or inherit the provenance questions.

## Why nobody recompiles Photoshop

Old desktop software has the same problem as old consoles: the platform it was built for is going away. Apple announced at WWDC 2025 that Rosetta 2 is fully supported through macOS 27 and then mostly removed in macOS 28, keeping only a subset for older games. macOS 26.4 already warns about apps that will stop working. On Windows on Arm, Microsoft's Prism emulator added AVX and AVX2 support in late 2025, so more x86 software runs, but it is still emulation.

So why not statically recompile an old copy of Photoshop the way people recompile Majora's Mask? I couldn't find a single project that does, and the reasons are structural:

- **Consoles are closed, fixed machines.** An N64 game talks to one CPU, one GPU and a small OS, so replacing "the hardware layer" is a bounded job. A desktop app talks to thousands of OS APIs, shared libraries, printer drivers, colour management, plugins and font systems. All of those would need reimplementing.
- **Desktop apps generate and load code at runtime.** Plugins, scripting engines and JIT compilers all do this. A static translator only sees the code in the original binary.
- **Licensing is different.** A game you own is a finished product. Commercial desktop software is licensed, often activated online, and protected against tampering. Recompiling it is a legal problem before it is a technical one.

What exists instead:

- **Source releases.** The Computer History Museum published the [source code of Photoshop 1.0.1](https://computerhistory.org/blog/adobe-photoshop-source-code/) in February 2013, with Adobe's permission and under a non-commercial license. It is about 128,000 lines of Pascal and 68k assembly. You can read and study it, but nobody has turned it into a maintained native app.
- **Clean-room reimplementations, now often AI-built.** [PhotoCraft](https://github.com/storytold/photocraft), created on September 30, 2026, describes itself as an open-source, clean-room reimplementation of Photoshop in pure Rust. It has layers, masks, adjustment layers and PSD support, and it is in early alpha. It is not a recompilation: no Adobe code goes in. It has also gathered tens of thousands of GitHub stars in six weeks, which says a lot about how much interest there is.
- **Keeping the old platform alive.** That means VMs, compatibility layers and emulators: the same tools games had before recomps existed.

The useful idea that does carry over from games is the split between "translate the logic" and "replace the platform layer". That is what Rosetta, Prism and Wine do dynamically, at runtime, for everything. Recomps do it statically, once, for one program that someone cares enough about to finish.

## The legal framing

Every serious recomp project uses the same model:

- **No game data is distributed.** The repository holds the tool and the runtime, and you supply files from a copy you own.
- **Builds are not to be shared.** Projects like the Tears of the Kingdom port warn that the built result contains the game and must not be shared.
- **No keys or dumping tools are included.**

That has mostly held for older consoles. In November 2026 several Switch-era recomp projects disappeared from GitLab and GitHub, and [reporting at the time](https://cdromance.com/news/power-moon-recomp-and-other-fan-pc-ports-vanish-from-gitlab-and-github-cause-unknown) said the cause was unknown, with no published DMCA notice. Separately, Nintendo did file a [DMCA notice on November 6, 2026](https://www.techpowerup.com/354704/nintendo-dmca-notice-takes-down-144-switch-modchip-firmware-repos-on-github) that removed 144 Switch modchip firmware repositories; those were not recomps. If you follow this scene, the older-console projects (N64, Xbox 360, PS2) are on much firmer ground than ports of games still sold today.

## Where to start

- **To play something:** Zelda 64: Recompiled, Banjo: Recompiled and Unleashed Recompiled are the polished, finished examples. They are good for seeing what "native" buys you over emulation: instant loading, high frame rates, widescreen and mods.
- **To understand the technique:** read the N64Recomp README and the generated C for a small function, then compare it with the same function in the Majora's Mask decomp.
- **To build one:** start from a platform that already has a runtime (N64ModernRuntime, ReXGlue). The translator is the easy part; the runtime and renderer are where the years go.

## More from this week

This is part of a series of posts from November 8 to 14, 2026:

- [Recording API Traffic in Chrome: HAR Files, the Recorder and Replaying It in Tests](/posts/tech/2026/recording_api_traffic_in_chrome/)
- [Vue 3 Six Years On: What Changed from 3.0 to 3.6](/posts/tech/2026/vue_3_since_launch/)
- [Vue 3 Frameworks in 2026, and What Changed in Astro](/posts/tech/2026/vue_frameworks_and_astro_in_2026/)
- [AI Investing Research Systems: ai-berkshire and the Agents Built on Buffett](/posts/tech/2026/ai_investing_research_systems/)
- [AI in Fall 2026: Gated Frontier Models, Computer Use and a Stateless MCP](/posts/tech/2026/ai_advancements_fall_2026/)
- [What Changed in Claude Code in 2026](/posts/tech/2026/claude_code_changes_2026/)
