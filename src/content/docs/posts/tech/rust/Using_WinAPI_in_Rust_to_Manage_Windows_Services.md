---
title: Querying, starting and stopping Windows services from Rust with the Windows API
pubDate: "2023-04-24T18:13:58.133Z"
lastUpdated: 2026-11-14
description: "Call the Service Control Manager (OpenSCManagerW, OpenServiceW, QueryServiceStatus, StartServiceW, ControlService) from Rust using the windows-sys crate."
tags: ["rust", "winapi"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1089827583.webp
---

:::caution
The original version of this post used the `winapi` crate. Its last release (0.3.9) was in
June 2020 and it is no longer maintained. The examples below use Microsoft's
[`windows-sys`](https://crates.io/crates/windows-sys) crate, which exposes the same C functions.
:::

Windows services are long-running background processes managed by the Service Control Manager
(SCM). To inspect or control one from your own program you open a handle to the SCM, open a
handle to the service, and then call functions such as `QueryServiceStatus`, `StartServiceW` and
`ControlService`. This post wraps those calls in small Rust functions and builds a command-line
tool that prints, starts or stops a service.

You need a Rust toolchain on Windows with the MSVC target and the Visual Studio C++ build tools.

## Project setup

```bash
cargo new service_ctl
cd service_ctl
```

`windows-sys` puts every API area behind a Cargo feature, so enable only the ones you use:

```toml
[dependencies]
windows-sys = { version = "0.61", features = ["Win32_Foundation", "Win32_System_Services"] }
```

The examples were checked against `windows-sys` 0.61.2. In this version, `SC_HANDLE` is a raw
pointer (`*mut c_void`), strings are `PCWSTR` (`*const u16`, NUL-terminated UTF-16), and
functions return a `BOOL` (`i32`) where `0` means failure.

## Wrapping the SCM calls

Put the following in `src/main.rs`. The `ScHandle` wrapper closes each handle with
`CloseServiceHandle` when it goes out of scope, so error paths don't leak handles.

```rust
use std::ptr::null;

use windows_sys::Win32::Foundation::GetLastError;
use windows_sys::Win32::System::Services::{
    CloseServiceHandle, ControlService, OpenSCManagerW, OpenServiceW, QueryServiceStatus,
    StartServiceW, SC_HANDLE, SC_MANAGER_CONNECT, SERVICE_CONTROL_STOP, SERVICE_QUERY_STATUS,
    SERVICE_RUNNING, SERVICE_START, SERVICE_START_PENDING, SERVICE_STATUS, SERVICE_STOP,
    SERVICE_STOPPED, SERVICE_STOP_PENDING,
};

/// Owns an SCM or service handle and closes it on drop.
struct ScHandle(SC_HANDLE);

impl Drop for ScHandle {
    fn drop(&mut self) {
        unsafe { CloseServiceHandle(self.0) };
    }
}

/// Converts a Rust string to a NUL-terminated UTF-16 buffer.
fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn open_sc_manager(access: u32) -> Result<ScHandle, u32> {
    // null machine name = local computer, null database = SERVICES_ACTIVE_DATABASE
    let handle = unsafe { OpenSCManagerW(null(), null(), access) };
    if handle.is_null() {
        Err(unsafe { GetLastError() })
    } else {
        Ok(ScHandle(handle))
    }
}

fn open_service(scm: &ScHandle, name: &str, access: u32) -> Result<ScHandle, u32> {
    let name = to_wide(name);
    let handle = unsafe { OpenServiceW(scm.0, name.as_ptr(), access) };
    if handle.is_null() {
        Err(unsafe { GetLastError() })
    } else {
        Ok(ScHandle(handle))
    }
}

fn query_state(service: &ScHandle) -> Result<u32, u32> {
    let mut status = SERVICE_STATUS::default();
    if unsafe { QueryServiceStatus(service.0, &mut status) } == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(status.dwCurrentState)
    }
}

fn start_service(service: &ScHandle) -> Result<(), u32> {
    if unsafe { StartServiceW(service.0, 0, null()) } == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(())
    }
}

fn stop_service(service: &ScHandle) -> Result<(), u32> {
    let mut status = SERVICE_STATUS::default();
    if unsafe { ControlService(service.0, SERVICE_CONTROL_STOP, &mut status) } == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(())
    }
}

fn state_name(state: u32) -> &'static str {
    match state {
        SERVICE_STOPPED => "stopped",
        SERVICE_START_PENDING => "start pending",
        SERVICE_STOP_PENDING => "stop pending",
        SERVICE_RUNNING => "running",
        _ => "paused or pause/continue pending",
    }
}
```

Each wrapper returns the Win32 error code from `GetLastError` on failure. Every handle is
opened with only the access rights it needs: `SC_MANAGER_CONNECT` is enough to open a service,
and `SERVICE_QUERY_STATUS` is enough to read its state.

## A small service control tool

Add a `main` that takes an action and a service name. The example uses the Windows Update
service, whose service name is `wuauserv`.

```rust
fn main() -> Result<(), String> {
    let mut args = std::env::args().skip(1);
    let action = args.next().unwrap_or_else(|| "status".to_string());
    let name = args.next().unwrap_or_else(|| "wuauserv".to_string());

    let scm = open_sc_manager(SC_MANAGER_CONNECT)
        .map_err(|e| format!("OpenSCManagerW failed: error {e}"))?;

    let access = match action.as_str() {
        "start" => SERVICE_QUERY_STATUS | SERVICE_START,
        "stop" => SERVICE_QUERY_STATUS | SERVICE_STOP,
        _ => SERVICE_QUERY_STATUS,
    };
    let service = open_service(&scm, &name, access)
        .map_err(|e| format!("OpenServiceW({name}) failed: error {e}"))?;

    match action.as_str() {
        "start" => start_service(&service).map_err(|e| format!("StartServiceW failed: error {e}"))?,
        "stop" => stop_service(&service).map_err(|e| format!("ControlService failed: error {e}"))?,
        _ => {}
    }

    let state = query_state(&service).map_err(|e| format!("QueryServiceStatus failed: error {e}"))?;
    println!("{name}: {}", state_name(state));
    Ok(())
}
```

```bash
cargo run -- status wuauserv
cargo run -- stop wuauserv    # needs an elevated (Run as administrator) terminal
cargo run -- start wuauserv
```

Querying works from a normal terminal for most services. Starting and stopping system services
usually needs an elevated terminal; without it `OpenServiceW` fails with error 5
(`ERROR_ACCESS_DENIED`).

## Gotchas

- `StartServiceW` and `ControlService` return as soon as the request is accepted. Right after
  the call the state is usually `start pending` or `stop pending`; poll `QueryServiceStatus`
  (using `dwWaitHint` as a guide) if you need to wait for `running` or `stopped`.
- Common error codes: 1056 (`ERROR_SERVICE_ALREADY_RUNNING`) when starting a running service, and
  1062 (`ERROR_SERVICE_NOT_ACTIVE`) when stopping one that isn't running.
- Deleting a service uses `DeleteService`, which needs a handle opened with the standard `DELETE`
  access right (there is no `SERVICE_DELETE` constant). It only marks the service for deletion,
  so don't try it on a Windows service you want to keep.
- If you still use the `winapi` crate, the same functions live in `winapi::um::winsvc`, and you
  must enable the `winsvc` and `errhandlingapi` features or the modules won't exist.
- For a safe, higher-level API (including writing your own service), look at the
  [`windows-service`](https://crates.io/crates/windows-service) crate.

## Further reading

- [Service functions (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/services/service-functions)
- [`windows-sys` on docs.rs](https://docs.rs/windows-sys)
- [`windows-rs` repository](https://github.com/microsoft/windows-rs)
