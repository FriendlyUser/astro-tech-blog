---
title: Interacting with the Windows Registry using WinAPI in Rust
pubDate: "2023-04-22T16:25:05.167Z"
description: "In this article, we'll delve into how to interact with the Windows Registry using the WinAPI crate in Rust."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Interacting with the Windows Registry using WinAPI in Rust

In this article, we'll delve into how to interact with the Windows Registry using the WinAPI crate in Rust. The Windows Registry is a database that stores configuration settings and options for the operating system, hardware, and applications. We'll cover the basics of working with the Windows Registry, such as creating, reading, updating, and deleting keys and values.

## Prerequisites

Before starting, make sure you have the following installed:

- [Rust](https://www.rust-lang.org/tools/install)
- [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)

## Setting up the project

First, create a new Rust project by running the following command in your terminal:

```sh
cargo new registry_interactions
```

Change your working directory to the newly created project:

```sh
cd registry_interactions
```

Now, let's add the required dependencies to our `Cargo.toml` file:

```toml
[dependencies]
winapi = "0.3"
```

## Creating a helper module

Before diving into the Windows Registry functions, let's create a helper module to simplify the process of dealing with the WinAPI. Create a new file named `winapi_helpers.rs` in your `src` directory:

```rust
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use winapi::um::winnt::WCHAR;
use winapi::shared::minwindef::DWORD;

pub fn to_wstring(value: &str) -> Vec<WCHAR> {
    let v: Vec<_> = OsString::from(value).encode_wide().chain(Some(0)).collect();
    v
}

pub fn from_wstring(value: &[WCHAR]) -> String {
    let len = value.iter().position(|&x| x == 0).unwrap_or(value.len());
    OsString::from_wide(&value[..len]).to_string_lossy().into_owned()
}

pub fn get_last_error() -> DWORD {
    unsafe { winapi::um::errhandlingapi::GetLastError() }
}
```

This module provides three helper functions:

1. `to_wstring`: Converts a Rust `&str` to a null-terminated wide character string (`Vec<WCHAR>`).
2. `from_wstring`: Converts a wide character slice (`&[WCHAR]`) to a Rust `String`.
3. `get_last_error`: Gets the last error code returned by a WinAPI function.

## Interacting with the Windows Registry

Now that we have our helper functions, let's create a new module named `registry.rs` in your `src` directory:

```rust
use winapi::um::winreg::{
    RegCloseKey, RegCreateKeyExW, RegDeleteKeyW, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW,
    RegSetValueExW, HKEY_CURRENT_USER, KEY_ALL_ACCESS, KEY_READ, KEY_WRITE, REG_OPTION_NON_VOLATILE,
    REG_SZ,
};
use winapi::shared::minwindef::{HKEY, LPCVOID, LPDWORD, LPVOID};
use winapi::shared::ntdef::LPWSTR;
use crate::winapi_helpers::{to_wstring, from_wstring, get_last_error};

// ...your code here...

```

### Opening a key

To open a key, use the `RegOpenKeyExW` function:

```rust
pub fn open_key(path: &str, writable: bool) -> Result<HKEY, u32> {
    let path_w = to_wstring(path);
    let mut key: HKEY = std::ptr::null_mut();
    let rights = if writable { KEY_WRITE } else { KEY_READ };

    let result = unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, path_w.as_ptr(), 0, rights, &mut key) };

    if result == 0 {
        Ok(key)
    } else {
        Err(get_last_error())
    }
}
```

### Creating a key

To create a key, use the `RegCreateKeyExW` function:

```rust
pub fn create_key(path: &str) -> Result<HKEY, u32> {
    let path_w = to_wstring(path);
    let mut key: HKEY = std::ptr::null_mut();
    let mut disposition: DWORD = 0;

    let result = unsafe {
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            path_w.as_ptr(),
            0,
            std::ptr::null_mut(),
            REG_OPTION_NON_VOLATILE,
            KEY_ALL_ACCESS,
            std::ptr::null_mut(),
            &mut key,
            &mut disposition,
        )
    };

    if result == 0 {
        Ok(key)
    } else {
        Err(get_last_error())
    }
}
```

### Reading a value

To read a value, use the `RegQueryValueExW` function:

```rust
pub fn read_value(key: HKEY, name: &str) -> Result<String, u32> {
    let name_w = to_wstring(name);
    let mut value_type: DWORD = 0;
    let mut buf_size: DWORD = 0;

    let result = unsafe {
        RegQueryValueExW(
            key,
            name_w.as_ptr(),
            std::ptr::null_mut(),
            &mut value_type,
            std::ptr::null_mut(),
            &mut buf_size,
        )
    };

    if result != 0 {
        return Err(get_last_error());
    }

    let mut buf = vec![0u16; (buf_size / 2) as usize];

    let result = unsafe {
        RegQueryValueExW(
            key,
            name_w.as_ptr(),
            std::ptr::null_mut(),
            &mut value_type,
            buf.as_mut_ptr() as LPVOID,
            &mut buf_size,
        )
    };

    if result == 0 {
        Ok(from_wstring(&buf))
    } else {
        Err(get_last_error())
    }
}
```

### Writing a value

To write a value, use the `RegSetValueExW` function:

```rust
pub fn write_value(key: HKEY, name: &str, value: &str) -> Result<(), u32> {
    let name_w = to_wstring(name);
    let value_w = to_wstring(value);

    let result = unsafe {
        RegSetValueExW(
            key,
            name_w.as_ptr(),
            0,
            REG_SZ,
            value_w.as_ptr() as LPCVOID,
            (value_w.len() * 2) as u32,
        )
    };

    if result == 0 {
        Ok(())
    } else {
        Err(get_last_error())
    }
}
```

### Deleting a key

To delete a key, use the `RegDeleteKeyW` function:

```rust
pub fn delete_key(path: &str) -> Result<(), u32> {
    let path_w = to_wstring(path);
    let result = unsafe { RegDeleteKeyW(HKEY_CURRENT_USER, path_w.as_ptr()) };

    if result == 0 {
        Ok(())
    } else {
        Err(get_last_error())
    }
}
```

### Deleting a value

To delete a value, use the `RegDeleteValueW` function:

```rust
pub fn delete_value(key: HKEY, name: &str) -> Result<(), u32> {
    let name_w = to_wstring(name);
    let result = unsafe { RegDeleteValueW(key, name_w.as_ptr()) };

    if result == 0 {
        Ok(())
    } else {
        Err(get_last_error())
    }
}
```

### Closing a key

To close a key, use the `RegCloseKey` function:

```rust
pub fn close_key(key: HKEY) -> Result<(), u32> {
    let result = unsafe { RegCloseKey(key) };

    if result == 0 {
        Ok(())
    } else {
        Err(get_last_error())
    }
}
```

## Putting it all together

Now that we have implemented the registry functions, let's put them to use in our `main.rs`:

```rust
mod winapi_helpers;
mod registry;

use registry::{create_key, open_key, read_value, write_value, delete_key, delete_value, close_key};

fn main() {
    let key_path = "Software\\MyApp";

    // Create a key
    match create_key(key_path) {
        Ok(key) => println!("Key created successfully."),
        Err(error) => eprintln!("Error creating key: {}", error),
    }

    // Open the key
    let key = match open_key(key_path, true) {
        Ok(key) => key,
        Err(error) => {
            eprintln!("Error opening key: {}", error);
            return;
        }
    };

    // Write a value
    match write_value(key, "TestValue", "Hello, World!") {
        Ok(_) => println!("Value written successfully."),
        Err(error) => eprintln!("Error writing value: {}", error),
    }

    // Read the value
    match read_value(key, "TestValue") {
        Ok(value) => println!("Value read: {}", value),
        Err(error) => eprintln!("Error reading value: {}", error),
    }

    // Delete the value
    match delete_value(key, "TestValue") {
        Ok(_) => println!("Value deleted successfully."),
        Err(error) => eprintln!("Error deleting value: {}", error),
    }

    // Close the key
    match close_key(key) {
        Ok(_) => println!("Key closed successfully."),
        Err(error) => eprintln!("Error closing key: {}", error),
    }

    // Delete the key

