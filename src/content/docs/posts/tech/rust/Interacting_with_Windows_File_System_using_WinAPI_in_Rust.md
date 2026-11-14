---
title: "Reading and writing files with the Windows API in Rust (CreateFileW, ReadFile, WriteFile)"
pubDate: "2023-04-24T18:13:58.024Z"
lastUpdated: 2026-11-14
description: "Create, write, and read a file in Rust by calling CreateFileW, WriteFile, and ReadFile through windows-sys, with correct error handling."
tags: ["rust", "winapi", "windows"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1020242283.webp
---

This post calls the Win32 file functions `CreateFileW`, `WriteFile`, `ReadFile`, and `CloseHandle` directly from Rust. You rarely need to do this for plain file I/O, but it is the way in when you need a flag or function that the standard library doesn't expose, and it shows what `std::fs` does for you on Windows.

:::note[Updated in November 2026]
The first version of this post used the `winapi` crate. `winapi` still works, but it hasn't had a release since 0.3.9 in June 2020. Microsoft publishes and maintains [`windows-sys`](https://crates.io/crates/windows-sys) (raw bindings) and [`windows`](https://crates.io/crates/windows) (safer wrappers), so the examples now use `windows-sys` 0.61. The original code also had bugs: it checked for a null handle instead of `INVALID_HANDLE_VALUE`, read from a handle opened write-only, decoded a byte buffer as UTF-16, and wrote a UTF-16 NUL terminator into the file. Those are fixed below.
:::

## When to use std::fs instead

On Windows, `std::fs::File` is itself built on `CreateFileW`, `ReadFile`, and `WriteFile`. If all you want is to write and read a file, this is the whole program:

```rust
use std::fs;

fn main() -> std::io::Result<()> {
    fs::write("example.txt", "Hello, world!\n")?;
    let contents = fs::read_to_string("example.txt")?;
    print!("{contents}");
    Ok(())
}
```

If you only need a Windows-specific open flag, such as a sharing mode or `FILE_FLAG_*` value, `std::os::windows::fs::OpenOptionsExt` adds `share_mode`, `access_mode`, `custom_flags`, and `attributes` to `OpenOptions`. Reach for the raw API when you need something beyond that.

## Setting up the project

You need Rust installed with [rustup](https://www.rust-lang.org/tools/install) and the MSVC linker from the Visual Studio Build Tools ("Desktop development with C++" workload). The rustup installer on Windows offers to install the Build Tools if they're missing. The code below only builds for Windows targets.

```sh
cargo new winapi_file_system
cd winapi_file_system
```

Add `windows-sys` to `Cargo.toml`. Each Win32 namespace is behind a Cargo feature, and a function needs the features for every type in its signature: `CreateFileW` takes a `SECURITY_ATTRIBUTES` pointer (`Win32_Security`), and `ReadFile`/`WriteFile` take an `OVERLAPPED` pointer (`Win32_System_IO`).

```toml
[dependencies]
windows-sys = { version = "0.61", features = [
    "Win32_Foundation",
    "Win32_Security",
    "Win32_Storage_FileSystem",
    "Win32_System_IO",
] }
```

The snippets in the next sections all go in `src/main.rs`, in order. Run the result with `cargo run`.

## Imports and a handle wrapper

```rust
use std::ffi::OsStr;
use std::io;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr::{null, null_mut};

use windows_sys::Win32::Foundation::{
    CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE, INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, ReadFile, WriteFile, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_READ,
    OPEN_EXISTING,
};

/// Owns a Win32 file handle and closes it when dropped.
struct FileHandle(HANDLE);

impl Drop for FileHandle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}

/// Encode a string as NUL-terminated UTF-16, which the `W` functions expect.
fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(once(0)).collect()
}
```

Wrapping the handle in a type with `Drop` means it's closed exactly once, including on early returns through `?`. In `windows-sys` 0.61, `HANDLE` is `*mut c_void`, the same type as std's `RawHandle`.

## Opening or creating a file

`CreateFileW` both creates and opens files. The creation disposition decides which: `CREATE_ALWAYS` creates the file or truncates an existing one, and `OPEN_EXISTING` fails if the file isn't there.

```rust
fn open(path: &str, access: u32, disposition: u32) -> io::Result<FileHandle> {
    let name = to_wide(path);
    let handle = unsafe {
        CreateFileW(
            name.as_ptr(),         // lpFileName
            access,                // dwDesiredAccess
            FILE_SHARE_READ,       // dwShareMode: others may read while it's open
            null(),                // lpSecurityAttributes: default
            disposition,           // dwCreationDisposition
            FILE_ATTRIBUTE_NORMAL, // dwFlagsAndAttributes
            null_mut(),            // hTemplateFile: none
        )
    };

    // CreateFileW signals failure with INVALID_HANDLE_VALUE (-1), not a null handle.
    if handle == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    Ok(FileHandle(handle))
}
```

Checking `handle.is_null()` here is a common bug. A failed call returns `INVALID_HANDLE_VALUE`, which is not null, so the error goes unnoticed and later calls fail with a confusing "invalid handle" error. `io::Error::last_os_error()` reads `GetLastError()` and turns it into an error with the system message.

## Writing

`WriteFile` takes a byte pointer and a length. Writing `&[u8]` (for example, a UTF-8 string's bytes) avoids the original version's mistake of writing UTF-16 code units plus a trailing NUL into the file.

```rust
fn write_all(file: &FileHandle, data: &[u8]) -> io::Result<()> {
    let len = u32::try_from(data.len()).map_err(|_| io::Error::other("buffer too large"))?;
    let mut written: u32 = 0;
    let ok = unsafe { WriteFile(file.0, data.as_ptr(), len, &mut written, null_mut()) };

    if ok == 0 {
        return Err(io::Error::last_os_error());
    }
    if written != len {
        return Err(io::Error::other("short write"));
    }
    Ok(())
}
```

Win32 `BOOL` is an `i32`; zero means failure.

## Reading

On a synchronous handle, `ReadFile` returns success with zero bytes read at end of file, so read in a loop until that happens:

```rust
fn read_to_end(file: &FileHandle) -> io::Result<Vec<u8>> {
    let mut contents = Vec::new();
    let mut buf = [0u8; 4096];

    loop {
        let mut read: u32 = 0;
        let ok = unsafe {
            ReadFile(file.0, buf.as_mut_ptr(), buf.len() as u32, &mut read, null_mut())
        };
        if ok == 0 {
            return Err(io::Error::last_os_error());
        }
        if read == 0 {
            break; // end of file
        }
        contents.extend_from_slice(&buf[..read as usize]);
    }
    Ok(contents)
}
```

## Putting it together

The handle you read from must be opened with `GENERIC_READ`. Reading through a handle opened only with `GENERIC_WRITE` fails with "Access is denied".

```rust
fn main() -> io::Result<()> {
    let path = "example.txt";

    {
        let file = open(path, GENERIC_WRITE, CREATE_ALWAYS)?;
        write_all(&file, b"Hello, world!\n")?;
    } // `file` is dropped here, which closes the handle

    let file = open(path, GENERIC_READ, OPEN_EXISTING)?;
    let contents = read_to_end(&file)?;
    print!("{}", String::from_utf8_lossy(&contents));

    match open("missing.txt", GENERIC_READ, OPEN_EXISTING) {
        Err(e) => println!("open failed as expected: {e}"),
        Ok(_) => println!("missing.txt exists"),
    }
    Ok(())
}
```

Expected output:

```text
Hello, world!
open failed as expected: The system cannot find the file specified. (os error 2)
```

## Gotchas

- Use the `W` (UTF-16) functions. The `A` variants interpret strings in the system's ANSI code page and mangle non-ASCII paths.
- The share mode controls what *other* handles may do while yours is open. With `FILE_SHARE_READ` only, another process that tries to open the file for writing gets a sharing violation.
- Paths longer than `MAX_PATH` (260 characters) need the `\\?\` prefix unless long paths are enabled on the machine and in the application manifest. `std::fs` adds the prefix for you when needed.
- To hand a raw handle to code that expects std types, wrap it with `std::os::windows::io::OwnedHandle::from_raw_handle` (an `unsafe` call) and convert it with `std::fs::File::from`. Then std closes it, so don't also call `CloseHandle`.
- The [`windows`](https://crates.io/crates/windows) crate (0.62 at the time of writing) generates the same bindings with safer signatures: functions such as `CreateFileW` return `windows::core::Result`, so you can't forget the error check. Use it if you'd rather not write the checks yourself.

## Further reading

- [`CreateFileW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew), [`ReadFile`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile), and [`WriteFile`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-writefile) on Microsoft Learn
- [`windows-sys` documentation](https://docs.rs/windows-sys)
- [windows-rs repository](https://github.com/microsoft/windows-rs)
