---
title: Using WinAPI in Rust to Interact with the Windows Process System
pubDate: "2023-04-24T18:13:58.101Z"
description: "By the end of this tutorial, you will understand the basics of using WinAPI in Rust, and you will be able to create, manage, and terminate processes programmatically."
tags: ["rust", "winapi"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1086816529.png
---
# Using WinAPI in Rust to Interact with the Windows Process System

In this article, we will explore how to use the Windows API (WinAPI) in Rust to interact with processes running on the Windows operating system. By the end of this tutorial, you will understand the basics of using WinAPI in Rust, and you will be able to create, manage, and terminate processes programmatically.

## Prerequisites

- Basic knowledge of Rust programming language
- A Windows machine with Rust and Cargo installed

## Getting Started: Adding the `winapi` Crate

To interact with the Windows API, we'll need the `winapi` crate. Add the following dependencies to your `Cargo.toml`:

```toml
[dependencies]
winapi = { version = "0.3", features = ["winuser", "winbase", "handleapi", "processthreadsapi", "synchapi"] }
```

This will enable the necessary features to work with processes in Windows.

## Creating a New Process

First, let's create a new process. To do this, we'll use the `CreateProcessW` function from `winapi::um::processthreadsapi`. Here's a simple example:

```rust
use std::ptr::null_mut;
use winapi::{
    shared::minwindef::FALSE,
    um::{
        handleapi::CloseHandle,
        processthreadsapi::{CreateProcessW, PROCESS_INFORMATION, STARTUPINFOW},
        winbase::CREATE_NEW_CONSOLE,
        winnt::PROCESS_ALL_ACCESS,
    },
};
use widestring::U16CString;

fn main() {
    let mut startup_info: STARTUPINFOW = unsafe { std::mem::zeroed() };
    let mut process_info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };

    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;

    let command_line = U16CString::from_str("cmd.exe").unwrap();

    let success = unsafe {
        CreateProcessW(
            null_mut(),
            command_line.as_ptr() as *mut _,
            null_mut(),
            null_mut(),
            FALSE,
            CREATE_NEW_CONSOLE,
            null_mut(),
            null_mut(),
            &mut startup_info,
            &mut process_info,
        )
    };

    if success == FALSE {
        println!("Failed to create process");
        return;
    }

    println!("Process created successfully");

    unsafe {
        CloseHandle(process_info.hThread);
        CloseHandle(process_info.hProcess);
    }
}
```

This code creates a new `cmd.exe` process with a new console window. The `U16CString` type from the `widestring` crate is used to create a wide string suitable for use with the `CreateProcessW` function.

## Terminating a Process

Next, let's see how to terminate a running process. We'll use the `TerminateProcess` function from `winapi::um::processthreadsapi`:

```rust
use winapi::{
    um::{
        processthreadsapi::TerminateProcess,
        winbase::INFINITE,
        synchapi::WaitForSingleObject,
    },
};

fn terminate_process(process_info: &mut PROCESS_INFORMATION, exit_code: u32) {
    unsafe {
        TerminateProcess(process_info.hProcess, exit_code);
        WaitForSingleObject(process_info.hProcess, INFINITE);
        CloseHandle(process_info.hThread);
        CloseHandle(process_info.hProcess);
    }
}
```

The `terminate_process` function receives a mutable reference to a `PROCESS_INFORMATION` structure and an exit code. It first calls `TerminateProcess` to terminate the process, then `WaitForSingleObject` to wait for the process to exit.

## Example: Creating a Process and Terminating After a Delay

Here's a complete example that creates a new `cmd.exe` process, waits for 5 seconds, and then terminates the process:

```rust
use std::time::Duration;
use std::thread::sleep;

fn main() {
    let mut startup_info: STARTUPINFOW = unsafe { std::mem::zeroed() };
    let mut process_info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };

    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;

    let command_line = U16CString::from_str("cmd.exe").unwrap();

    let success = unsafe {
        CreateProcessW(
            null_mut(),
            command_line.as_ptr() as *mut _,
            null_mut(),
            null_mut(),
            FALSE,
            CREATE_NEW_CONSOLE,
            null_mut(),
            null_mut(),
            &mut startup_info,
            &mut process_info,
        )
    };

    if success == FALSE {
        println!("Failed to create process");
        return;
    }

    println!("Process created successfully");
    sleep(Duration::from_secs(5));
    terminate_process(&mut process_info, 0);
   println!("Process terminated");
}
```

In this example, we create a new `cmd.exe` process, sleep for 5 seconds, and then call the `terminate_process` function to terminate the process.

## Conclusion

In this article, we learned how to use the Windows API (WinAPI) in Rust to interact with the Windows process system. We demonstrated how to create a new process, manage its state, and terminate it programmatically.

WinAPI is a powerful tool that allows Rust developers to interact with the Windows operating system at a low level. By using the `winapi` crate, you can access many features of the Windows API and build feature-rich applications for the Windows platform.
