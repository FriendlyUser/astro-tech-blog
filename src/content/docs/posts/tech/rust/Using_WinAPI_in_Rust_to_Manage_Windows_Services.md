---
title: Using WinAPI in Rust to Manage Windows Services
pubDate: "2023-04-24T18:13:58.133Z"
description: "In this article, we will explore how to use the Windows API (WinAPI) in Rust to interact with Windows services"
tags: ["rust", "winapi"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1089827583.png
---
# Using WinAPI in Rust to Manage Windows Services

In this article, we will explore how to use the Windows API (WinAPI) in Rust to interact with Windows services. Windows services are long-running background processes that can be started automatically during system boot or manually by a user with the appropriate privileges. Examples of Windows services include databases, web servers, and antivirus software.

Rust is a systems programming language that is focused on safety, performance, and concurrency. Its low-level control and zero-cost abstractions make it an ideal candidate for system-level programming, such as interacting with the Windows API.

## Prerequisites

Before diving into the code, ensure that you have the following prerequisites installed:

- Rust (latest stable version): https://www.rust-lang.org/tools/install
- Visual Studio Build Tools (for C++): https://visualstudio.microsoft.com/visual-cpp-build-tools/

## Setting Up the Project

To get started, create a new Rust project by running the following command:

```bash
cargo new winapi_service_manager
cd winapi_service_manager
```

Next, add the following dependencies to your `Cargo.toml` file:

```toml
[dependencies]
winapi = "0.3"
widestring = "0.4"
```

- `winapi` provides bindings to the Windows API.
- `widestring` is a utility crate for working with UTF-16 strings, which are used by the Windows API.

## Interacting with Windows Services

To interact with Windows services, we will use the Service Control Manager (SCM), which is a part of the Windows API. The SCM provides a set of functions to create, delete, query, and manage the services.

First, let's import the necessary modules:

```rust
use std::ptr::null_mut;
use std::os::windows::ffi::OsStrExt;
use winapi::{
    ctypes::c_void,
    shared::{
        minwindef::{DWORD, LPDWORD},
        ntdef::NULL,
    },
    um::{
        errhandlingapi::GetLastError,
        winbase::LocalFree,
        winsvc::{
            CloseServiceHandle, ControlService, DeleteService, OpenSCManagerW, OpenServiceW,
            QueryServiceConfigW, QueryServiceStatus, StartServiceW, CreateServiceW,
            SERVICE_QUERY_CONFIG, SERVICE_QUERY_STATUS, SERVICE_START, SERVICE_STOP,
            SERVICE_CONTROL_STOP, SERVICE_DELETE, SC_MANAGER_CREATE_SERVICE,
            SC_MANAGER_CONNECT, SC_MANAGER_ENUMERATE_SERVICE, SC_MANAGER_QUERY_LOCK_STATUS,
        },
    },
};
use widestring::U16CString;
```

### Opening the Service Control Manager

To interact with the Service Control Manager, we need to open a handle. The following function opens a handle to the SCM with the desired access rights:

```rust
fn open_sc_manager(desired_access: DWORD) -> Result<*mut c_void, DWORD> {
    let sc_manager_handle = unsafe { OpenSCManagerW(null_mut(), null_mut(), desired_access) };
    if sc_manager_handle.is_null() {
        Err(unsafe { GetLastError() })
    } else {
        Ok(sc_manager_handle)
    }
}
```

### Opening a Service

To perform operations on a specific service, we first need to open a handle to the service. The following function opens a handle to a service with the desired access rights:

```rust
fn open_service(
    sc_manager_handle: *mut c_void,
    service_name: &str,
    desired_access: DWORD,
) -> Result<*mut c_void, DWORD> {
    let service_name_wstr = U16CString::from_str(service_name).unwrap();
    let service_handle = unsafe {
        OpenServiceW(
            sc_manager_handle,
            service_name_wstr.as_ptr(),
            desired_access,
        )
    };
    if service_handle.is_null() {
        Err(unsafe { GetLastError() })
    } else {
        Ok(service_handle)
    }
}
```

### Querying Service Status

To query the status of a service, we can use the `QueryServiceStatus` function. The following function retrieves the status of a service using its handle:

```rust
fn query_service_status(service_handle: *mut c_void) -> Result<DWORD, DWORD> {
    let mut service_status = unsafe { std::mem::zeroed() };
    let result = unsafe { QueryServiceStatus(service_handle, &mut service_status) };
    if result == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(service_status.dwCurrentState)
    }
}
```

### Controlling a Service

To start, stop, or control a service, we can use the `StartServiceW`, `ControlService`, and `DeleteService` functions, respectively. The following functions demonstrate how to start, stop, and delete a service using their respective WinAPI functions:

```rust
fn start_service(service_handle: *mut c_void) -> Result<(), DWORD> {
    let result = unsafe { StartServiceW(service_handle, 0, null_mut()) };
    if result == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(())
    }
}

fn stop_service(service_handle: *mut c_void) -> Result<(), DWORD> {
    let mut service_status = unsafe { std::mem::zeroed() };
    let result = unsafe {
        ControlService(
            service_handle,
            SERVICE_CONTROL_STOP,
            &mut service_status,
        )
    };
    if result == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(())
    }
}

fn delete_service(service_handle: *mut c_void) -> Result<(), DWORD> {
    let result = unsafe { DeleteService(service_handle) };
    if result == 0 {
        Err(unsafe { GetLastError() })
    } else {
        Ok(())
    }
}
```

## Example: Managing a Windows Service

Let's put everything together and create a simple program that allows us to manage a Windows service. In this example, we will manage the "Windows Update" service, which has the service name "wuauserv". The program will allow us to query the status, start, stop, and delete the service.

```rust
fn main() {
    let sc_manager_handle = open_sc_manager(SC_MANAGER_CONNECT).unwrap();

    let service_name = "wuauserv";
    let service_handle = open_service(
        sc_manager_handle,
        service_name,
        SERVICE_QUERY_STATUS | SERVICE_START | SERVICE_STOP | SERVICE_DELETE,
    )
    .unwrap();

    // Query service status
    let status = query_service_status(service_handle).unwrap();
    println!("Service status: {}", status);

    // Start the service
    match start_service(service_handle) {
        Ok(_) => println!("Service started successfully."),
        Err(error) => println!("Failed to start service. Error: {}", error),
    }

    // Stop the service
    match stop_service(service_handle) {
        Ok(_) => println!("Service stopped successfully."),
        Err(error) => println!("Failed to stop service. Error: {}", error),
    }

    // Delete the service
    match delete_service(service_handle) {
        Ok(_) => println!("Service deleted successfully."),
        Err(error) => println!("Failed to delete service. Error: {}", error),
    }

    // Close the service and SCM handles
    unsafe {
        CloseServiceHandle(service_handle);
        CloseServiceHandle(sc_manager_handle);
    }
}
```

**Note**: Before running this example, ensure that you have administrative privileges, as managing services typically requires elevated permissions. Right-click on the command prompt or terminal and select "Run as administrator" before executing the program.

## Conclusion

In this article, we have demonstrated how to use the Windows API in Rust to manage Windows services. We have covered opening the Service Control Manager, opening a service, querying service status, and controlling a service (start, stop, and delete).

While this example is relatively simple, it provides a foundation for building more sophisticated tools and applications for managing Windows services. Rust's low-level control and safety features make it an excellent choice for systems programming, such as interacting with the Windows API.
