---
title: "POCO C++ Libraries: an HTTP client, threads, and directory listing"
pubDate: "2023-05-03T14:16:44.691Z"
lastUpdated: 2026-11-14
description: "Install the POCO C++ Libraries with vcpkg or Conan, link them with CMake, and write an HTTP GET client, a threaded worker, and a recursive directory listing."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2465919888.png
---

POCO (Portable Components) is a set of open-source C++ libraries for networked, cross-platform applications. It's split into modules you link separately: `Foundation` (threads, streams, file system, logging), `Net` (sockets, HTTP client and server), `NetSSL` (TLS), `Util` (configuration, command-line apps), plus `JSON`, `XML`, `Data` (databases) and others. It runs on Windows, Linux and macOS and is released under the Boost Software License.

This post sets it up and walks through three small programs: an HTTP GET request, two worker threads, and a recursive directory listing.

## Installing and linking

With vcpkg:

```sh
vcpkg install poco
```

With Conan 2 (1.15.4 is the current version on ConanCenter at the time of writing):

```sh
conan install --requires=poco/1.15.4 --build=missing -g CMakeDeps -g CMakeToolchain
```

You can also build from source using the instructions on [pocoproject.org](https://pocoproject.org/download). Either way, POCO installs CMake package files, so a project only needs:

```cmake
cmake_minimum_required(VERSION 3.16)
project(poco_demo CXX)

set(CMAKE_CXX_STANDARD 17)
find_package(Poco REQUIRED COMPONENTS Foundation Net)

add_executable(http_get http_get.cpp)
target_link_libraries(http_get PRIVATE Poco::Net Poco::Foundation)
```

## An HTTP GET request

`HTTPClientSession` holds the connection, `HTTPRequest` describes what to send, and `receiveResponse()` fills an `HTTPResponse` and returns a stream for the body.

```cpp
#include <Poco/Net/HTTPClientSession.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>
#include <Poco/Exception.h>
#include <Poco/StreamCopier.h>
#include <iostream>

int main() {
    try {
        Poco::Net::HTTPClientSession session("example.com", 80);
        Poco::Net::HTTPRequest request(Poco::Net::HTTPRequest::HTTP_GET, "/",
                                       Poco::Net::HTTPMessage::HTTP_1_1);
        Poco::Net::HTTPResponse response;

        session.sendRequest(request);
        std::istream& body = session.receiveResponse(response);

        if (response.getStatus() == Poco::Net::HTTPResponse::HTTP_OK) {
            Poco::StreamCopier::copyStream(body, std::cout);
        } else {
            std::cerr << "HTTP " << response.getStatus() << " " << response.getReason() << '\n';
            return 1;
        }
    } catch (const Poco::Exception& e) {
        std::cerr << "Request failed: " << e.displayText() << '\n';
        return 1;
    }
    return 0;
}
```

Network errors (DNS failure, refused connection, timeout) are thrown as `Poco::Exception` subclasses, not returned, so wrap the call in `try`/`catch`. `displayText()` gives a more useful message than `what()`.

`HTTPClientSession` speaks plain HTTP only. For HTTPS, use `Poco::Net::HTTPSClientSession` from the `NetSSL` module (`Poco::NetSSL` in CMake), which builds on OpenSSL or, on Windows, Schannel. POCO doesn't follow redirects for you either; check for 3xx statuses and the `Location` header yourself.

## Running work on threads

`Poco::Thread` runs any object that implements `Poco::Runnable`. The example computes two Fibonacci numbers on separate threads and prints the results.

```cpp
#include <Poco/Mutex.h>
#include <Poco/Runnable.h>
#include <Poco/Thread.h>
#include <iostream>

// One mutex shared by all workers, so their output lines don't interleave.
static Poco::FastMutex coutMutex;

class FibonacciCalculator : public Poco::Runnable {
public:
    explicit FibonacciCalculator(int n) : _n(n) {}

    void run() override {
        long long result = fibonacci(_n);
        Poco::FastMutex::ScopedLock lock(coutMutex);
        std::cout << "Fibonacci(" << _n << ") = " << result << '\n';
    }

private:
    int _n;

    static long long fibonacci(int n) {
        return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
    }
};

int main() {
    FibonacciCalculator calc1(10);
    FibonacciCalculator calc2(30);

    Poco::Thread thread1;
    Poco::Thread thread2;
    thread1.start(calc1);
    thread2.start(calc2);

    thread1.join();
    thread2.join();
    return 0;
}
```

The mutex must be shared between the threads to do anything. If each `Runnable` owns its own mutex, every thread locks a different object and nothing is synchronised. `ScopedLock` releases the lock even if the output throws.

`Thread::start(Runnable&)` doesn't copy the object, so it must outlive the thread; here the calculators live in `main` until after `join()`. For a short task, `thread.startFunc([] { ... })` takes a lambda instead. For many small tasks, `Poco::ThreadPool::defaultPool()` reuses threads rather than creating one per job.

## Listing a directory tree

`Poco::DirectoryIterator` yields a `Poco::File` for each entry in one directory. Recursing on subdirectories gives a full tree.

```cpp
#include <Poco/DirectoryIterator.h>
#include <Poco/Exception.h>
#include <Poco/Path.h>
#include <iostream>
#include <string>

void listDirectory(const std::string& directoryPath, int depth = 0) {
    Poco::DirectoryIterator end;
    for (Poco::DirectoryIterator it(directoryPath); it != end; ++it) {
        std::string indent(depth * 2, ' ');
        if (it->isLink()) {
            std::cout << indent << "Link: " << it.name() << '\n';  // don't follow links
        } else if (it->isDirectory()) {
            std::cout << indent << "Directory: " << it.name() << '\n';
            listDirectory(it.path().toString(), depth + 1);
        } else if (it->isFile()) {
            std::cout << indent << "File: " << it.name() << '\n';
        }
    }
}

int main(int argc, char* argv[]) {
    try {
        listDirectory(argc > 1 ? argv[1] : ".");
    } catch (const Poco::Exception& e) {
        std::cerr << e.displayText() << '\n';
        return 1;
    }
    return 0;
}
```

Skipping symbolic links avoids infinite loops when a link points back up the tree. Unreadable directories throw (for example `Poco::FileAccessDeniedException`), which `main` catches. POCO also has `Poco::RecursiveDirectoryIterator` if you'd rather not write the recursion yourself.

## When not to reach for POCO

Since C++11 and C++17, the standard library covers some of this: `std::thread`, `std::mutex` and `std::filesystem::recursive_directory_iterator` do the jobs of the last two examples without an extra dependency. POCO is more useful for what the standard library still lacks: HTTP clients and servers, TLS, SMTP/FTP, JSON/XML parsing, configuration files and database access, all with one consistent API. If you only need an HTTP client, smaller libraries such as libcurl or cpp-httplib are worth comparing.

## Further reading

- [POCO documentation](https://docs.pocoproject.org/)
- [POCO on GitHub](https://github.com/pocoproject/poco)
