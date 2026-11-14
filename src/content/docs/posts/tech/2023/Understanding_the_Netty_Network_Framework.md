---
title: "Netty basics: channels, pipelines and an echo server in Java"
pubDate: "2024-01-17T06:08:15.000Z"
lastUpdated: 2026-11-14
description: "The core Netty concepts (Channel, ChannelPipeline, handlers, ByteBuf) and a complete echo server and client written against Netty 4.2."
tags: ["java"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3598219737.webp
---

Netty is an asynchronous, event-driven networking framework for the JVM. Instead of one blocking thread per socket, a small pool of event-loop threads handles I/O for many connections, and your protocol logic lives in handlers that react to events. It's the networking layer under projects like gRPC-Java, Vert.x and many database drivers.

The examples below use Netty 4.2 (4.2.20.Final at the time of writing). Netty 5 exists only as alpha releases.

## Core concepts

- **Channel:** an open connection (or listening socket). Operations like `write` and `close` are asynchronous and return a `ChannelFuture`.
- **EventLoop / EventLoopGroup:** an `EventLoop` is a thread that handles I/O for the channels assigned to it. A group is a pool of them.
- **ChannelPipeline:** an ordered chain of handlers attached to each channel. Inbound events (data read, connection active) flow from head to tail. Outbound operations (write, flush) flow from tail to head.
- **ChannelHandler:** your code. Inbound handlers implement `ChannelInboundHandler` (usually by extending `ChannelInboundHandlerAdapter` or `SimpleChannelInboundHandler`), and outbound handlers implement `ChannelOutboundHandler`.
- **ChannelHandlerContext:** a handler's link to its pipeline. You use it to write, fire events to the next handler, or reach the channel.
- **ByteBuf:** Netty's byte buffer. It has separate reader and writer indexes and is reference-counted, so whoever consumes a buffer last must release it.

Netty also ships codecs (HTTP/1.1, HTTP/2, WebSocket, Protobuf, line- and length-based framing) that you add to the pipeline as ordinary handlers.

## Changes in Netty 4.2

Older tutorials (and the first version of this post) create `new NioEventLoopGroup()`. In 4.2, all transport-specific event loop groups are deprecated. You pass an `IoHandlerFactory` to `MultiThreadIoEventLoopGroup` instead:

```java
EventLoopGroup group = new MultiThreadIoEventLoopGroup(NioIoHandler.newFactory());
```

`EpollIoHandler`, `KQueueIoHandler`, `IoUringIoHandler` and `LocalIoHandler` replace the other transports' groups. 4.2 also changed the default buffer allocator from `pooled` to `adaptive`. Set `-Dio.netty.allocator.type=pooled` to get the 4.1 behaviour back.

## Dependency

```xml
<dependency>
  <groupId>io.netty</groupId>
  <artifactId>netty-all</artifactId>
  <version>4.2.20.Final</version>
</dependency>
```

## Echo server

The server echoes back whatever it receives.

```java
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.MultiThreadIoEventLoopGroup;
import io.netty.channel.nio.NioIoHandler;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;

public class EchoServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new MultiThreadIoEventLoopGroup(1, NioIoHandler.newFactory());
        EventLoopGroup workerGroup = new MultiThreadIoEventLoopGroup(NioIoHandler.newFactory());
        try {
            ServerBootstrap b = new ServerBootstrap()
                .group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(new EchoServerHandler());
                    }
                });

            ChannelFuture f = b.bind(8080).sync();
            f.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}

class EchoServerHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        // write() only queues the data; the buffer is released after it's written.
        ctx.write(msg);
    }

    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) {
        // Flush once per batch of reads instead of once per message.
        ctx.flush();
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        cause.printStackTrace();
        ctx.close();
    }
}
```

The "boss" group accepts connections, and the "worker" group handles I/O on accepted channels. `write()` doesn't send anything by itself. Without a `flush()` (or `writeAndFlush()`), the client never receives the echo.

## Echo client

```java
import io.netty.bootstrap.Bootstrap;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.MultiThreadIoEventLoopGroup;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.nio.NioIoHandler;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.util.CharsetUtil;

public class EchoClient {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup group = new MultiThreadIoEventLoopGroup(NioIoHandler.newFactory());
        try {
            Bootstrap b = new Bootstrap()
                .group(group)
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(new EchoClientHandler());
                    }
                });

            ChannelFuture f = b.connect("localhost", 8080).sync();
            f.channel().closeFuture().sync();
        } finally {
            group.shutdownGracefully();
        }
    }
}

class EchoClientHandler extends SimpleChannelInboundHandler<ByteBuf> {
    @Override
    public void channelActive(ChannelHandlerContext ctx) {
        ctx.writeAndFlush(Unpooled.copiedBuffer("Hello, Netty!", CharsetUtil.UTF_8));
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {
        System.out.println("Client received: " + msg.toString(CharsetUtil.UTF_8));
        ctx.close();
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        cause.printStackTrace();
        ctx.close();
    }
}
```

`SimpleChannelInboundHandler` releases the `ByteBuf` for you after `channelRead0` returns. The client closes the channel after the first reply, which lets `closeFuture().sync()` return and the program exit.

## Gotchas

- **TCP is a byte stream, not a message stream.** One `write` on the client can arrive as several reads on the server, or several writes can arrive as one read. Real protocols need a framing decoder such as `LineBasedFrameDecoder` or `LengthFieldBasedFrameDecoder` at the front of the pipeline.
- **Reference counting.** If a handler consumes a `ByteBuf` and doesn't pass it on, it must call `ReferenceCountUtil.release(msg)`. Run tests with `-Dio.netty.leakDetection.level=paranoid` to catch leaks.
- **Don't block the event loop.** A slow database call inside a handler stalls every channel on that thread. Move blocking work to a separate executor.

## Further reading

- [Netty user guide for 4.x](https://netty.io/wiki/user-guide-for-4.x.html)
- [Netty 4.2 migration guide](https://netty.io/wiki/netty-4.2-migration-guide.html)
- [Official examples on GitHub](https://github.com/netty/netty/tree/4.2/example/src/main/java/io/netty/example)
