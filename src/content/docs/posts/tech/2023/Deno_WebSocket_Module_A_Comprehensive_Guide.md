---
description: In this article, we will explore the Deno WebSocket module and how to
  use it to build WebSocket applications in Deno
imgSrc: /imgs/2023/2421950579.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-08T09:48:30.000Z'
tags: []
title: Deno WebSocket Module A Comprehensive Guide
---

# Deno WebSocket Module: A Comprehensive Guide

WebSockets provide a full-duplex communication channel over a single, long-lived connection, enabling real-time interactions between a client and a server. In this article, we will explore the Deno WebSocket module and how to use it to build WebSocket applications in Deno.

## Table of Contents

1. [Introduction to WebSockets](#introduction-to-websockets)
2. [Setting Up Deno](#setting-up-deno)
3. [Creating a WebSocket Server](#creating-a-websocket-server)
4. [Creating a WebSocket Client](#creating-a-websocket-client)
5. [Handling WebSocket Events](#handling-websocket-events)
6. [Closing Thoughts](#closing-thoughts)

## Introduction to WebSockets

WebSockets are a protocol built on top of the TCP protocol, allowing for bidirectional communication between a server and a client. Unlike the HTTP protocol, which is request-response-based, WebSockets provide a persistent connection, enabling real-time communication.

Some common use cases for WebSockets include:

- Chat applications
- Real-time notifications
- Online gaming
- Live data feeds (e.g., stock market updates, news)

Now that we have an understanding of WebSockets, let's set up Deno and start building a WebSocket application.

## Setting Up Deno

Deno is a secure runtime for JavaScript and TypeScript, built on top of the V8 JavaScript engine and using the Rust programming language. To install Deno, follow the instructions on the [official Deno website](https://deno.land/).

Once Deno is installed, verify the installation by running the following command in your terminal:

```bash
deno --version
```

If the installation is successful, you should see output similar to this:

```
deno 1.13.2
v8 9.4.146.24
typescript 4.4.2
```

Now that Deno is set up, let's create a WebSocket server.

## Creating a WebSocket Server

To create a WebSocket server in Deno, we will use the `serve` function from the `std/ws/mod.ts` module. Here's a simple example of a WebSocket server:

```typescript
import { serve } from "https://deno.land/std/ws/mod.ts";

const port = 8080;
const server = serve({ port });

console.log(`WebSocket server running on ws://localhost:${port}`);

for await (const sock of server) {
  // Handle WebSocket connections
}
```

In the example above, we import the `serve` function from the Deno standard library and create a WebSocket server listening on port 8080. The server listens for incoming WebSocket connections and awaits them in a `for await` loop.

To run the server, save the code in a file named `server.ts` and execute the following command:

```bash
deno run --allow-net server.ts
```

Now that we have a WebSocket server, let's create a WebSocket client.

## Creating a WebSocket Client

Creating a WebSocket client in Deno is straightforward, as it uses the built-in WebSocket API available in modern web browsers. Here's a simple example of a WebSocket client:

```typescript
const ws = new WebSocket("ws://localhost:8080");

ws.addEventListener("open", (event) => {
  console.log("Connected to WebSocket server:", event);
});

ws.addEventListener("message", (event) => {
  console.log("Received message from server:", event.data);
});

ws.addEventListener("close", (event) => {
  console.log("Disconnected from WebSocket server:", event);
});
```

In the example above, we create a new WebSocket instance, specifying the server URL as the argument. We then add event listeners for `open`, `message`, and `close` events.

Save the code in a file named `client.ts` and execute the following command:

```bash
deno run --allow-net client.ts
```

## Handling WebSocket Events

Now that we have a basic WebSocket server and client, let's handle the events on the server side. We can do this using the `acceptWebSocket` function from the `std/ws/mod.ts` module and the `WebSocket` class.

Here's an example of handling WebSocket events on the server side:

```typescript
import { serve, acceptWebSocket, isWebSocketCloseEvent } from "https://deno.land/std/ws/mod.ts";

const port = 8080;
const server = serve({ port });

console.log(`WebSocket server running on ws://localhost:${port}`);

for await (const sock of server) {
  const socket = await acceptWebSocket({ conn: sock });
  console.log("Client connected");

  try {
    for await (const event of socket) {
      if (typeof event === "string") {
        console.log("Received message:", event);
        await socket.send(`Echo: ${event}`);
      } else if (isWebSocketCloseEvent(event)) {
        console.log("Client disconnected:", event.code, event.reason);
        socket.close();
      }
    }
  } catch (err) {
    console.error("WebSocket error:", err);
    await socket.close(1000);
  }
}
```

In this example, we import the `acceptWebSocket` function and `isWebSocketCloseEvent` predicate from the Deno standard library. Inside the `for await` loop, we accept an incoming socket and handle its events using another `for await` loop.

We check if the event is a string (representing a message), and if so, we log the message and send an echo response to the client. If the event is a WebSocket close event, we log the disconnection and close the socket.

Update the `server.ts` file with the new code and restart the server. Also, restart the client. You should now see messages being exchanged between the server and the client:

```
Server:
Client connected
Received message: Hello, Deno!
Client disconnected: 1000

Client:
Connected to WebSocket server: [object Event]
Received message from server: Echo: Hello, Deno!
Disconnected from WebSocket server: [object CloseEvent]
```

## Closing Thoughts

In this article, we covered the basics of using the Deno WebSocket module to create WebSocket applications. We set up a Deno environment, created a WebSocket server, built a WebSocket client, and handled WebSocket events on the server side.

By leveraging Deno's built-in WebSocket support, you can build real-time applications with ease. As you explore further, you can also look into additional features such as secure WebSocket (wss) connections, handling binary data, and implementing custom protocols on top of WebSockets.