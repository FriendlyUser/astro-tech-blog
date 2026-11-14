---
tags: ['drogon', 'cpp']
title: Calling a JSON API with Drogon's HTTP client in C++
description: A small C++ program that uses Drogon's HttpClient to fetch a random quote from the Tronald Dump API, with error handling and a clean shutdown.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.webp
---

:::caution
The Tronald Dump API (https://www.tronalddump.io/) used in this post is no longer online, so the request below now fails with a network or handshake error. The Drogon client code is unchanged for any other HTTP API: swap the base URL and path for a service that is still running.
:::

[Drogon](https://github.com/drogonframework/drogon) is an asynchronous HTTP framework for C++17/20. It's mostly used to build servers, but it also includes an `HttpClient` for calling other services. This post uses that client to fetch a random quote from the Tronald Dump API, a public API of Donald Trump quotes.

## The program

```cpp
#include <drogon/drogon.h>
#include <iostream>

int main() {
    auto client = drogon::HttpClient::newHttpClient("https://api.tronalddump.io");

    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Get);
    req->setPath("/random/quote");

    client->sendRequest(
        req,
        [](drogon::ReqResult result, const drogon::HttpResponsePtr &resp) {
            if (result != drogon::ReqResult::Ok) {
                // No response arrived, so resp is null here.
                std::cerr << "Request failed: " << result << '\n';
            } else if (resp->getStatusCode() != drogon::k200OK) {
                std::cerr << "HTTP " << resp->getStatusCode() << '\n';
            } else {
                std::cout << resp->getBody() << '\n';
            }
            drogon::app().quit();  // stop the event loop so the program exits
        });

    drogon::app().run();
}
```

How it works:

- `HttpClient::newHttpClient` takes the scheme and host. The path goes on the request, not the client.
- `sendRequest` is asynchronous. It queues the request and returns immediately; the callback runs once the response (or an error) arrives.
- Nothing is sent until the event loop starts, which is what `drogon::app().run()` does. `run()` blocks until something calls `app().quit()`, so the callback calls it once it has printed the result. Without that, the program would sit there forever.
- When `result` isn't `ReqResult::Ok` there is no response, and `resp` is a null pointer. The first version of this post called `resp->getStatusCode()` in that branch, which crashes on exactly the errors you're trying to report. `ReqResult` can be streamed directly and prints a readable message such as "Network failure" or "Handshake error".

## Building

Drogon installs a CMake package, so a minimal `CMakeLists.txt` looks like this:

```cmake
cmake_minimum_required(VERSION 3.15)
project(quote_client CXX)

set(CMAKE_CXX_STANDARD 17)
find_package(Drogon CONFIG REQUIRED)

add_executable(quote_client main.cc)
target_link_libraries(quote_client PRIVATE Drogon::Drogon)
```

HTTPS URLs only work if Drogon (and its networking library, Trantor) was built with OpenSSL or Botan. If it wasn't, requests to `https://` hosts fail.

## Next steps

- For JSON responses, `resp->getJsonObject()` returns a `std::shared_ptr<Json::Value>` (jsoncpp) so you can read individual fields instead of printing the raw body. The pointer is empty if the body isn't valid JSON, so check it first.
- For several requests to the same host, create one `HttpClient` and reuse it rather than making a new client per request.
- Drogon also supports C++20 coroutines, where `co_await client->sendRequestCoro(req)` replaces the callback.

See the [Drogon wiki](https://github.com/drogonframework/drogon/wiki) for the client and coroutine documentation.
