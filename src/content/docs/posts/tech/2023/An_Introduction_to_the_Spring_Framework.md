---
description: 'What the Spring Framework does: the IoC container and dependency injection, its main modules, a runnable example, and how Spring Boot fits in.'
imgSrc: /imgs/2023/2679960937.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-05T04:26:36.000Z'
lastUpdated: 2026-11-14
tags: ["java"]
title: 'Spring Framework basics: dependency injection, modules and Spring Boot'
---

The Spring Framework is an open-source application framework for Java. At its core is a container that creates your objects and wires their dependencies together (inversion of control, or dependency injection). Around that sit modules for database access, transactions, web applications and testing. Most Spring applications today are started with Spring Boot, which configures the framework for you.

Spring grew out of code in Rod Johnson's 2002 book *Expert One-on-One J2EE Design and Development*, and 1.0 shipped in March 2004. It's maintained by the Spring team, now part of Broadcom. As of November 2026 the current release is Spring Framework 7.0 (7.1 is in release candidates), which needs Java 17 or newer and targets Jakarta EE 11. Spring Boot 4.x is built on it.

## Dependency injection in one example

Without a container, a class creates its own collaborators:

```java
public class Greeter {
    private final MessageService messages = new EnglishMessageService();
}
```

That hard-codes the implementation, so you can't swap it in a test or in another environment. With dependency injection, `Greeter` asks for a `MessageService` in its constructor and Spring decides which one to pass.

Here's a complete program using only the `spring-context` module (Maven coordinates `org.springframework:spring-context:7.0.10`). Each class goes in its own file in the `com.example` package:

```java
package com.example;

public interface MessageService {
    String message(String name);
}
```

```java
package com.example;

import org.springframework.stereotype.Service;

@Service
public class EnglishMessageService implements MessageService {
    @Override
    public String message(String name) {
        return "Hello, " + name + "!";
    }
}
```

```java
package com.example;

import org.springframework.stereotype.Component;

@Component
public class Greeter {
    private final MessageService messages;

    public Greeter(MessageService messages) {
        this.messages = messages;
    }

    public void greet(String name) {
        System.out.println(messages.message(name));
    }
}
```

```java
package com.example;

import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan
public class App {
    public static void main(String[] args) {
        try (var context = new AnnotationConfigApplicationContext(App.class)) {
            context.getBean(Greeter.class).greet("Spring"); // Hello, Spring!
        }
    }
}
```

What happens when this runs:

1. `AnnotationConfigApplicationContext` reads the `App` configuration class. `@ComponentScan` with no arguments scans `App`'s package (`com.example`) and its sub-packages.
2. It finds `@Service` and `@Component` classes and registers them as beans. By default each bean is a singleton within the context.
3. To create `Greeter`, it sees the constructor needs a `MessageService`, finds the one bean that implements it, and passes it in. A class with a single constructor doesn't need `@Autowired`.
4. Closing the context (here, via try-with-resources) runs any shutdown callbacks on the beans.

If two beans implemented `MessageService`, startup would fail with a `NoUniqueBeanDefinitionException` until you marked one `@Primary` or picked one with `@Qualifier`.

The payoff is in testing. `Greeter` is a plain class, so a unit test needs no Spring at all:

```java
Greeter greeter = new Greeter(name -> "Hi " + name);
```

## The main modules

The framework is split into modules (separate JARs), so you only depend on what you use:

- **Core container** (`spring-core`, `spring-beans`, `spring-context`, `spring-expression`): the IoC container, `ApplicationContext`, application events, resource loading and the Spring Expression Language.
- **AOP** (`spring-aop`): proxies that wrap beans to add behaviour such as transactions, caching or security checks without changing the bean's code. This is how `@Transactional` and `@Cacheable` work.
- **Data access** (`spring-jdbc`, `spring-tx`, `spring-orm`, `spring-r2dbc`): `JdbcClient` and `JdbcTemplate` for SQL without the JDBC boilerplate, declarative transactions with `@Transactional`, and integration with JPA and Hibernate.
- **Web** (`spring-web`, `spring-webmvc`, `spring-webflux`): Spring MVC for servlet-based web apps and REST APIs (`@RestController`), and Spring WebFlux for non-blocking, reactive ones. `spring-web` also includes the HTTP clients: `RestClient` (synchronous, added in 6.1), `WebClient` (reactive), and declarative HTTP interface clients. The Spring team has announced plans to deprecate the older `RestTemplate`.
- **Testing** (`spring-test`): loads an application context in JUnit tests, plus `MockMvc` for testing controllers without starting a server.

Some things often described as "part of Spring" are separate projects with their own release cycles: Spring Boot, Spring Security, Spring Data, Spring Batch and Spring Cloud.

## Where Spring Boot fits

Spring Framework on its own leaves you to choose and configure a web server, JSON library, connection pool, logging and so on. Spring Boot does that for you:

- **Starters** such as `spring-boot-starter-web` pull in a tested set of dependencies.
- **Auto-configuration** creates beans based on what's on the classpath. Add a JDBC driver and you get a `DataSource`.
- **An embedded server** (Tomcat by default) means the app runs as `java -jar app.jar`.
- **Externalized configuration** through `application.properties`/`application.yml` and environment variables.

For a new application, start at [start.spring.io](https://start.spring.io), pick the starters you need, and build from the generated project. Use plain Spring Framework without Boot when you're embedding Spring in an existing application or writing a library.

## When Spring is a poor fit

- **Small scripts and CLIs.** Startup time and dependency size are hard to justify for a tool that runs for a second.
- **Fast startup or low memory.** Spring Boot apps typically take a second or more to start on the JVM. Spring supports GraalVM native images to fix this, at the cost of longer builds and limits on reflection. Quarkus and Micronaut were designed for this case from the start.
- **When you want explicit wiring.** Annotation scanning and auto-configuration can make it hard to see where a bean came from. Running a Spring Boot app with `--debug` prints the auto-configuration report, which helps.

## Further reading

- [Spring Framework reference documentation](https://docs.spring.io/spring-framework/reference/), especially the "Core Technologies" chapter on the IoC container
- [Spring Boot](https://spring.io/projects/spring-boot)
- [Spring guides](https://spring.io/guides), short task-focused tutorials
