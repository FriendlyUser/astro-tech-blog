---
title: Read and write Windows clipboard text from Rust with WinAPI
pubDate: "2023-04-24T18:13:58.063Z"
lastUpdated: 2026-11-14
description: "Copy and paste Unicode text through the Win32 clipboard API in Rust: OpenClipboard, GlobalAlloc, SetClipboardData and GetClipboardData, with correct error handling."
tags: ["rust", "winapi"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/872471039.webp
---
:::caution
The `winapi` crate used here has not had a release since 0.3.9 in June 2020. It still builds, but for new code prefer Microsoft's [`windows-sys`](https://crates.io/crates/windows-sys) or [`windows`](https://crates.io/crates/windows) crates. The Win32 calls below are the same in either. If you just need clipboard access and not the raw API, the [`arboard`](https://crates.io/crates/arboard) crate wraps it for Windows, macOS and Linux.
:::

The Windows clipboard is a system-wide store that every application reads and writes through a handful of Win32 calls. This post wraps those calls in a small Rust module that copies text to the clipboard and reads it back.

The rules the code has to follow:

- Open the clipboard with `OpenClipboard` before using it, and close it with `CloseClipboard` afterwards. Only one window can have it open at a time.
- Data goes on the clipboard as a *movable global memory handle* from `GlobalAlloc(GMEM_MOVEABLE, ...)`. After a successful `SetClipboardData`, the system owns that memory and you must not free it.
- `GetClipboardData` returns a handle, not a pointer. You call `GlobalLock` to get a pointer to the data, then `GlobalUnlock` when done.
- Use `CF_UNICODETEXT` (null-terminated UTF-16) rather than `CF_TEXT` (the ANSI code page), so non-ASCII text survives. Windows synthesizes `CF_UNICODETEXT` when another app only put `CF_TEXT` on the clipboard.

## Project setup

```bash
cargo new winapi_clipboard
cd winapi_clipboard
```

Add `winapi` with the `winuser` (clipboard functions) and `winbase` (global memory functions) features:

```toml
[dependencies]
winapi = { version = "0.3.9", features = ["winuser", "winbase"] }
```

## The clipboard module

The module opens the clipboard in a constructor and closes it in `Drop`, so it is closed on every path, including early returns with `?`. Put this in `src/main.rs`:

```rust
mod clipboard {
    use std::ptr::{copy_nonoverlapping, null_mut};
    use std::slice;

    use winapi::um::winbase::{GlobalAlloc, GlobalFree, GlobalLock, GlobalSize, GlobalUnlock, GMEM_MOVEABLE};
    use winapi::um::winuser::{
        CloseClipboard, EmptyClipboard, GetClipboardData, IsClipboardFormatAvailable,
        OpenClipboard, SetClipboardData, CF_UNICODETEXT,
    };

    /// The clipboard, held open until this value is dropped.
    pub struct Clipboard(());

    impl Clipboard {
        pub fn open() -> Result<Self, &'static str> {
            // A null owner is fine for reading. A GUI app should pass its window handle;
            // Microsoft's docs warn SetClipboardData can fail when the owner is NULL.
            if unsafe { OpenClipboard(null_mut()) } == 0 {
                return Err("OpenClipboard failed (another window may have it open)");
            }
            Ok(Clipboard(()))
        }

        pub fn get_text(&self) -> Result<String, &'static str> {
            unsafe {
                if IsClipboardFormatAvailable(CF_UNICODETEXT) == 0 {
                    return Err("the clipboard does not contain text");
                }
                let handle = GetClipboardData(CF_UNICODETEXT);
                if handle.is_null() {
                    return Err("GetClipboardData failed");
                }
                let ptr = GlobalLock(handle) as *const u16;
                if ptr.is_null() {
                    return Err("GlobalLock failed");
                }
                // Never read past the allocation, even if the terminator is missing.
                let max_len = GlobalSize(handle) / 2;
                let units = slice::from_raw_parts(ptr, max_len);
                let len = units.iter().position(|&c| c == 0).unwrap_or(max_len);
                let text = String::from_utf16_lossy(&units[..len]);
                GlobalUnlock(handle);
                Ok(text)
            }
        }

        pub fn set_text(&self, text: &str) -> Result<(), &'static str> {
            let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
            let size_in_bytes = wide.len() * std::mem::size_of::<u16>();

            unsafe {
                let h_mem = GlobalAlloc(GMEM_MOVEABLE, size_in_bytes);
                if h_mem.is_null() {
                    return Err("GlobalAlloc failed");
                }
                let dst = GlobalLock(h_mem) as *mut u16;
                if dst.is_null() {
                    GlobalFree(h_mem);
                    return Err("GlobalLock failed");
                }
                copy_nonoverlapping(wide.as_ptr(), dst, wide.len());
                GlobalUnlock(h_mem);

                if EmptyClipboard() == 0 {
                    GlobalFree(h_mem);
                    return Err("EmptyClipboard failed");
                }
                if SetClipboardData(CF_UNICODETEXT, h_mem).is_null() {
                    // Ownership was not transferred, so the memory is still ours to free.
                    GlobalFree(h_mem);
                    return Err("SetClipboardData failed");
                }
                // Success: the system now owns h_mem. Do not free it.
            }
            Ok(())
        }
    }

    impl Drop for Clipboard {
        fn drop(&mut self) {
            unsafe {
                CloseClipboard();
            }
        }
    }
}
```

A few details worth calling out:

- `EmptyClipboard` must be called before `SetClipboardData`. It clears the previous contents and makes the window that opened the clipboard its owner.
- The original version of this post cast the result of `GetClipboardData` straight to a byte pointer and read it as ASCII. That is wrong twice over: the handle must be locked with `GlobalLock` to get a pointer, and byte-to-`char` conversion garbles anything outside ASCII.
- `GlobalSize` bounds the read, so a malformed clipboard entry without a terminator can't make the loop run off the end of the buffer.

## Example: write, then read back

Add a `main` below the module:

```rust
fn main() -> Result<(), &'static str> {
    let example_text = "Hello, clipboard! Grüße";

    println!("Writing to clipboard: {example_text}");
    {
        let cb = clipboard::Clipboard::open()?;
        cb.set_text(example_text)?;
    } // dropped here, which closes the clipboard

    let cb = clipboard::Clipboard::open()?;
    let text = cb.get_text()?;
    println!("Clipboard content: {text}");

    Ok(())
}
```

Run it:

```bash
cargo run --release
```

Output:

```text
Writing to clipboard: Hello, clipboard! Grüße
Clipboard content: Hello, clipboard! Grüße
```

Paste into any other app to confirm the text really is on the system clipboard.

## Where to go next

- Other formats (`CF_HDROP` for file lists, `CF_DIB` for bitmaps, or formats registered with `RegisterClipboardFormatW`) follow the same open, lock and set pattern.
- To react when the clipboard changes, register a window with `AddClipboardFormatListener` and handle `WM_CLIPBOARDUPDATE`.
- Microsoft's [Using the Clipboard](https://learn.microsoft.com/en-us/windows/win32/dataxchg/using-the-clipboard) page has the C versions of these operations, which map almost line for line onto the Rust code above.
