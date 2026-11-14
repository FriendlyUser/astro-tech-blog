---
title: Writing a callback-style WebSocket client in Go with gowebsocket
pubDate: "2023-05-24T18:13:58.199Z"
lastUpdated: 2026-11-14
description: "Connect to a WebSocket server from Go with sacOO7/gowebsocket: event callbacks, sending text and binary messages, and closing cleanly."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/818001379.png
---

:::caution[Correction]
An earlier version of this post described a WebSocket library called "Micha" at `github.com/sacOO7/micha`. That repository does not exist; the Go library called `micha` that does exist, [onrik/micha](https://github.com/onrik/micha), is a Telegram bot client. The API the post showed matches the same author's [`gowebsocket`](https://github.com/sacOO7/gowebsocket), so the post now uses that, with the callback signatures corrected.

`gowebsocket` has not had a commit since 2022. For new code, [`coder/websocket`](https://github.com/coder/websocket) or [`gorilla/websocket`](https://github.com/gorilla/websocket) are better-maintained choices.
:::

`gowebsocket` is a thin wrapper around `gorilla/websocket` that gives you a callback-based client: you set functions for "connected", "text message received", "disconnected" and so on, call `Connect()`, and the library runs the read loop for you. It suits small tools and bots that just need to react to messages.

## Install

Inside a Go module:

```sh
go get github.com/sacOO7/gowebsocket
```

## Connecting and handling events

`gowebsocket.New` takes a `ws://` or `wss://` URL and returns a `Socket`. Each callback receives the socket as its last argument:

```go
package main

import (
	"log"
	"os"
	"os/signal"

	"github.com/sacOO7/gowebsocket"
)

func main() {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)

	socket := gowebsocket.New("ws://localhost:8080/ws")

	socket.OnConnected = func(s gowebsocket.Socket) {
		log.Println("connected")
	}
	socket.OnConnectError = func(err error, s gowebsocket.Socket) {
		log.Println("connect error:", err)
	}
	socket.OnTextMessage = func(message string, s gowebsocket.Socket) {
		log.Println("text:", message)
	}
	socket.OnBinaryMessage = func(data []byte, s gowebsocket.Socket) {
		log.Printf("binary: %v", data)
	}
	socket.OnDisconnected = func(err error, s gowebsocket.Socket) {
		log.Println("disconnected:", err)
	}

	socket.Connect()
	if !socket.IsConnected {
		os.Exit(1) // OnConnectError has already logged the reason
	}

	socket.SendText("Hello, WebSocket!")

	<-interrupt // wait for Ctrl+C
	socket.Close()
}
```

`Connect()` performs the handshake before returning and then reads messages on a background goroutine, so `main` has to stay alive; here it blocks on the interrupt signal.

If the handshake fails, `Connect()` calls `OnConnectError` and returns without a connection. Calling `SendText` or `Close` after that panics with a nil pointer, which is why the example checks `IsConnected` first. One quirk: the library only sets `IsConnected` to `true` when an `OnConnected` callback is registered, so always set one.

## Sending messages

```go
socket.SendText("Hello, WebSocket!")
socket.SendBinary([]byte{0x01, 0x02, 0x03})
```

`SendText` and `SendBinary` don't return an error; a failed write is only logged. If you need to know, use `coder/websocket` or `gorilla/websocket` directly. Sends are guarded by a mutex, so you can call them from several goroutines, including from inside the callbacks via the `s` argument.

## Headers and connection options

Set request headers before calling `Connect()`, for example to pass an auth token:

```go
socket.RequestHeader.Set("Authorization", "Bearer "+token)
```

Compression, subprotocols and a proxy are configured through `ConnectionOptions`:

```go
socket.ConnectionOptions = gowebsocket.ConnectionOptions{
	UseCompression: true,
	UseSSL:         false, // see below
	Subprotocols:   []string{"chat"},
}
```

Watch out for `UseSSL`: it is passed straight to `tls.Config.InsecureSkipVerify`, and `New()` sets it to `true`. So by default a `wss://` connection does **not** verify the server's certificate. Set `UseSSL: false` to turn verification on.

## Closing

```go
socket.Close()
```

This sends a close frame, closes the connection, and calls `OnDisconnected` (with a `nil` error if the close frame was sent successfully). `OnDisconnected` also fires if the server closes the connection or a read fails.

## Further reading

- [gowebsocket on GitHub](https://github.com/sacOO7/gowebsocket)
- [coder/websocket](https://github.com/coder/websocket), a maintained, context-aware WebSocket library
- [gorilla/websocket](https://github.com/gorilla/websocket)
