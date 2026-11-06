---
title: Creating a Basic Windows Application with WinAPI and Rust
pubDate: "2023-04-22T16:25:05.101Z"
description: "In this article, we will explore how to create a basic Windows application using the Windows API (WinAPI) in Rust."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Creating a Basic Windows Application with WinAPI and Rust

In this article, we will explore how to create a basic Windows application using the Windows API (WinAPI) in Rust. Rust is a systems programming language that emphasizes safety and performance, making it a perfect candidate for working with the low-level WinAPI.

## Prerequisites

To follow this tutorial, you'll need the following:

- Rust installed on your machine. You can download it from the [official website](https://www.rust-lang.org/tools/install).
- A basic understanding of Rust syntax and concepts.
- Familiarity with the Windows API is a plus, but not required.

## Setting up the Rust Project

First, let's create a new Rust project:

```sh
$ cargo new --bin winapi_app
$ cd winapi_app
```

Next, add the necessary dependencies to your `Cargo.toml` file:

```toml
[dependencies]
winapi = { version = "0.3", features = ["winuser", "wingdi"] }
```

This will include the `winapi` crate with the `winuser` and `wingdi` features enabled.

## Building the Application

Now, let's build the skeleton for our basic Windows application. Create a new Rust file named `main.rs` inside the `src` folder, and add the following code:

```rust
extern crate winapi;

use std::ffi::OsStr;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;
use winapi::shared::minwindef::{LPARAM, LRESULT, UINT, WPARAM};
use winapi::shared::windef::HWND;
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::winuser::{
    CreateWindowExW, DefWindowProcW, GetMessageW, LoadCursorW, PostQuitMessage, RegisterClassW,
    ShowWindow, TranslateMessage, DispatchMessageW, MSG, WNDCLASSW, CS_OWNDC, CS_HREDRAW, CS_VREDRAW, WM_DESTROY,
    WS_OVERLAPPEDWINDOW, WS_VISIBLE, IDC_ARROW, SW_SHOW, CW_USEDEFAULT,
};

fn main() {
    let app_name = to_wstring("WinAPIApp");

    let h_instance = unsafe { GetModuleHandleW(null_mut()) };

    let wnd_class = WNDCLASSW {
        style: CS_OWNDC | CS_HREDRAW | CS_VREDRAW,
        lpfnWndProc: Some(window_proc),
        hInstance: h_instance,
        lpszClassName: app_name.as_ptr(),
        cbClsExtra: 0,
        cbWndExtra: 0,
        hIcon: null_mut(),
        hCursor: unsafe { LoadCursorW(null_mut(), IDC_ARROW) },
        hbrBackground: null_mut(),
        lpszMenuName: null_mut(),
    };

    let class_atom = unsafe { RegisterClassW(&wnd_class) };

    let hwnd = unsafe {
        CreateWindowExW(
            0,
            class_atom as *const u16,
            app_name.as_ptr(),
            WS_OVERLAPPEDWINDOW | WS_VISIBLE,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            null_mut(),
            null_mut(),
            h_instance,
            null_mut(),
        )
    };

    if hwnd.is_null() {
        panic!("Failed to create window.");
    }

    unsafe { ShowWindow(hwnd, SW_SHOW) };

    let mut msg = MSG {
        hwnd: null_mut(),
        message: 0,
        wParam: 0,
        lParam: 0,
        time: 0,
        pt: Default::default(),
    };

    while unsafe { GetMessageW(&mut msg, null_mut(), 0, 0) } != 0 {
        unsafe {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: UINT,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    match msg {
        WM_DESTROY => {
            PostQuitMessage(0);
            0
        }
        _ => DefWindowProcW(hwnd, msg, w_param, l_param),
    }
}

fn to_wstring(s: &str) -> Vec<u16> {
    OsStr::new(s)
        .encode_wide()
        .chain(once(0))
        .collect()
}
```

This code defines a minimal Windows application that creates a window and handles the `WM_DESTROY` message to close the application gracefully. The `to_wstring` function is a utility to convert Rust strings to wide-character strings compatible with the WinAPI.

## Running the Application

Now that we have our basic Windows application, let's run it:

```sh
$ cargo run
```

A new window should appear with thetitle "WinAPIApp". You can interact with the window, minimize, maximize, and close it. This is a basic foundation for building more complex applications with WinAPI and Rust.

## Understanding the Code

Let's break down the code a bit further to understand the core components of our application.

### Initializing the Window Class

The `WNDCLASSW` structure describes the properties of the window class, such as its style, cursor, and background. The `RegisterClassW` function registers the window class with the system:

```rust
let wnd_class = WNDCLASSW {
    style: CS_OWNDC | CS_HREDRAW | CS_VREDRAW,
    lpfnWndProc: Some(window_proc),
    hInstance: h_instance,
    lpszClassName: app_name.as_ptr(),
    cbClsExtra: 0,
    cbWndExtra: 0,
    hIcon: null_mut(),
    hCursor: unsafe { LoadCursorW(null_mut(), IDC_ARROW) },
    hbrBackground: null_mut(),
    lpszMenuName: null_mut(),
};

let class_atom = unsafe { RegisterClassW(&wnd_class) };
```

### Creating the Window

After registering the window class, we create the window using the `CreateWindowExW` function:

```rust
let hwnd = unsafe {
    CreateWindowExW(
        0,
        class_atom as *const u16,
        app_name.as_ptr(),
        WS_OVERLAPPEDWINDOW | WS_VISIBLE,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        null_mut(),
        null_mut(),
        h_instance,
        null_mut(),
    )
};
```

This function creates an overlapped, visible window with the default position and size.

### Message Loop

A Windows application relies on a message loop to handle messages sent by the system or other applications. We use the `GetMessageW`, `TranslateMessage`, and `DispatchMessageW` functions to create our message loop:

```rust
let mut msg = MSG {
    hwnd: null_mut(),
    message: 0,
    wParam: 0,
    lParam: 0,
    time: 0,
    pt: Default::default(),
};

while unsafe { GetMessageW(&mut msg, null_mut(), 0, 0) } != 0 {
    unsafe {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
}
```

### Window Procedure

The `window_proc` function is the callback function that processes messages sent to the window. In our case, we handle the `WM_DESTROY` message to close the application when the user clicks the close button:

```rust
unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: UINT,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    match msg {
        WM_DESTROY => {
            PostQuitMessage(0);
            0
        }
        _ => DefWindowProcW(hwnd, msg, w_param, l_param),
    }
}
```

## Conclusion

In this tutorial, we built a basic Windows application using Rust and the WinAPI. This foundation can be expanded upon to build more complex applications. Rust's emphasis on safety and performance makes it an excellent choice for working with low-level APIs such as WinAPI.
