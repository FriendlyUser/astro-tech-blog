---
title: "Creating and terminating Windows processes from Rust with winapi"
pubDate: "2023-04-24T18:13:58.101Z"
lastUpdated: 2026-11-14
description: "Call CreateProcessW, TerminateProcess and WaitForSingleObject from Rust with the winapi crate, plus the equivalent code using Microsoft's windows-sys crate."
tags: ["rust", "winapi"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1086816529.webp
---

:::caution
The `winapi` crate has not had a release since 0.3.9 in June 2020. It still works, but new code should use Microsoft's [`windows-sys`](https://crates.io/crates/windows-sys) (raw bindings, closest to `winapi`) or [`windows`](https://crates.io/crates/windows) (safer wrappers) crates. A `windows-sys` version of the example is at the end of this post.
:::

This post starts a process with the Win32 `CreateProcessW` function, waits a few seconds, then kills it with `TerminateProcess`. If you only need to start and kill child processes, `std::process::Command` already does this (`Child::kill` calls `TerminateProcess` on Windows), so reach for the raw API when you need something std doesn't expose, such as creation flags like `CREATE_NEW_CONSOLE` or `CREATE_SUSPENDED`, or handles to processes you didn't spawn.

## Dependencies

```toml
[dependencies]
winapi = { version = "0.3.9", features = ["minwindef", "processthreadsapi", "handleapi", "winbase", "synchapi"] }
```

Every module in `winapi` is behind a feature with the same name as the module, and nothing compiles until you enable the ones you import from. The original version of this post also used the `widestring` crate without listing it. The code below builds the UTF-16 string with the standard library instead.

## Creating, waiting for and terminating a process

```rust
use std::ffi::OsStr;
use std::io;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr::{null, null_mut};
use std::thread::sleep;
use std::time::Duration;

use winapi::shared::minwindef::FALSE;
use winapi::um::handleapi::CloseHandle;
use winapi::um::processthreadsapi::{
    CreateProcessW, TerminateProcess, PROCESS_INFORMATION, STARTUPINFOW,
};
use winapi::um::synchapi::WaitForSingleObject;
use winapi::um::winbase::{CREATE_NEW_CONSOLE, INFINITE};

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(once(0)).collect()
}

fn spawn(command_line: &str) -> io::Result<PROCESS_INFORMATION> {
    let mut startup_info: STARTUPINFOW = unsafe { std::mem::zeroed() };
    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
    let mut process_info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };

    // CreateProcessW may write to the command-line buffer, so it must be mutable
    let mut command_line = to_wide(command_line);

    let ok = unsafe {
        CreateProcessW(
            null(),                   // application name: taken from the command line
            command_line.as_mut_ptr(),
            null_mut(),               // process security attributes
            null_mut(),               // thread security attributes
            FALSE,                    // don't inherit handles
            CREATE_NEW_CONSOLE,
            null_mut(),               // inherit our environment
            null(),                   // inherit our working directory
            &mut startup_info,
            &mut process_info,
        )
    };

    if ok == FALSE {
        return Err(io::Error::last_os_error());
    }
    Ok(process_info)
}

fn terminate(process_info: PROCESS_INFORMATION, exit_code: u32) -> io::Result<()> {
    unsafe {
        let ok = TerminateProcess(process_info.hProcess, exit_code);
        let result = if ok == FALSE {
            Err(io::Error::last_os_error())
        } else {
            // TerminateProcess is asynchronous; wait until the process has actually exited
            WaitForSingleObject(process_info.hProcess, INFINITE);
            Ok(())
        };
        CloseHandle(process_info.hThread);
        CloseHandle(process_info.hProcess);
        result
    }
}

fn main() -> io::Result<()> {
    let process_info = spawn("cmd.exe")?;
    println!("Started process {}", process_info.dwProcessId);

    sleep(Duration::from_secs(5));

    terminate(process_info, 0)?;
    println!("Process terminated");
    Ok(())
}
```

Details worth knowing:

- **The command line must be writable.** The `lpCommandLine` parameter is `LPWSTR`, not `LPCWSTR`, and Microsoft's documentation says `CreateProcessW` can modify the buffer. The original version of this post cast a read-only string pointer to `*mut`, which is undefined behaviour if Windows writes to it.
- **Errors come from `GetLastError`.** `CreateProcessW` and `TerminateProcess` return zero on failure. `io::Error::last_os_error()` reads `GetLastError` and turns it into a readable message.
- **Close both handles.** `PROCESS_INFORMATION` contains a handle to the process and one to its main thread. Both have to be closed, even if you never use the thread handle, or they leak.
- **`TerminateProcess` doesn't wait.** It starts termination and returns. `WaitForSingleObject` on the process handle blocks until the process has exited.
- **It's a hard kill.** The target gets no chance to clean up, so files it was writing may be left half-written. For console programs you can try `GenerateConsoleCtrlEvent` first, and for GUI programs you can post `WM_CLOSE` to their windows.

## The same thing with windows-sys

`windows-sys` is generated from Microsoft's Win32 metadata, so the function names and parameters match the C API and the docs. Modules follow the Win32 namespace layout rather than C header names. The example below targets windows-sys 0.61.2:

```toml
[dependencies]
windows-sys = { version = "0.61.2", features = ["Win32_Foundation", "Win32_Security", "Win32_System_Threading"] }
```

```rust
use std::ffi::OsStr;
use std::io;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null;
use std::thread::sleep;
use std::time::Duration;

use windows_sys::Win32::Foundation::CloseHandle;
use windows_sys::Win32::System::Threading::{
    CreateProcessW, TerminateProcess, WaitForSingleObject, CREATE_NEW_CONSOLE, INFINITE,
    PROCESS_INFORMATION, STARTUPINFOW,
};

fn main() -> io::Result<()> {
    let mut startup_info: STARTUPINFOW = unsafe { std::mem::zeroed() };
    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
    let mut process_info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };
    let mut command_line: Vec<u16> = OsStr::new("cmd.exe").encode_wide().chain(once(0)).collect();

    unsafe {
        if CreateProcessW(
            null(),
            command_line.as_mut_ptr(),
            null(),
            null(),
            0,
            CREATE_NEW_CONSOLE,
            null(),
            null(),
            &startup_info,
            &mut process_info,
        ) == 0
        {
            return Err(io::Error::last_os_error());
        }

        sleep(Duration::from_secs(5));

        if TerminateProcess(process_info.hProcess, 0) != 0 {
            WaitForSingleObject(process_info.hProcess, INFINITE);
        }
        CloseHandle(process_info.hThread);
        CloseHandle(process_info.hProcess);
    }

    println!("Process terminated");
    Ok(())
}
```

The `windows` crate wraps the same functions with `Result` return types and `PCWSTR`/`PWSTR` helpers, at the cost of longer compile times.

## Further reading

- [CreateProcessW documentation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)
- [TerminateProcess documentation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess)
- [windows-sys on docs.rs](https://docs.rs/windows-sys/latest/windows_sys/)
