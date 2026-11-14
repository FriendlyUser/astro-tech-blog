---
description: What Eclipse Jetty is, how its server, connectors and handlers fit together in Jetty 12, and how to embed it in a Java app or run it standalone.
imgSrc: /imgs/2023/3383398588-ship-on-the-ocean.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-12-27T08:18:10.000Z'
lastUpdated: 2026-11-14
tags: ["java"]
title: 'Eclipse Jetty: an introduction to the Java web server and servlet container'
---

Eclipse Jetty is a Java HTTP server, HTTP client and servlet container. You can run it standalone and deploy web applications (WAR files) to it, or embed it as a library so your `main` method starts an HTTP server, which is how many frameworks and tools use it. It is an Eclipse Foundation project, dual-licensed under the Eclipse Public License 2.0 and Apache License 2.0.

## Versions

| Version | Status | Minimum Java | Servlet / Jakarta EE |
|---|---|---|---|
| 12.1 | Supported | 17 | Servlet 3.1 to 6.1 (EE8 to EE11) |
| 12.0 | Supported | 17 | Servlet 3.1 to 6.0 (EE8 to EE10) |
| 11, 10, 9.4 | End of life | 11 (9.4: 8) | 5.0, 4.0, 3.1 |

Community support for Jetty 10 and 11 ended on 1 January 2024. If you are on 9.x, 10 or 11, plan an upgrade to 12. Jetty 12 changed the core APIs (see below), so code written for older versions doesn't compile unchanged.

## How Jetty is put together

- **`Server`** owns the thread pool, the connectors and the root handler, and manages their lifecycle (`start()`/`stop()`).
- **Connectors** accept network connections. `ServerConnector` uses non-blocking NIO and is configured with a `ConnectionFactory` per protocol: HTTP/1.1, HTTP/2 (with or without TLS), and the PROXY protocol. HTTP/3 over QUIC uses a separate connector.
- **Handlers** process requests. In Jetty 12 the core `Handler` API no longer depends on the Servlet API. Handlers take a Jetty `Request`, `Response` and `Callback`, and can be chained or wrapped (`ContextHandler`, `ResourceHandler` for static files, `GzipHandler`, and so on).
- **Environments** add servlet support on top of the core: `ee8` (`javax.servlet`), and `ee9`, `ee10` and `ee11` (`jakarta.servlet`). One Jetty 12 server can host applications written against different EE versions side by side.
- **Modules** (standalone mode only) are how you switch on features such as `http`, `https`, `http2`, `ee11-deploy` or `websocket` without editing XML by hand.

## Embedding Jetty

Add the server artifact (12.1.15 is the latest release on Maven Central at the time of writing):

```xml
<dependency>
    <groupId>org.eclipse.jetty</groupId>
    <artifactId>jetty-server</artifactId>
    <version>12.1.15</version>
</dependency>
```

A server that answers every request with plain text, using the Jetty 12 core API:

```java
import org.eclipse.jetty.http.HttpHeader;
import org.eclipse.jetty.io.Content;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Response;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.util.Callback;

public class HelloJetty {
    public static void main(String[] args) throws Exception {
        Server server = new Server(8080);

        server.setHandler(new Handler.Abstract.NonBlocking() {
            @Override
            public boolean handle(Request request, Response response, Callback callback) {
                response.setStatus(200);
                response.getHeaders().put(HttpHeader.CONTENT_TYPE, "text/plain; charset=UTF-8");
                Content.Sink.write(response, true, "Hello from Jetty\n", callback);
                return true; // this handler took responsibility for the request
            }
        });

        server.start();
        server.join();
    }
}
```

Run it and `curl http://localhost:8080/` returns `Hello from Jetty`. Returning `true` from `handle` tells Jetty the request was handled, and the response is complete once the `callback` is completed. Here `Content.Sink.write` completes it after the body is written. Returning `false` lets Jetty send a 404.

To run servlets in embedded mode instead, add the servlet artifact for your EE version (for example `org.eclipse.jetty.ee10:jetty-ee10-servlet`) and use its `ServletContextHandler`.

Jetty logs through SLF4J. Without an SLF4J provider on the classpath you'll see a warning and no logs; add `org.eclipse.jetty:jetty-slf4j-impl` or your usual logging backend.

## Running Jetty standalone

Download and unpack the Jetty distribution (this is `$JETTY_HOME`). Then create a separate `$JETTY_BASE` directory for your configuration and apps, so upgrading Jetty never touches your files:

```bash
mkdir jetty-base
cd jetty-base
java -jar $JETTY_HOME/start.jar --add-modules=http,ee11-deploy
java -jar $JETTY_HOME/start.jar
```

Drop a WAR file into `jetty-base/webapps/` and Jetty deploys it. The `ee11-deploy` module is for Jakarta EE 11 (Servlet 6.1) applications; use `ee10-deploy`, `ee9-deploy` or `ee8-deploy` to match older ones.

## Gotchas

- **`javax` vs `jakarta`**: an app that imports `javax.servlet.*` needs the `ee8` environment. `jakarta.servlet.*` apps need `ee9` or later. Picking the wrong one fails at deploy time with class-not-found errors.
- **Old tutorials**: examples that extend `AbstractHandler` and receive an `HttpServletRequest` are for Jetty 9 to 11. In Jetty 12, use `Handler.Abstract` as above, or a servlet.
- **Reverse proxying**: the `jetty-proxy` artifact provides a `ProxyHandler` (and `ProxyServlet` variants for each EE environment) if you need Jetty to forward requests to another server. For a plain front-end proxy in front of several services, a dedicated proxy such as nginx or HAProxy is usually simpler.

## Further reading

- [Jetty documentation](https://jetty.org/docs/index.html)
- [Jetty 12.1 programming guide: HTTP server](https://jetty.org/docs/jetty/12.1/programming-guide/server/http.html)
- [Jetty downloads and version support](https://jetty.org/download.html)
