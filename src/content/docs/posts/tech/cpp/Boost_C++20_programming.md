---
title: "Using Boost in a C++20 project: setup, Asio coroutines and a Beast HTTP client"
pubDate: "2024-03-15T16:16:44.676Z"
lastUpdated: 2026-11-14
description: "How to build and link Boost for a C++20 project, which Boost libraries still matter next to the standard library, and working Asio and Beast examples."
tags: ["C++", "Boost", "C++20", "Programming", "Software Development"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2024/leveraging-boost-cpp20.png
---

Boost is a collection of peer-reviewed, portable C++ libraries. A lot of today's standard library started there (`shared_ptr`, `<regex>`, `<filesystem>`, `<chrono>`, `<thread>`), but C++20 still has no networking, so for sockets and HTTP Boost.Asio and Boost.Beast are still the usual choice. This post covers getting Boost into a C++20 build, then walks through an Asio server written with C++20 coroutines and a Beast HTTP client.

The examples were written against Boost 1.92.0.

## Installing Boost

Most Boost libraries are header-only. A few (Filesystem, Thread, Program Options, Serialization and others) have to be compiled and linked.

The quickest route is a package manager:

```bash
# Debian/Ubuntu (version follows the distro release, often a few behind)
sudo apt install libboost-all-dev

# macOS
brew install boost

# vcpkg (any platform)
vcpkg install boost-asio boost-beast
```

To build from source, download the archive from [boost.org](https://www.boost.org/releases/latest/), extract it, and run the bootstrap script followed by B2 (formerly Boost.Build):

```bash
# Unix-like systems
./bootstrap.sh
./b2 cxxstd=20 --with-filesystem --with-program_options

# Windows (Developer Command Prompt)
bootstrap.bat
b2 cxxstd=20 --with-filesystem --with-program_options
```

`--with-<name>` limits the build to the libraries you need; leave it off to build everything. Compiled libraries end up in `stage/lib`. Header-only libraries such as Asio and Beast need nothing beyond the include path pointing at the Boost root.

## Building with CMake

Boost installs a `BoostConfig.cmake` package, so use config mode:

```cmake
cmake_minimum_required(VERSION 3.20)
project(boost_demo CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Boost CONFIG REQUIRED)
find_package(Threads REQUIRED)

add_executable(server server.cpp)
target_link_libraries(server PRIVATE Boost::headers Threads::Threads)
```

For compiled libraries, request them as components, e.g. `find_package(Boost CONFIG REQUIRED COMPONENTS filesystem)` and link `Boost::filesystem`. The old `FindBoost` module is removed under CMake 3.30's policy CMP0167, so don't rely on module mode in new projects.

Without CMake, pass the standard flag directly: `-std=c++20` for GCC and Clang, `/std:c++20` for MSVC. GCC 10 also needs `-fcoroutines` for the coroutine example below. On MinGW, add `-lws2_32 -lmswsock` for Asio.

## Boost next to the C++20 standard library

Where C++17/20 now has an equivalent, prefer the standard version:

- `std::filesystem` (C++17) was based on Boost.Filesystem and covers most uses. Boost.Filesystem is also a compiled library, so dropping it simplifies the build.
- `std::ranges` covers the common Boost.Range use cases, though Boost.Range still has adaptors the standard lacks.
- `std::optional`, `std::variant` and `std::any` replace their Boost counterparts in most code.

Boost is still the pragmatic pick for networking (Asio, Beast), JSON (Boost.JSON), containers the standard doesn't have (`flat_map` before C++23, `static_vector`, `small_vector` in Boost.Container), and metaprogramming (Boost.Mp11, Boost.Hana).

Avoid Boost.Coroutine for new code. It is deprecated, and its successor Boost.Coroutine2 provides stackful coroutines, which are a different mechanism from C++20's stackless `co_await` coroutines. Asio integrates directly with the C++20 language feature, as the next example shows.

## Example: TCP server with Boost.Asio and C++20 coroutines

This server accepts connections on port 12345 and sends each client a greeting. Every connection runs in its own coroutine, so one slow client doesn't block the others, while the code still reads top to bottom.

```cpp
#include <boost/asio/co_spawn.hpp>
#include <boost/asio/detached.hpp>
#include <boost/asio/io_context.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/signal_set.hpp>
#include <boost/asio/use_awaitable.hpp>
#include <boost/asio/write.hpp>
#include <exception>
#include <iostream>
#include <string>
#include <utility>

namespace asio = boost::asio;
using asio::awaitable;
using asio::use_awaitable;
using asio::ip::tcp;

awaitable<void> greet(tcp::socket socket) {
    try {
        std::string message = "Hello from Boost.Asio server!\n";
        co_await asio::async_write(socket, asio::buffer(message), use_awaitable);
    } catch (std::exception const& e) {
        std::cerr << "Connection error: " << e.what() << '\n';
    }
}

awaitable<void> listener(unsigned short port) {
    auto executor = co_await asio::this_coro::executor;
    tcp::acceptor acceptor(executor, {tcp::v4(), port});
    std::cout << "Server is running on port " << port << '\n';

    for (;;) {
        tcp::socket socket = co_await acceptor.async_accept(use_awaitable);
        asio::co_spawn(executor, greet(std::move(socket)), asio::detached);
    }
}

int main() {
    try {
        asio::io_context io_context(1);

        asio::signal_set signals(io_context, SIGINT, SIGTERM);
        signals.async_wait([&](auto, auto) { io_context.stop(); });

        asio::co_spawn(io_context, listener(12345), asio::detached);
        io_context.run();
    } catch (std::exception const& e) {
        std::cerr << "Exception: " << e.what() << '\n';
    }
}
```

Build and try it:

```bash
g++ -std=c++20 server.cpp -o server -pthread
./server
# in another terminal
nc localhost 12345
```

A few things to note:

- `co_spawn(..., asio::detached)` starts a coroutine and discards its result. Exceptions that escape a detached coroutine are lost, which is why `greet` catches its own.
- `message` lives in the coroutine frame, so it stays valid for the whole `async_write`.
- The `signal_set` lets Ctrl+C stop `io_context.run()` cleanly.
- In recent Asio releases (Boost 1.87 and later) the default completion token is `deferred`, so `co_await socket.async_read_some(buf)` also works without `use_awaitable`. Passing it explicitly keeps the code working on older Boost versions.

The Asio docs ship a similar [echo server example](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/example/cpp20/coroutines/echo_server.cpp) that reads and writes in a loop.

## Example: HTTP GET with Boost.Beast

Beast builds HTTP and WebSocket support on top of Asio. It gives you message types, parsers and serializers, not a high-level client like libcurl, so you handle connections yourself. This synchronous client fetches `http://example.com/` and prints the response:

```cpp
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <exception>
#include <iostream>

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
using tcp = net::ip::tcp;

int main() {
    try {
        auto const host = "example.com";
        auto const port = "80";
        auto const target = "/";
        int const version = 11;  // HTTP/1.1

        net::io_context ioc;
        tcp::resolver resolver{ioc};
        beast::tcp_stream stream{ioc};

        auto const results = resolver.resolve(host, port);
        stream.connect(results);

        http::request<http::string_body> req{http::verb::get, target, version};
        req.set(http::field::host, host);
        req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);

        http::write(stream, req);

        beast::flat_buffer buffer;
        http::response<http::dynamic_body> res;
        http::read(stream, buffer, res);

        std::cout << res << '\n';

        beast::error_code ec;
        stream.socket().shutdown(tcp::socket::shutdown_both, ec);

        // not_connected happens sometimes, so don't treat it as an error
        if (ec && ec != beast::errc::not_connected)
            throw beast::system_error{ec};
    } catch (std::exception const& e) {
        std::cerr << "Error: " << e.what() << '\n';
        return 1;
    }
}
```

This is plain HTTP. For HTTPS you need `beast::ssl_stream` and OpenSSL; see the `http_client_sync_ssl` example in the Beast docs.

## Gotchas

- Mixing Boost versions between headers and compiled libraries causes link errors or ODR problems. Make sure the include path and library path point at the same install.
- Distro packages can lag several releases behind. If you need a recent Asio or Beast feature, use vcpkg, Conan or a source build.
- On Windows, Asio warns if `_WIN32_WINNT` isn't defined. Define it (for example `-D_WIN32_WINNT=0x0A00` for Windows 10) to silence the warning and pick the API level explicitly.

## Further reading

- [Boost getting started](https://www.boost.org/doc/libs/latest/more/getting_started/index.html)
- [Boost.Asio C++20 coroutine support](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview/composition/cpp20_coroutines.html)
- [Boost.Beast examples](https://www.boost.org/doc/libs/latest/libs/beast/doc/html/beast/examples.html)
