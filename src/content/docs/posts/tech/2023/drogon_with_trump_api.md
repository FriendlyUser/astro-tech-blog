---
tags: ['drogon']
title: What is Drogon.
description: Simple application with drogon that talks to the Donald Trump API.
pubDate: Fri, 14 June 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.png
---

Drogon is a C++14/17-based HTTP application framework. It can be used to build various types of web applications such as APIs and backend services. One interesting use case for Drogon is to build an application that interacts with the Donald Trump API available at https://www.tronalddump.io/.

The Donald Trump API provides access to a large collection of quotes and tweets from the former US President. Using Drogon, you can easily create an application that fetches data from this API and processes it in various ways.

Here's an example of how you might use Drogon to interact with the Donald Trump API:

```cpp
#include <drogon/drogon.h>
#include <iostream>

int main() {
    auto client = drogon::HttpClient::newHttpClient("https://api.tronalddump.io");
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Get);
    req->setPath("/random/quote");

    client->sendRequest(req,
        [](drogon::ReqResult result, const drogon::HttpResponsePtr &resp) {
            if (result == drogon::ReqResult::Ok) {
                std::cout << resp->getBody() << std::endl;
            } else {
                std::cerr << "Error: " << resp->getStatusCode() << std::endl;
            }
        });

    drogon::app().run();
}
```

This code creates a new `HttpClient` object that connects to the Donald Trump API. It then creates a new `HttpRequest` object and sets its method to `GET` and its path to `/random/quote`. This will fetch a random quote from the API.

The request is then sent using the `sendRequest` method of the `HttpClient` object. The callback function passed as the second argument will be called when the response is received. In this case, we simply print out the body of the response if it was successful.

This is just one simple example of how you can use Drogon to interact with APIs like the Donald Trump API. With its powerful features and easy-to-use interface, Drogon makes it easy to build complex web applications that interact with external data sources.