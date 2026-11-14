---
description: 'Build a WebSocket echo server in Deno with Deno.serve and Deno.upgradeWebSocket, and connect to it with the built-in WebSocket client.'
imgSrc: /imgs/2023/2421950579.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-08T09:48:30.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript"]
title: 'WebSockets in Deno: an echo server and client'
---

:::caution[Updated in November 2026]
The first version of this post used `serve`, `acceptWebSocket` and `isWebSocketCloseEvent` from `https://deno.land/std/ws/mod.ts`. That module was removed from the standard library years ago, and the standard library is no longer published to `deno.land/std` at all. Deno now has WebSocket support built in: `Deno.upgradeWebSocket` on the server and the standard `WebSocket` class on the client. The examples below were run with Deno 2.9.
:::

WebSockets give a client and server a long-lived, two-way connection: after an HTTP upgrade handshake, either side can send messages at any time without a new request. They suit chat, live notifications, multiplayer games and streaming data feeds. Deno supports both ends with no imports.

## The server

A WebSocket connection starts as an HTTP request with an `Upgrade: websocket` header. `Deno.serve` handles the HTTP side, and `Deno.upgradeWebSocket` turns that request into a socket plus the `101 Switching Protocols` response you return:

```typescript
// server.ts
Deno.serve({ port: 8080 }, (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected a WebSocket upgrade", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    console.log("Client connected");
  });

  socket.addEventListener("message", (event) => {
    console.log("Received message:", event.data);
    socket.send(`Echo: ${event.data}`);
  });

  socket.addEventListener("close", (event) => {
    console.log("Client disconnected:", event.code);
  });

  socket.addEventListener("error", (event) => {
    console.error("WebSocket error:", event);
  });

  return response;
});
```

```bash
deno run --allow-net server.ts
```

The `socket` is the same `WebSocket` type a browser uses, so you work with it through events and `send()` rather than a `for await` loop. Don't call `socket.send()` until the `open` event has fired; the handshake isn't finished when the handler returns.

Plain HTTP requests to the same port get a `426 Upgrade Required`, which makes it easy to check the server is up with `curl -i localhost:8080`. In a real app you'd route on the path instead (for example, upgrade only on `/ws` and serve pages everywhere else).

## The client

Deno has the browser's `WebSocket` class as a global, so the client is the same code you'd write for a web page:

```typescript
// client.ts
const ws = new WebSocket("ws://localhost:8080");

ws.addEventListener("open", () => {
  console.log("Connected");
  ws.send("Hello, Deno!");
});

ws.addEventListener("message", (event) => {
  console.log("Received from server:", event.data);
  ws.close(1000, "done");
});

ws.addEventListener("close", (event) => {
  console.log("Disconnected:", event.code);
});
```

```bash
deno run --allow-net=localhost:8080 client.ts
```

Output from the two processes:

```text
# server
Listening on http://localhost:8080/
Client connected
Received message: Hello, Deno!
Client disconnected: 1000

# client
Connected
Received from server: Echo: Hello, Deno!
Disconnected: 1000
```

## Things to watch for

- **Binary data.** `event.data` is a string for text frames. For binary frames it's a `Blob` by default in browsers and Deno clients; set `ws.binaryType = "arraybuffer"` to get an `ArrayBuffer` instead.
- **Broadcasting.** Each connection has its own `socket`. To send to every client (a chat room, say), keep the open sockets in a `Set`, add on `open`, remove on `close`, and loop over it to send.
- **Secure connections.** Use `wss://` in production. If Deno serves TLS directly, pass `cert` and `key` to `Deno.serve`; more often a reverse proxy or your hosting platform terminates TLS and forwards the upgrade.
- **Dead connections.** Deno pings clients and closes a socket (firing `error` and `close`) if the client doesn't answer with a pong in time. The `idleTimeout` option to `Deno.upgradeWebSocket` sets that time in seconds; it defaults to 30, and `0` turns it off.

## Further reading

- [`Deno.upgradeWebSocket` API reference](https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket)
- [Deno example: WebSocket server](https://docs.deno.com/examples/http_server_websocket/)
- [WebSocket on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
