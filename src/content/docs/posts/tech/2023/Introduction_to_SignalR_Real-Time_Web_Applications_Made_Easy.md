---
description: What ASP.NET Core SignalR does, how it picks a transport, and how to build
  a minimal chat hub with Program.cs and the @microsoft/signalr JavaScript client.
imgSrc: /imgs/2023/2966567085.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-04T05:19:15.000Z'
lastUpdated: 2026-11-14
tags:
  - dotnet
  - csharp
title: "ASP.NET Core SignalR: pushing real-time updates from server to browser"
---

SignalR is the ASP.NET Core library for pushing messages from the server to connected clients as soon as something happens, instead of having clients poll for changes. You write a *hub* class on the server, clients call its methods, and the hub can call methods on one client, a group, or every client. Typical uses are chat, live dashboards, notifications and collaborative editing.

This post covers ASP.NET Core SignalR. The older ASP.NET SignalR for .NET Framework is a separate, incompatible library.

## How it works

When a client connects, it first sends a negotiate request to the server, and the two agree on a transport. SignalR tries these in order and uses the first one both sides support:

1. WebSockets
2. Server-Sent Events
3. Long polling

Once connected, messages are serialized with the hub protocol (JSON by default, MessagePack optionally) and sent over that transport. Your code doesn't change based on which transport was picked.

What SignalR handles for you:

- **Connections and groups.** `Clients.All`, `Clients.Caller`, `Clients.Client(id)` and `Clients.Group(name)` target messages; `Groups.AddToGroupAsync` manages group membership.
- **Reconnection.** The JavaScript client can reconnect automatically if you call `withAutomaticReconnect()`.
- **Clients.** Microsoft ships client libraries for JavaScript/TypeScript, .NET and Java.
- **Scale-out.** With more than one server, a message sent on one server has to reach clients connected to the others. Use Azure SignalR Service or a Redis backplane for that. Without Azure SignalR Service, you also need sticky sessions in most setups.

## A minimal chat hub

The SignalR server is part of the ASP.NET Core shared framework, so a web project needs no extra NuGet package.

Define a hub:

```csharp
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}
```

Register SignalR and map the hub in `Program.cs` (the minimal hosting model used since .NET 6; older projects do the same thing in `Startup.ConfigureServices` and `Startup.Configure`):

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.MapHub<ChatHub>("/chatHub");

app.Run();
```

## The JavaScript client

Install the client from npm:

```bash
npm install @microsoft/signalr
```

The browser build is at `node_modules/@microsoft/signalr/dist/browser/signalr.js`; copy it into `wwwroot` or bundle it. Then connect to the hub:

```javascript
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .withAutomaticReconnect()
    .build();

connection.on("ReceiveMessage", (user, message) => {
    const li = document.createElement("li");
    li.textContent = `${user}: ${message}`;
    document.getElementById("messages").appendChild(li);
});

async function start() {
    try {
        await connection.start();
    } catch (err) {
        console.error(err);
    }
}

start();

// Call the hub method from a button handler, for example:
// await connection.invoke("SendMessage", "alice", "hello");
```

The string passed to `connection.on` must match the name used in `SendAsync` on the server, and the name passed to `invoke` must match the hub method name.

## Gotchas

- `withAutomaticReconnect()` doesn't retry the *initial* `start()`. If the first connection fails, retry it yourself.
- Hubs are transient: a new instance is created for each call. Don't store state in hub fields; use a singleton service or a database.
- Behind a proxy or load balancer, make sure WebSocket upgrades are allowed, or SignalR will silently fall back to slower transports.

## Further reading

- [Overview of ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/signalr/introduction)
- [Tutorial: Get started with ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/tutorials/signalr)
- [SignalR hosting and scaling](https://learn.microsoft.com/aspnet/core/signalr/scale)
