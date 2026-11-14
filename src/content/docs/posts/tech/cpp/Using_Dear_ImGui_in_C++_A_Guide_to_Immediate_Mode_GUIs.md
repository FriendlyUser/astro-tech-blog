---
title: "Dear ImGui in C++: a minimal GLFW and OpenGL 3 setup"
pubDate: "2023-05-03T14:16:44.820Z"
lastUpdated: 2026-11-14
description: "What immediate mode GUIs are, which Dear ImGui files to add to your project, and a complete GLFW + OpenGL 3 program with a window, button and slider."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1992331816.webp
---

[Dear ImGui](https://github.com/ocornut/imgui) is an MIT-licensed C++ library for building
immediate mode GUIs. It's aimed at tools, editors and debug overlays inside games and other
real-time 3D/2D applications rather than at end-user desktop apps.

## What "immediate mode" means

In a retained mode toolkit (Qt, WinForms) you create widget objects once and wire up
callbacks. In Dear ImGui you call widget functions every frame, and they return whether they
were interacted with:

```cpp
if (ImGui::Button("Save"))
    save();
```

There's no widget object to keep in sync with your data: the UI is just code that runs each
frame and reads and writes your variables directly. The library builds vertex buffers that
your renderer draws, and the core has no dependencies beyond the C++ standard library.

## Adding Dear ImGui to a project

Dear ImGui isn't a precompiled library; you compile its sources with your project. From the
repository, copy these into your source tree:

- `imgui.cpp`, `imgui_draw.cpp`, `imgui_widgets.cpp`, `imgui_tables.cpp`
- `imgui_demo.cpp` (optional, but `ImGui::ShowDemoWindow()` is the best reference there is)
- `imgui.h`, `imgui_internal.h`, `imconfig.h`
- `imstb_rectpack.h`, `imstb_textedit.h`, `imstb_truetype.h`

Then pick backends from the `backends/` folder. You need two: a **platform** backend for
windowing and input (e.g. `imgui_impl_glfw.cpp`, `imgui_impl_sdl2.cpp`,
`imgui_impl_win32.cpp`) and a **renderer** backend (e.g. `imgui_impl_opengl3.cpp`,
`imgui_impl_dx11.cpp`, `imgui_impl_vulkan.cpp`). The OpenGL 3 backend includes its own
function loader, so you don't need GLAD or GLEW for it.

## A complete GLFW + OpenGL 3 program

This is a trimmed version of the repository's `examples/example_glfw_opengl3/main.cpp`:

```cpp
#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"
#include <GLFW/glfw3.h> // also pulls in the system OpenGL header
#include <cstdio>

int main() {
    if (!glfwInit())
        return 1;

    // GL 3.0 + GLSL 130. On macOS use GL 3.2 core with forward compat and "#version 150".
    const char* glsl_version = "#version 130";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);

    GLFWwindow* window = glfwCreateWindow(1280, 720, "Dear ImGui example", nullptr, nullptr);
    if (!window) {
        glfwTerminate();
        return 1;
    }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1); // vsync

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGui::StyleColorsDark();
    ImGui_ImplGlfw_InitForOpenGL(window, true); // true = install GLFW input callbacks
    ImGui_ImplOpenGL3_Init(glsl_version);

    float slider_value = 0.0f;

    while (!glfwWindowShouldClose(window)) {
        glfwPollEvents();

        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();

        ImGui::Begin("My First ImGui Window");
        if (ImGui::Button("Click me!"))
            std::puts("Button clicked!");
        ImGui::SliderFloat("Slider", &slider_value, 0.0f, 100.0f);
        ImGui::Text("Value: %.1f", slider_value);
        ImGui::End();

        ImGui::Render();
        int display_w, display_h;
        glfwGetFramebufferSize(window, &display_w, &display_h);
        glViewport(0, 0, display_w, display_h);
        glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

        glfwSwapBuffers(window);
    }

    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
```

On Linux, with the ImGui repository cloned into `imgui/` and GLFW installed, this builds with:

```bash
g++ -std=c++17 main.cpp imgui/imgui*.cpp \
    imgui/backends/imgui_impl_glfw.cpp imgui/backends/imgui_impl_opengl3.cpp \
    -Iimgui -Iimgui/backends $(pkg-config --cflags --libs glfw3) -lGL -o imgui_demo
```

On Windows, link `glfw3` and `opengl32` instead.

## Common mistakes

- Both backends need initializing, a new frame each loop, and shutting down. Forgetting the
  platform backend (`ImGui_ImplGlfw_*`) gives you a window that draws but ignores input.
- `ImGui::Begin()` must always be paired with `ImGui::End()`, even when `Begin()` returns
  false because the window is collapsed.
- Widgets are identified by their label, so two buttons both labelled `"OK"` in the same
  window clash. Use `"OK##first"` / `"OK##second"`, or `ImGui::PushID()`/`PopID()` in loops.
- `slider_value` must outlive the frame, because ImGui reads and writes it every frame.
  Here it lives outside the loop; a `static` local also works.

## Further reading

- [Getting Started wiki page](https://github.com/ocornut/imgui/wiki/Getting-Started)
- [`imgui_demo.cpp`](https://github.com/ocornut/imgui/blob/master/imgui_demo.cpp): every
  widget with source; run `ImGui::ShowDemoWindow()` to browse it
- [FAQ](https://github.com/ocornut/imgui/blob/master/docs/FAQ.md), especially the section on
  widget IDs
