---
description: How Log4j 2 loggers, appenders and layouts fit together, with a minimal
  log4j2.xml, the Maven dependency, and logging from Java code.
imgSrc: /imgs/2023/945555918.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-17T08:06:29.000Z'
lastUpdated: 2026-11-14
tags:
  - java
title: "Log4j 2 basics: configuring loggers, appenders and layouts in Java"
---

Apache Log4j 2 is a logging library for Java maintained by the Apache Logging Services project. You call a logger from your code, and a configuration file decides which messages are kept, how they are formatted, and where they go. This post covers Log4j 2; Log4j 1.x reached end of life in 2015 and should not be used.

## Loggers, appenders and layouts

Log4j 2 has three main pieces:

- **Logger**: what your code calls. Loggers are named (usually after the class) and form a hierarchy by dot-separated name, so `com.example.db` inherits settings from `com.example` unless you override them. The root logger sits at the top.
- **Appender**: where a log event is written, for example the console, a file, a rolling file, or a socket. A logger can send events to several appenders.
- **Layout**: how an event is turned into text or bytes before an appender writes it. `PatternLayout` is the common one; `JsonTemplateLayout` is the recommended choice for structured JSON logs.

## Configuration

Log4j 2 reads its configuration from XML, JSON, YAML or properties files. On startup it looks for a file such as `log4j2.xml` on the classpath, so in a Maven or Gradle project put it in `src/main/resources`. If no configuration is found, Log4j falls back to a default that only prints `ERROR` and above to the console.

A minimal `log4j2.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
  <Appenders>
    <Console name="Console" target="SYSTEM_OUT">
      <PatternLayout pattern="%d{HH:mm:ss.SSS} [%t] %-5level %logger{36} - %msg%n"/>
    </Console>
  </Appenders>
  <Loggers>
    <Root level="info">
      <AppenderRef ref="Console"/>
    </Root>
  </Loggers>
</Configuration>
```

This defines one console appender with a `PatternLayout` and attaches it to the root logger at `info` level. `status="WARN"` controls Log4j's own internal logging, not your application's.

## Adding the dependency

With Maven:

```xml
<dependency>
  <groupId>org.apache.logging.log4j</groupId>
  <artifactId>log4j-core</artifactId>
  <version>2.26.1</version>
</dependency>
```

`log4j-core` pulls in `log4j-api` transitively. 2.26.1 was the latest 2.x release on Maven Central when this post was updated; the 3.0 line is still in beta.

:::caution
The original version of this post used Log4j 2.14.1, which is vulnerable to Log4Shell (CVE-2021-44228) and related CVEs. Use 2.17.1 or later, and preferably the current 2.x release.
:::

## Logging from Java

```java
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

public class MyApplication {

  private static final Logger LOGGER = LogManager.getLogger(MyApplication.class);

  public static void main(String[] args) {
    LOGGER.trace("This is a TRACE level message");
    LOGGER.debug("This is a DEBUG level message");
    LOGGER.info("This is an INFO level message");
    LOGGER.warn("This is a WARN level message");
    LOGGER.error("This is an ERROR level message");
    LOGGER.fatal("This is a FATAL level message");

    String user = "alice";
    LOGGER.info("User {} logged in", user);
  }
}
```

With the configuration above, only the `INFO`, `WARN`, `ERROR` and `FATAL` lines are printed, because the root logger is set to `info`. Change it to `level="trace"` to see everything.

## Gotchas

- Use `{}` placeholders (`LOGGER.info("User {} logged in", user)`) rather than string concatenation. The message is only formatted if the level is enabled.
- If your project also uses SLF4J or `java.util.logging`, add the matching bridge (`log4j-slf4j2-impl`, `log4j-jul`) so all logging goes through one configuration. Only one SLF4J binding should be on the classpath.
- Don't log untrusted input without thinking about what ends up in the log file. Log4Shell was triggered by attacker-controlled strings in log messages.

## Further reading

- [Log4j 2 manual](https://logging.apache.org/log4j/2.x/manual/index.html)
- [Configuration file reference](https://logging.apache.org/log4j/2.x/manual/configuration.html)
- [Log4j security page](https://logging.apache.org/security.html)
