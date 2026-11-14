---
title: "Reading and writing the Windows Registry from Rust with the winapi crate"
pubDate: "2023-04-22T16:25:05.167Z"
lastUpdated: 2026-11-14
description: "Create, open, read, write and delete Windows Registry keys and values from Rust using raw Win32 calls through the winapi crate, with correct error handling."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

:::caution
The `winapi` crate has not had a release since 0.3.9 in June 2020. For new code, prefer Microsoft's
[`windows-registry`](https://crates.io/crates/windows-registry) crate (part of `windows-rs`),
or the raw bindings in `windows-sys`. The Win32 calls below are the same either way; only the
import paths and some pointer types differ.
:::

The Windows Registry is the hierarchical database where Windows and applications store configuration.
This post wraps the raw Win32 registry functions (`RegCreateKeyExW`, `RegQueryValueExW`, and friends) in
small safe-ish Rust functions, working under `HKEY_CURRENT_USER` so nothing needs admin rights.

## Setting up the project

```sh
cargo new registry_interactions
cd registry_interactions
```

`winapi` puts every Windows header behind a feature flag, so enable the ones used here:

```toml
[dependencies]
winapi = { version = "0.3.9", features = ["minwindef", "winerror", "winnt", "winreg"] }
```

## String helpers

Win32 `W` functions take null-terminated UTF-16 strings. Create `src/winapi_helpers.rs`:

```rust
use std::ffi::{OsStr, OsString};
use std::os::windows::ffi::{OsStrExt, OsStringExt};

/// Convert a Rust string to a null-terminated UTF-16 buffer.
pub fn to_wstring(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

/// Convert a UTF-16 buffer (possibly null-terminated) back to a Rust String.
pub fn from_wstring(value: &[u16]) -> String {
    let len = value.iter().position(|&c| c == 0).unwrap_or(value.len());
    OsString::from_wide(&value[..len]).to_string_lossy().into_owned()
}
```

`encode_wide` comes from `OsStrExt` and `from_wide` from `OsStringExt`; both traits need to be in scope.

## Registry functions

Unlike most Win32 APIs, the registry functions **return the error code directly** as an `LSTATUS`
(`ERROR_SUCCESS`, which is 0, on success). They do not set `GetLastError`, so calling `GetLastError()` after
a failure gives you an unrelated value. The wrappers below return the status code instead.

Create `src/registry.rs` with these imports and a small helper:

```rust
use std::ptr::null_mut;

use winapi::shared::minwindef::{DWORD, HKEY};
use winapi::shared::winerror::ERROR_SUCCESS;
use winapi::um::winnt::{KEY_ALL_ACCESS, KEY_READ, KEY_WRITE, REG_OPTION_NON_VOLATILE, REG_SZ};
use winapi::um::winreg::{
    RegCloseKey, RegCreateKeyExW, RegDeleteKeyW, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW,
    RegSetValueExW, HKEY_CURRENT_USER, LSTATUS,
};

use crate::winapi_helpers::{from_wstring, to_wstring};

fn check(status: LSTATUS) -> Result<(), i32> {
    if status == ERROR_SUCCESS as i32 {
        Ok(())
    } else {
        Err(status)
    }
}
```

The error value is a Win32 error code, e.g. `2` (`ERROR_FILE_NOT_FOUND`) when a key or value doesn't exist.
The following functions all go in the same file.

### Opening a key

```rust
pub fn open_key(path: &str, writable: bool) -> Result<HKEY, i32> {
    let path_w = to_wstring(path);
    let mut key: HKEY = null_mut();
    let rights = if writable { KEY_READ | KEY_WRITE } else { KEY_READ };

    check(unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, path_w.as_ptr(), 0, rights, &mut key) })?;
    Ok(key)
}
```

### Creating a key

`RegCreateKeyExW` creates the key, or opens it if it already exists. The disposition output tells you which
happened (`REG_CREATED_NEW_KEY` or `REG_OPENED_EXISTING_KEY`).

```rust
pub fn create_key(path: &str) -> Result<HKEY, i32> {
    let path_w = to_wstring(path);
    let mut key: HKEY = null_mut();
    let mut disposition: DWORD = 0;

    check(unsafe {
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            path_w.as_ptr(),
            0,
            null_mut(), // class
            REG_OPTION_NON_VOLATILE,
            KEY_ALL_ACCESS,
            null_mut(), // security attributes
            &mut key,
            &mut disposition,
        )
    })?;
    Ok(key)
}
```

### Reading a string value

Call `RegQueryValueExW` once with a null buffer to get the size in **bytes**, then again with a buffer of
that size. Check the type too: this helper only handles `REG_SZ`.

```rust
pub fn read_value(key: HKEY, name: &str) -> Result<String, i32> {
    let name_w = to_wstring(name);
    let mut value_type: DWORD = 0;
    let mut buf_size: DWORD = 0;

    check(unsafe {
        RegQueryValueExW(key, name_w.as_ptr(), null_mut(), &mut value_type, null_mut(), &mut buf_size)
    })?;

    if value_type != REG_SZ {
        return Err(winapi::shared::winerror::ERROR_INVALID_DATA as i32);
    }

    let mut buf = vec![0u16; (buf_size as usize + 1) / 2];
    check(unsafe {
        RegQueryValueExW(
            key,
            name_w.as_ptr(),
            null_mut(),
            &mut value_type,
            buf.as_mut_ptr() as *mut u8,
            &mut buf_size,
        )
    })?;

    // The stored string is not guaranteed to be null-terminated; from_wstring handles both cases.
    Ok(from_wstring(&buf))
}
```

### Writing a string value

`cbData` is the size in bytes and, for `REG_SZ`, should include the terminating null.

```rust
pub fn write_value(key: HKEY, name: &str, value: &str) -> Result<(), i32> {
    let name_w = to_wstring(name);
    let value_w = to_wstring(value);

    check(unsafe {
        RegSetValueExW(
            key,
            name_w.as_ptr(),
            0,
            REG_SZ,
            value_w.as_ptr() as *const u8,
            (value_w.len() * std::mem::size_of::<u16>()) as DWORD,
        )
    })
}
```

### Deleting a value, closing and deleting a key

```rust
pub fn delete_value(key: HKEY, name: &str) -> Result<(), i32> {
    let name_w = to_wstring(name);
    check(unsafe { RegDeleteValueW(key, name_w.as_ptr()) })
}

pub fn close_key(key: HKEY) -> Result<(), i32> {
    check(unsafe { RegCloseKey(key) })
}

/// Deletes a key under HKEY_CURRENT_USER. The key must not have subkeys.
pub fn delete_key(path: &str) -> Result<(), i32> {
    let path_w = to_wstring(path);
    check(unsafe { RegDeleteKeyW(HKEY_CURRENT_USER, path_w.as_ptr()) })
}
```

`RegDeleteKeyW` fails if the key has subkeys; use `RegDeleteTreeW` to remove a whole subtree.

## Putting it together

`src/main.rs` creates `HKCU\Software\MyApp`, writes and reads a value, then cleans up. Note that every
`HKEY` returned by create/open must be closed, including the one from `create_key`.

```rust
mod registry;
mod winapi_helpers;

use registry::{close_key, create_key, delete_key, delete_value, read_value, write_value};

fn main() -> Result<(), i32> {
    let key_path = r"Software\MyApp";

    let key = create_key(key_path)?;
    println!("Key created or opened.");

    write_value(key, "TestValue", "Hello, World!")?;
    println!("Value read back: {}", read_value(key, "TestValue")?);

    delete_value(key, "TestValue")?;
    close_key(key)?;
    delete_key(key_path)?;
    println!("Cleaned up.");

    Ok(())
}
```

If any step fails, `main` returns early and Rust prints the Win32 error code as `Error: <code>`.
In real code you'd want an RAII wrapper that calls `RegCloseKey` in `Drop` so early returns don't leak
handles, which is what `windows-registry` and the community [`winreg`](https://crates.io/crates/winreg)
crate give you.

## Further reading

- [Registry functions (Win32 docs)](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-functions)
- [`winapi::um::winreg` on docs.rs](https://docs.rs/winapi/latest/winapi/um/winreg/index.html)
- [`windows-registry` on docs.rs](https://docs.rs/windows-registry)
