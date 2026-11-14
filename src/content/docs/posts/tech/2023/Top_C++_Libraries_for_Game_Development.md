---
description: "Graphics, physics, audio and networking libraries for C++ games: OpenGL, Vulkan, Ogre, Bullet, Jolt, Box2D, OpenAL Soft, FMOD, ENet and RakNet, with their current status."
imgSrc: /imgs/2023/244959930.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-12-26T06:45:23.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ libraries for game development: graphics, physics, audio and networking"
---

:::caution
RakNet is no longer maintained. Its repository was archived after Oculus/Facebook acquired it, so use ENet or Valve's GameNetworkingSockets for new projects. Bullet is still available but has had no tagged release since 3.25 in 2022.
:::

If you're writing a game in C++ without a full engine like Unreal or Godot, you assemble one from libraries: something to draw, something to simulate physics, something to play sound and something to move packets. Below are the common choices in each area, with notes on what each one does and doesn't do. Several are C libraries with C APIs. They work fine from C++, but you won't get classes or RAII unless you wrap them.

## Graphics

### OpenGL

[OpenGL](https://www.khronos.org/opengl/) is Khronos's cross-platform graphics API. It's the easiest of the low-level APIs to learn because the driver handles memory management and synchronisation for you. That same driver work makes performance harder to predict. Apple deprecated OpenGL in macOS 10.14, so it's a poor choice if you need a long-term Mac target.

OpenGL itself doesn't open windows or load extension functions. You'll typically pair it with:

- [GLFW](https://www.glfw.org/) for windows, OpenGL contexts and keyboard/mouse input (it also works with Vulkan).
- An extension loader such as [glad](https://github.com/Dav1dde/glad) or [GLEW](https://github.com/nigels-com/glew) to load OpenGL function pointers at runtime.

### Vulkan

[Vulkan](https://www.vulkan.org/) is Khronos's explicit, low-overhead API. You manage memory, synchronisation and command buffers yourself, so a "hello triangle" takes hundreds of lines. In return you get predictable performance and good multi-threaded command recording. [Vulkan-Hpp](https://github.com/KhronosGroup/Vulkan-Hpp) provides header-only C++ bindings with type-safe enums, RAII handle wrappers and exceptions or result codes. On macOS and iOS, Vulkan runs through the MoltenVK translation layer on top of Metal.

### Ogre

[OGRE](https://www.ogre3d.org/) is a scene-oriented 3D *rendering* engine, not a game engine: it handles scene graphs, materials, meshes and render passes, but not physics, audio or input. It abstracts over Vulkan, Direct3D and OpenGL back ends. It's a reasonable fit when you want a renderer but intend to write the rest of the engine yourself. The 14.x series is current. OGRE-Next is a separate fork with a different, more modern architecture.

## Physics

### Bullet

[Bullet](https://github.com/bulletphysics/bullet3) provides rigid-body and soft-body dynamics and collision detection. It's widely used in games, film VFX and robotics. Much of the recent work has gone into the PyBullet Python bindings for robotics and machine learning, and the C++ library has seen little release activity since 2022.

### Jolt Physics

[Jolt](https://github.com/jrouwe/JoltPhysics) is a newer, actively maintained rigid-body library designed for multi-core CPUs. It is MIT-licensed and, according to its README, used in *Horizon Forbidden West* and *Death Stranding 2*. For a new 3D project it's worth evaluating before Bullet.

### Box2D

[Box2D](https://box2d.org/) is the standard 2D rigid-body engine: collision, contacts, joints and continuous collision for fast-moving bodies. Version 3 was a rewrite in C with a handle-based C API. The 2.4 series is the last C++ version, so older tutorials using `b2World` and `b2Body*` pointers won't compile against v3.

## Audio

### OpenAL / OpenAL Soft

OpenAL is a 3D positional audio API modelled on OpenGL: you create sources and a listener in 3D space, and it handles distance attenuation and panning. The maintained implementation is [OpenAL Soft](https://openal-soft.org/). Note that OpenAL plays raw PCM buffers. It doesn't decode WAV, Ogg or MP3, so you need a decoder such as libsndfile, stb_vorbis or dr_libs alongside it.

### FMOD

[FMOD](https://www.fmod.com/) is commercial audio middleware. The FMOD Core API plays and mixes sounds with DSP effects. FMOD Studio adds a designer-facing tool for building adaptive music and event-driven sound that the game triggers by name. Check the licensing terms on its website before you ship; there is a free tier for small independent projects. Wwise is the main commercial alternative. If you want something open-source and small, look at [miniaudio](https://miniaud.io/).

## Networking

### ENet

[ENet](http://enet.bespin.org/) is a small C library that layers optional reliability, ordering, channels and fragmentation on top of UDP. It's a common default for indie multiplayer games. It handles the transport only. State replication, interpolation and lag compensation are up to you.

### GameNetworkingSockets

Valve's [GameNetworkingSockets](https://github.com/ValveSoftware/GameNetworkingSockets) is the open-source transport behind Steam's networking. It offers connection-oriented, message-based reliable and unreliable delivery, encryption (AES-GCM with Curve25519 key exchange) and tools for simulating latency and packet loss. It's heavier than ENet, but you get encryption and better diagnostics.

### RakNet (archived)

[RakNet](https://github.com/facebookarchive/RakNet) used to be a popular choice because it bundled object replication, RPCs and NAT punch-through. The repository is archived and unmaintained, so only use it to read or port old code.

## Choosing

- Learning graphics: OpenGL with GLFW and glad. Shipping a modern renderer: Vulkan (or Direct3D 12 / Metal per platform).
- 2D game: Box2D. 3D game: Jolt (it also has soft bodies), or Bullet if you already depend on it.
- Simple audio: miniaudio or OpenAL Soft. Designer-driven audio: FMOD or Wwise.
- Networking: ENet for simplicity, GameNetworkingSockets if you need encryption.

If you find yourself wiring all of these together, compare the effort with using an engine. Godot, for example, is open-source and already integrates rendering, physics, audio and networking.
