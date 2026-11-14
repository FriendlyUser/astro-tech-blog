---
description: "What Apache Tomcat is, how Catalina, Coyote and Jasper fit together, which config file does what, and how to deploy a Jakarta servlet on Tomcat 11."
imgSrc: /imgs/2023/522267727.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-10-30T23:17:25.000Z'
lastUpdated: 2026-11-14
tags:
  - java
title: "Apache Tomcat: architecture, configuration and a first servlet"
---

Apache Tomcat is an open-source implementation of the Jakarta Servlet, Pages (JSP), Expression Language and WebSocket specifications. It runs Java web applications packaged as WAR files and can serve HTTP directly. It is not a full Jakarta EE application server: there is no EJB or JMS out of the box, so applications bring those libraries themselves or use a framework such as Spring.

## Which version

Each Tomcat major version implements a specific set of specs. The supported lines, from the [version table](https://tomcat.apache.org/whichversion.html):

| Tomcat | Servlet | JSP | Min Java | Namespace |
|---|---|---|---|---|
| 11.0.x | 6.1 | 4.0 | 17 | `jakarta.*` |
| 10.1.x | 6.0 | 3.1 | 11 | `jakarta.*` |
| 9.0.x | 4.0 | 2.3 | 8 | `javax.*` |

The big break is between 9 and 10: Jakarta EE 9 renamed every `javax.servlet` package to `jakarta.servlet`. An application built for Tomcat 9 will not deploy on 10.1 or 11 without changes. The [Tomcat migration tool for Jakarta EE](https://tomcat.apache.org/download-migration.cgi) can rewrite an existing WAR. Tomcat 8.5 and earlier are end of life.

## Architecture

- **Catalina** is the servlet container. It manages the object hierarchy configured in `server.xml`: a `Server` holds `Service`s; each `Service` has one or more `Connector`s and one `Engine`; the `Engine` holds `Host`s (virtual hosts), and each `Host` holds `Context`s (one per web application).
- **Coyote** is the connector layer. It accepts connections, parses HTTP/1.1 (with HTTP/2 available through an upgrade protocol) or AJP, and hands requests to Catalina. WebSocket connections start as an HTTP upgrade on the same connector.
- **Jasper** is the JSP engine. It translates JSP pages into Java servlet source, compiles them, and recompiles when a JSP changes (in development mode).
- **Clustering** replicates HTTP sessions between Tomcat nodes. `DeltaManager` copies every session to every node; `BackupManager` copies each session to one backup node. Tomcat does not balance load itself: you put a load balancer (Apache httpd with `mod_proxy_balancer` or `mod_jk`, nginx, or a cloud load balancer) in front.

## Configuration files

All live in `$CATALINA_BASE/conf`:

- **`server.xml`**: the container structure above, including connectors (ports, TLS, protocol) and hosts.
- **`web.xml`**: the default deployment descriptor applied to every web application before the application's own `WEB-INF/web.xml`. It defines the default servlet for static files and the JSP servlet.
- **`context.xml`**: the default `Context` settings shared by every application. Per-application settings go in the app's `META-INF/context.xml` or in `conf/Catalina/<host>/<app>.xml`.
- **`tomcat-users.xml`**: users and roles for the default `UserDatabaseRealm`, used by the Manager app. Don't use it for production authentication.

## Deploy a servlet

A minimal servlet for Tomcat 10.1 or 11. Compile against the servlet API with `provided` scope, because Tomcat supplies it at runtime:

```xml
<dependency>
    <groupId>jakarta.servlet</groupId>
    <artifactId>jakarta.servlet-api</artifactId>
    <version>6.1.0</version>
    <scope>provided</scope>
</dependency>
```

Use `6.0.0` instead if you deploy to Tomcat 10.1.

```java
package com.example;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain;charset=UTF-8");
        resp.getWriter().println("Hello from Tomcat");
    }
}
```

Build a WAR (with Maven, `<packaging>war</packaging>`), name it `demo.war`, and copy it into `$CATALINA_BASE/webapps`. With the default `autoDeploy="true"` on the `Host`, Tomcat unpacks it and the servlet answers at `http://localhost:8080/demo/hello`.

## A JNDI data source

Tomcat can manage a database connection pool and expose it through JNDI, so the application doesn't hold credentials or pool settings. In the app's `META-INF/context.xml`:

```xml
<Context>
    <Resource name="jdbc/AppDB"
              auth="Container"
              type="javax.sql.DataSource"
              driverClassName="org.postgresql.Driver"
              url="jdbc:postgresql://localhost:5432/app"
              username="app"
              password="change-me"
              maxTotal="20"
              maxIdle="5"
              maxWaitMillis="10000"/>
</Context>
```

The JDBC driver JAR goes in `$CATALINA_BASE/lib`, not in the WAR. The default factory is Tomcat's repackaged Commons DBCP 2. Look the pool up with `new InitialContext().lookup("java:comp/env/jdbc/AppDB")`, or inject it with `@Resource(name = "jdbc/AppDB")`. Note that `javax.sql.DataSource` keeps its `javax` name: it is part of the JDK, not Jakarta EE.

## Production notes

- Remove the sample apps (`docs`, `examples`) from `webapps`, and the `manager` and `host-manager` apps too if you don't use them.
- Run Tomcat as an unprivileged user and keep it on a supported minor release; security fixes ship in regular point releases.
- The AJP connector is disabled in the default `server.xml`. If you enable it, set a `secret`, because AJP trusts whatever the front-end proxy sends.
- If you are building a Spring Boot application, you usually don't install Tomcat at all: Boot embeds it and runs it from a JAR.

## Further reading

- [Tomcat 11 documentation](https://tomcat.apache.org/tomcat-11.0-doc/index.html)
- [Which version do I want?](https://tomcat.apache.org/whichversion.html)
- [Security considerations](https://tomcat.apache.org/tomcat-11.0-doc/security-howto.html)
