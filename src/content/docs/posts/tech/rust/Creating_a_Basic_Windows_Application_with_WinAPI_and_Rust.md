---
title: "Create a basic Win32 window in Rust with the winapi crate"
pubDate: "2023-04-22T16:25:05.101Z"
lastUpdated: 2026-11-14
description: "Register a window class, create a window and run a message loop using raw Win32 calls from Rust, with notes on the maintained windows-sys crate."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
:::caution
The `winapi` crate used here has not had a release since 0.3.9 in June 2020. It still builds, but for new code use Microsoft's [`windows-sys`](https://crates.io/crates/windows-sys) (raw bindings, closest to `winapi`) or [`windows`](https://crates.io/crates/windows) (safer wrappers) crates. The Win32 calls and the structure of the program are the same; only the import paths and some types differ.
:::

A Win32 GUI program needs three things: a registered window class that points at your window procedure, a window created from that class, and a message loop that pumps messages to the procedure. This post builds the smallest version of that in Rust.

## Project setup

```sh
cargo new winapi_app
cd winapi_app
```

Add `winapi` with the modules this example uses. Each Win32 header is a separate Cargo feature, and you get a "not found in `winapi::um`" error if one is missing:

```toml
[dependencies]
winapi = { version = "0.3.9", features = ["winuser", "libloaderapi", "windef", "minwindef"] }
```

## The program

Replace `src/main.rs` with:

```rust
// Don't open a console window alongside the GUI in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsStr;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr::{null, null_mut};

use winapi::shared::minwindef::{LPARAM, LRESULT, UINT, WPARAM};
use winapi::shared::windef::{HBRUSH, HWND};
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::winuser::{
    CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, LoadCursorW,
    PostQuitMessage, RegisterClassW, TranslateMessage, COLOR_WINDOW, CS_HREDRAW, CS_VREDRAW,
    CW_USEDEFAULT, IDC_ARROW, MSG, WM_DESTROY, WNDCLASSW, WS_OVERLAPPEDWINDOW, WS_VISIBLE,
};

fn main() {
    let class_name = to_wstring("WinAPIAppClass");
    let window_title = to_wstring("WinAPIApp");

    unsafe {
        let h_instance = GetModuleHandleW(null());

        let wnd_class = WNDCLASSW {
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(window_proc),
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: h_instance,
            hIcon: null_mut(),
            hCursor: LoadCursorW(null_mut(), IDC_ARROW),
            // System colour brushes are passed as (COLOR_* + 1).
            hbrBackground: (COLOR_WINDOW + 1) as usize as HBRUSH,
            lpszMenuName: null(),
            lpszClassName: class_name.as_ptr(),
        };

        if RegisterClassW(&wnd_class) == 0 {
            panic!("RegisterClassW failed");
        }

        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            window_title.as_ptr(),
            WS_OVERLAPPEDWINDOW | WS_VISIBLE,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            null_mut(),
            null_mut(),
            h_instance,
            null_mut(),
        );

        if hwnd.is_null() {
            panic!("CreateWindowExW failed");
        }

        let mut msg: MSG = std::mem::zeroed();
        // GetMessageW returns 0 for WM_QUIT and -1 on error, so stop on anything <= 0.
        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
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
    unsafe {
        match msg {
            WM_DESTROY => {
                PostQuitMessage(0);
                0
            }
            _ => DefWindowProcW(hwnd, msg, w_param, l_param),
        }
    }
}

/// Convert a Rust string to a null-terminated UTF-16 string for the W (wide) APIs.
fn to_wstring(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(once(0)).collect()
}
```

Run it:

```sh
cargo run
```

A resizable window titled "WinAPIApp" appears. Closing it ends the process.

## How it fits together

### Registering the window class

`WNDCLASSW` describes every window created from the class: its window procedure (`lpfnWndProc`), cursor, background brush and class name. `CS_HREDRAW | CS_VREDRAW` asks Windows to repaint the whole window when it is resized. `RegisterClassW` returns an atom, or 0 on failure.

Every string passed to a `...W` function must be a null-terminated UTF-16 buffer, which is what `to_wstring` builds. Keep the `Vec<u16>` alive for as long as Windows might read the pointer. Here both vectors live until the end of `main`.

### Creating the window

`CreateWindowExW` takes the class name, the title, a style and position/size. `WS_OVERLAPPEDWINDOW` is the normal title bar, border, and minimize/maximize/close buttons. `WS_VISIBLE` shows the window immediately, so a separate `ShowWindow` call isn't needed. `CW_USEDEFAULT` lets Windows choose the position and size. It returns a null `HWND` on failure.

### The message loop

Windows delivers input, paint and lifecycle events as messages in the thread's queue. `GetMessageW` blocks until one arrives, `TranslateMessage` turns key presses into `WM_CHAR` messages, and `DispatchMessageW` calls the window procedure. `GetMessageW` returns 0 when it pulls `WM_QUIT`, which ends the loop. It can also return -1 on error, which is why the loop checks `> 0` rather than `!= 0`.

### The window procedure

`window_proc` is called by Windows for each message sent to the window. It must use the `"system"` calling convention. This one handles only `WM_DESTROY`, sent after the window is closed, by posting `WM_QUIT` to end the message loop. Everything else goes to `DefWindowProcW`, which supplies default behaviour such as moving, resizing and closing.

## Gotchas

- Without the `windows_subsystem` attribute, Windows opens a console window next to your GUI. The `cfg_attr` line keeps the console in debug builds, where `println!` output is useful, and hides it in release builds.
- A panic must not unwind out of `window_proc` into Windows. Since Rust 1.81, a panic that reaches a non-`-unwind` ABI boundary such as `extern "system"` aborts the process. Keep the procedure small and handle errors inside it.
- To draw in the window, handle `WM_PAINT` with `BeginPaint`/`EndPaint`. That needs the `wingdi` feature for the GDI drawing functions.

## Further reading

- [Get started with Win32: creating a window](https://learn.microsoft.com/en-us/windows/win32/learnwin32/creating-a-window) (Microsoft Learn)
- [winapi on docs.rs](https://docs.rs/winapi/0.3.9/x86_64-pc-windows-msvc/winapi/)
- [windows-rs](https://github.com/microsoft/windows-rs), Microsoft's maintained bindings
