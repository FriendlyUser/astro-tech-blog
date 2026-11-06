---
title: Interacting with Windows File System using WinAPI in Rust
pubDate: "2023-04-24T18:13:58.024Z"
description: "In this article, we'll explore how to use WinAPI in Rust to interact with the Windows file system."
tags: ["rust", "winapi"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1020242283.png
---
# Interacting with Windows File System using WinAPI in Rust

Rust is a systems programming language designed for safety, concurrency, and performance. It's an excellent choice for interacting with low-level APIs like the Windows API (WinAPI). In this article, we'll explore how to use WinAPI in Rust to interact with the Windows file system.

## Prerequisites

To follow along, ensure that you have the following installed on your system:

1. Rust and Cargo: Follow the [official installation guide](https://www.rust-lang.org/tools/install) to install Rust.
2. Visual Studio Build Tools: Download and install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with the "Desktop development with C++" workload.

## Setting up the Project

First, create a new Rust project:

```sh
$ cargo new winapi_file_system
$ cd winapi_file_system
```

Next, add the following dependencies to your `Cargo.toml` file:

```toml
[dependencies]
winapi = { version = "0.3", features = ["fileapi", "handleapi", "winbase", "winnt"] }
```

This will include the `winapi` crate and enable the necessary features for file system interaction.

## Interacting with the File System

Now that your project is set up, let's dive into some examples of interacting with the Windows file system using WinAPI.

### Creating a File

To create a new file, we'll use the `CreateFileW` function from `winapi::um::fileapi`. This function takes several arguments, including the file name, desired access, sharing mode, security attributes, creation disposition, flags, and an optional template file.

Here's an example of creating a new file called `example.txt`:

```rust
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::iter::once;
use std::ptr::null_mut;
use winapi::um::fileapi::CreateFileW;
use winapi::um::winnt::{FILE_SHARE_READ, FILE_SHARE_WRITE, GENERIC_WRITE};
use winapi::um::winbase::{CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL};

fn main() {
    let file_name: Vec<u16> = OsStr::new("example.txt")
        .encode_wide()
        .chain(once(0))
        .collect();

    let handle = unsafe {
        CreateFileW(
            file_name.as_ptr(),
            GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            null_mut(),
            CREATE_ALWAYS,
            FILE_ATTRIBUTE_NORMAL,
            null_mut(),
        )
    };

    if handle.is_null() {
        println!("Failed to create the file.");
    } else {
        println!("File created successfully.");
    }
}
```

In this example, we convert the file name to a wide string and create the file with write access, allowing it to be read and written by other processes. If the file already exists, it will be overwritten.

### Reading from a File

To read the contents of a file, we can use the `ReadFile` function from `winapi::um::fileapi`. This function takes a file handle, a buffer to store the data, the number of bytes to read, the number of bytes actually read, and an optional overlapped structure.

Here's an example of reading the contents of `example.txt`:

```rust
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use winapi::um::fileapi::{ReadFile, SetFilePointer};
use winapi::um::winnt::FILE_BEGIN;
use winapi::um::handleapi::CloseHandle;

fn main() {
    // ... (Create the file as shown in the previous example)

    let mut buffer = [0u8; 1024];
    let mut bytes_read = 0;

    let success = unsafe {
        SetFilePointer(handle, 0, null_mut(), FILE_BEGIN);
        ReadFile(
            handle,
            buffer.as_mut_ptr() as _,
            buffer.len() as u32,
            &mut bytes_read,
            null_mut(),
        )
    };

    if success == 0 {
        println!("Failed to read the file.");
    } else {
        let content = OsString::from_wide(&buffer[..bytes_read as usize])
            .to_string_lossy()
            .to_owned();
        println!("File content: {}", content);
    }

    unsafe {
        CloseHandle(handle);
    }
}
```

In this example, we set the file pointer to the beginning of the file and read up to 1024 bytes into a buffer. If the read operation is successful, we convert the data to an `OsString` and display the file contents.

Don't forget to close the file handle using `CloseHandle` after you're done using the file.

### Writing to a File

Finally, let's lookat how to write data to a file using the `WriteFile` function from `winapi::um::fileapi`. This function takes a file handle, a buffer containing the data to write, the number of bytes to write, the number of bytes actually written, and an optional overlapped structure.

Here's an example of writing a string to `example.txt`:

```rust
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::iter::once;
use winapi::um::fileapi::{SetFilePointer, WriteFile};
use winapi::um::winnt::FILE_BEGIN;
use winapi::um::handleapi::CloseHandle;

fn main() {
    // ... (Create and read the file as shown in the previous examples)

    let data = "Hello, world!";
    let wide_data: Vec<u16> = OsStr::new(data).encode_wide().chain(once(0)).collect();
    let mut bytes_written = 0;

    let success = unsafe {
        SetFilePointer(handle, 0, null_mut(), FILE_BEGIN);
        WriteFile(
            handle,
            wide_data.as_ptr() as _,
            (wide_data.len() * 2) as u32,
            &mut bytes_written,
            null_mut(),
        )
    };

    if success == 0 {
        println!("Failed to write to the file.");
    } else {
        println!("Successfully wrote to the file.");
    }

    unsafe {
        CloseHandle(handle);
    }
}
```

In this example, we set the file pointer to the beginning of the file and write the wide string data to the file. If the write operation is successful, we print a success message.

Remember to close the file handle using `CloseHandle` after you're done using the file.

## Conclusion

In this article, we explored how to use WinAPI in Rust to interact with the Windows file system. By leveraging the available functions for file creation, reading, and writing, we demonstrated basic file system operations in Rust using the WinAPI.

While these examples provide a starting point, there is a wide range of file system operations that can be performed using the WinAPI. Be sure to consult the [official WinAPI documentation](https://docs.microsoft.com/en-us/windows/win32/apiindex/windows-api-list) for more information on the available functions and their usage.
