---
title: Using Dear ImGui in C++ A Guide to Immediate Mode GUIs
pubDate: "2023-05-03T14:16:44.820Z"
description: "By the end of this article, you will have a clear understanding of how to use ImGui to create simple, functional GUIs in your applications."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1992331816.png
---
# Using Dear ImGui in C++: A Guide to Immediate Mode GUIs

Dear ImGui is a powerful, lightweight, and easy-to-use library for creating immediate mode graphical user interfaces (GUIs) in C++ applications. In this article, we'll explore the fundamental concepts behind ImGui, its benefits, and provide a step-by-step guide for integrating ImGui into a C++ project. By the end of this article, you will have a clear understanding of how to use ImGui to create simple, functional GUIs in your applications.

## What is Dear ImGui?

Dear ImGui, often referred to simply as ImGui, is an open-source, bloat-free graphical user interface library for C++. It is designed to be embedded into 3D and 2D applications and provides a fast and straightforward way to create tools, debug utilities, and other user interfaces. ImGui operates on an immediate mode basis, meaning that GUI elements are created and handled in real-time within your application's main loop.

Some key features of ImGui include:

- Easy, minimalistic API with a small learning curve
- Support for a wide range of rendering backends, including OpenGL, DirectX, Vulkan, and more
- Highly customizable and themable
- No external dependencies, making it easy to integrate into existing projects
- Efficient and optimized for performance

## Setting up Dear ImGui in a C++ Project

To get started with ImGui, you need to download the source files from the [Dear ImGui GitHub repository](https://github.com/ocornut/imgui). The repository contains the core ImGui source files, as well as examples showcasing different rendering backends and integrations.

For this guide, we'll assume that you have a working C++ project with a graphics library such as OpenGL, DirectX, or Vulkan already set up. If you don't have a project ready, consider using one of the provided examples as a starting point.

### Integrating ImGui into Your Project

1. Copy the following files from the ImGui repository into your project's source directory:

   - `imgui.
   - `imgui.h`
   - `imgui_draw.
   - `imgui_widgets.
   - `imgui_tables.
   - `imgui_internal.h`
   - `imconfig.h`
   - `imstb_rectpack.h`
   - `imstb_textedit.h`
   - `imstb_truetype.h`

2. Choose a rendering backend based on your graphics library (e.g., `imgui_impl_opengl3. and `imgui_impl_opengl3.h` for OpenGL) and copy the relevant files into your project's source directory.

3. Include the ImGui header files in your source code:

   ````cpp
   #include "imgui.h"
   #include "imgui_impl_opengl3.h" // Replace with the appropriate backend
   ```

4. Initialize ImGui and the rendering backend in your application:

   ````cpp
   // Inside your setup function
   IMGUI_CHECKVERSION();
   ImGui::CreateContext();
   ImGuiIO &io = ImGui::GetIO(); (void)io;
   ImGui::StyleColorsDark(); // Choose a default theme

   // Initialize the backend (e.g., OpenGL)
   ImGui_ImplOpenGL3_Init("#version 150"); // Set the appropriate version for your graphics library
   ```

5. Integrate ImGui into your main loop:

   ````cpp
   while (!glfwWindowShouldClose(window)) // Replace with your window loop condition
   {
       glfwPollEvents(); // Poll events for your windowing system

       ImGui_ImplOpenGL3_NewFrame(); // New frame for the backend
       ImGui::NewFrame();

       // ImGui code goes here

       ImGui::Render();
       int display_w, display_h;
       glfwGetFramebufferSize(window, &display_w, &display_h);
       glViewport(0, 0, display_w, display_h);
       glClear(GL_COLOR_BUFFER_BIT);
       ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

       glfwSwapBuffers(window); // Swap buffers for your windowing system
   }
   ```

6. Clean up ImGui and the rendering backend when your application exits:

   ````cpp
   // Inside your cleanup function
   ImGui_ImplOpenGL3_Shutdown(); // Shutdown the backend
   ImGui::DestroyContext();
   ```

## Creating GUI Elements with ImGui

With ImGui integrated into your project, you can now create various GUI elements such as windows, buttons, sliders, and more. ImGui offers an extensive list of widgets to create rich and interactive user interfaces.

Here's an example of creating a simple window with a button and a slider:

```cpp
// Inside your main loop, after ImGui::NewFrame()

ImGui::Begin("My First ImGui Window");

if (ImGui::Button("Click me!"))
{
    // Respond to button click
    std::cout << "Button clicked!" << std::endl;
}

static float slider_value = 0.0f;
ImGui::SliderFloat("Slider", &slider_value, 0.0f, 100.0f);

ImGui::End();
```

In this example, we start by creating a new window using `ImGui::Begin()`, passing in the window title. Next, we create a button using `ImGui::Button()`, which returns true when the button is clicked. We then create a slider using `ImGui::SliderFloat()`, providing a label, a reference to a float variable, and the minimum and maximum values for the slider.

To explore more widgets and customize your GUI further, refer to the [ImGui documentation](https://github.com/ocornut/imgui/blob/master/docs/README.md) and the [ImGui demo code](https://github.com/ocornut/imgui/blob/master/imgui_demo.cpp) for comprehensive examples and explanations.

## Conclusion

Dear ImGui is a powerful and versatile library for creating immediate mode GUIs in C++ applications. Its ease of use, performance, and flexibility make it an excellent choice for developers looking to build user interfaces for tools, debug utilities, and other applications. With this guide, you should now have a solid foundation for integrating ImGui into your projects and creating functional, interactive GUIs.
