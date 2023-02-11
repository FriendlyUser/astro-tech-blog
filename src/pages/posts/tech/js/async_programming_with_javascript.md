---
title: Async Programming With Javascript
description: Using resolutions in package.json
alt: my first blog post
tags: ["js","introToJs","express"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 Feb 2023 13:00:00 GMT
imgSrc: '/imgs/2023/2126341537_forest.png'
---

# Asynchronous Programming

The only way to learn a new programming language is by writing programs
in it --- Dennis Ritchie

Asynchronous programming in JavaScript refers to the concept of
non-blocking I/O operations. This means that when an asynchronous
operation is performed, the program continues to execute the next
instruction without waiting for the asynchronous operation to complete.
This can be achieved using callbacks, promises, and async/await.

## Introduction to Promises

A JavaScript promise is an object that represents the eventual result of
an asynchronous operation. A promise can be in one of three states:
fulfilled, rejected, or pending. A fulfilled promise means that the
asynchronous operation has completed successfully and a value is
available. A rejected promise means that the asynchronous operation has
failed and an error is available. A pending promise means that the
asynchronous operation is still in progress.

Promises are a better alternative to callback functions for handling
asynchronous operations in JavaScript, because they make it easier to
write and maintain code that uses asynchronous operations. Promises
provide a cleaner and more intuitive syntax for working with
asynchronous operations, and they can be composed together to create
complex asynchronous behavior.

##### Why use promises

Callback hell is a term used to describe the problem of deeply nested
callback functions in JavaScript code. This can make the code difficult
to read and maintain, and can lead to problems with the execution order
of the asynchronous operations. To avoid callback hell, it is
recommended to use the async/await syntax introduced in ES2017, or to
use promises and the Promise.then() method.

Here is an example of using promises in JavaScript:

```javascript
const myPromise = new Promise((resolve, reject) => {
  // do something asynchronous
  if (/* asynchronous operation was successful */) {
    resolve(/* result of the asynchronous operation */);
  } else {
    reject(/* error occurred during the asynchronous operation */);
  }
});

myPromise
  .then((result) => {
    // do something with the result of the promise
  })
  .catch((error) => {
    // handle any error that occurred during the promise
  });
```

In the example above, the myPromise object is created with a function
that performs an asynchronous operation. The function takes two
arguments, resolve and reject, which are used to signal the completion
or failure of the asynchronous operation. The then() method is used to
specify a callback function that is called when the promise is fulfilled
(i.e., the asynchronous operation is successful), and the catch() method
is used to specify a callback function that is called if the promise is
rejected (i.e., an error occurred during the asynchronous operation).

## Http Requests

HTTP, or Hypertext Transfer Protocol, is a networking protocol that is
used to transfer data on the web. HTTP requests are messages sent by a
client, such as a web browser, to a server to request information or
perform actions. The server then responds to the request with an HTTP
response message.

There are several different types of HTTP requests, each of which is
used for a specific purpose. The most common types of HTTP requests are:

-   GET: A GET request is used to retrieve data from a server. This type
    of request is typically used to retrieve a web page or other
    resource from a server.

-   POST: A POST request is used to send data to a server for
    processing. This type of request is typically used when a user
    submits a form on a web page, and the data from the form is sent to
    the server for processing.

-   PUT: A PUT request is used to update a resource on a server. This
    type of request is typically used to update an existing web page or
    other resource on a server.

-   DELETE: A DELETE request is used to delete a resource on a server.
    This type of request is typically used to remove a web page or other
    resource from a server.

These are the most common types of HTTP requests, but there are many
other types of requests that can be used for different purposes. HTTP
requests are an important part of how the web works, as they allow
clients and servers to communicate and exchange information.

##### What is an Endpoint

An endpoint is a specific URL that is used to access a web service or
API. An endpoint typically specifies the location of a specific resource
or service on a server, and includes any necessary parameters or query
string values.

For example, consider a web service that allows users to search for
books by title. The endpoint for this service might be something like
https://example.com/books?title=harry+potter, where
https://example.com/books is the base URL for the service, and
title=harry+potter is a query string parameter that specifies the search
term.

In this example, the endpoint is the full URL that is used to access the
book search service. When a client, such as a web browser, makes an HTTP
request to this endpoint, the server responds with the search results
for the specified query.

Endpoints are an important part of how web services and APIs work, as
they provide a way for clients to access the specific resources or
services that are offered by the server. Endpoints typically include the
base URL for the service, as well as any necessary parameters or query
string values, to specify the exact resource or action that is being
requested.

To make an HTTP request in , you can use the object or the fetch API.
Here's an example of how to use to make a GET request to fetch some data
from a server:

``` {.Javascript language="Javascript" caption="How to make a HTTP request in Javascript"}
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://www.example.com/api/data', true);

xhr.onload = function() {
  if (this.status == 200) {
    var data = JSON.parse(this.response);
    // do something with the data
  }
};

xhr.send();
```

Here's an example of how to use the fetch API to make the same request:

``` {.Javascript language="Javascript" caption="HTTP request using fetch"}
fetch('https://www.example.com/api/data')
  .then(response => response.json())
  .then(data => {
    // do something with the data
  });
```

Both and fetch allow you to specify additional options such as the
request headers, and you can use them to make other types of HTTP
requests such as POST, PUT, and DELETE.

### Using Fetch

In JavaScript, the fetch() method is used to perform HTTP requests. It
is a modern way to make network requests to retrieve resources from a
server. fetch() is similar to other web request APIs like XMLHttpRequest
(XHR).

The PokeAPI is a free and open-source API for accessing data about the
Pokémon video game series. The API provides a GraphQL endpoint that
allows you to query the API using the GraphQL language.

Here is an example of using the fetch() method to retrieve data about a
Pokemon from the PokeAPI:

``` {.Javascript language="Javascript" caption="Fetching entry from poke api"}
fetch('https://pokeapi.co/api/v2/pokemon/1')
  .then(response => response.json())
  .then(data => {
    console.log(data);
    // do something with the data here
  });
```

In this example, the fetch() method is used to make a GET request to the
PokeAPI to retrieve information about the Pokemon with the ID of 1,
which is Bulbasaur. The response.json() method is used to parse the
response as JSON, and then the data is logged to the console.

To use authentication headers with the fetch function in JavaScript, you
can pass an object with the headers property as the second argument to
the fetch function. The headers property should be an object that
contains the key-value pairs for the headers you want to include in the
request.

For example, if you wanted to include an Authorization header with a
bearer token, you could do something like this:

``` {.Javascript language="Javascript" caption="\"Authroization header example with fetch"}
const headers = {
  'Authorization': 'Bearer <your-bearer-token-here>'
};

fetch('https://example.com/api/v1/data', { headers })
  .then(response => response.json())
  .then(data => {
    // do something with the data here
  });
```

In this example, the headers object contains the Authorization header
with a bearer token. This object is passed as the second argument to the
fetch function, which includes the headers in the HTTP request.

#### Using the abort controller

The AbortController is a new API that allows you to abort an ongoing
fetch() request. It is typically used when you want to cancel a request
if the user navigates away from the current page, or if the user has
started a new request that replaces the previous one.

Here is an example of how to use the AbortController with the fetch()
method:

``` {.Javascript language="Javascript" caption="AbortController example"}
const controller = new AbortController();
const signal = controller.signal;

fetch('https://pokeapi.co/api/v2/pokemon/1', { signal })
  .then(response => response.json())
  .then(data => {
    console.log(data);
    // do something with the data here
  });

// later, if you want to cancel the request:
controller.abort();
```

#### Fetch vs AJAX

The main difference between fetch() and AJAX (Asynchronous JavaScript
and XML) is that fetch() is a modern browser API, while AJAX is a
technique used to send HTTP requests and retrieve data from a server.
AJAX is based on the older XMLHttpRequest (XHR) API, which is supported
by all modern browsers, but it has been largely replaced by the newer
fetch() API.

Here are some other key differences between fetch() and AJAX:

-   fetch() uses promises, while AJAX uses callbacks. This means that
    fetch() is easier to use and allows for more readable code,
    especially when dealing with asynchronous operations.

-   fetch() supports the streaming of data, which means that you can
    start processing the data as soon as it becomes available, rather
    than having to wait for the entire response to be received. AJAX
    does not support streaming.

-   fetch() supports the use of request and response objects, which
    provide a more powerful and flexible API for making web requests and
    handling responses. AJAX does not have this concept.

Overall, fetch() is a more modern and powerful API for making web
requests, and it is the recommended way to perform HTTP requests in
JavaScript.

## Other ways to use fetch

The fetch function can be used for web scraping, but it is generally not
the best option for this purpose. The fetch function is intended for
making HTTP requests and retrieving data from a server, not for
extracting data from an HTML page.

There are many dedicated tools and libraries that are better suited for
web scraping, such as Puppeteer and Cheerio. These tools provide a more
convenient and efficient way to extract data from HTML pages and can be
easily integrated with the fetch function.

Here is an example of how you might use the fetch function and Cheerio
to scrape data from an HTML page:

```javascript
  .then(response => response.text())
  .then(html => {
    const $ = cheerio.load(html);
    const data = $('#some-element').text();
    // do something with the data here
  });
```

In this example, the fetch function is used to make a GET request to the
example website, and then the response is passed to the then callback
function. The response.text() method is used to convert the response to
a string of HTML, which is then passed to Cheerio's load method. This
creates a Cheerio object that can be used to extract data from the HTML
using jQuery like syntax. In this case, the #some-element element is
selected and its text content is extracted and stored in the data
variable. From there, you can use the data however you like.

Again, this is just one example of how you might use the fetch function
for web scraping. There are many other ways to accomplish this, and the
specific approach you choose will depend on your specific needs and
requirements.

### Introduction to caching

A cache is a way of storing data so that future requests for the same
data can be served faster. One way to use a cache with the fetch
function (which is used to request data from a server) is to store the
responses from fetch in a cache. Then, when a request is made for the
same data, it can be served from the cache instead of making a new
request to the server. This can improve the performance of your
application by reducing the number of requests that need to be made to
the server.

When data is requested from a server, it can be stored in a cache so
that future requests for the same data can be served faster. This is
because the data can be served from the cache instead of making a new
request to the server. This can improve the performance of the
application by reducing the amount of time it takes to serve data to the
user.

Caching can be especially beneficial in applications that make many
requests to the same server, or in applications that are used by a large
number of users who may be requesting the same data. In these cases,
caching can reduce the load on the server and improve the overall
performance of the application.

Here is an example of using a simple cache with the fetch function:

``` {.Javascript language="Javascript"}
// Create a cache to store the responses from fetch
const cache = new Map();

// Define a function that uses fetch to request data from a server
function getData(url) {
  // Check if the data is already in the cache
  if (cache.has(url)) {
    // If it is, return the data from the cache
    return cache.get(url);
  } else {
    // If it's not in the cache, use fetch to request the data from the server
    return fetch(url)
      .then(response => response.json())
      .then(data => {
        // Store the data in the cache for future use
        cache.set(url, data);
        // Return the data
        return data;
      });
  }
}
```

In this example, the getData function uses fetch to request data from a
server. If the data has been requested before, it will be served from
the cache instead of making a new request to the server. This can
improve the performance of your application by reducing the number of
requests that need to be made to the server.

There are several JavaScript libraries that can be used to implement
caching on the client side. Some examples include:

-   lscache: This library is a simple in-memory cache that can be used
    to store data in the client's browser. It has a simple API and can
    be easily integrated into an application.

-   Memoizee: This library is a simple utility that can be used to
    memoize (cache) the results of expensive function calls. It can be
    used to improve the performance of an application by storing the
    results of frequently-used functions in a cache.

-   QuickLRU: This library is a simple, lightweight, and efficient LRU
    (Least Recently Used) cache. It can be used to store data in a cache
    and automatically remove the least recently used items when the
    cache reaches its maximum size.

-   tiny-lru: This library is a small and efficient LRU cache that can
    be used to store data in a cache. It has a simple API and is easy to
    integrate into an application.

These are just a few examples of JavaScript libraries that can be used
to implement caching on the client side. There are many other libraries
available, and the best one to use will depend on the specific
requirements of your application.

## References

This content came from a book I generated using chatGPT and a lot of editing.

View on the source material see amazon https://www.amazon.com/dp/B0BSL14M71

For a free copy, please view https://friendlyuser.github.io/assets/pdfs/introToJs.pdf