---
description: What Apache Maven does, the standard project layout, how the build lifecycle and dependencies work, and how to generate, build and run a project from the command line.
imgSrc: /imgs/2023/326029388.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-08T00:40:27.000Z'
lastUpdated: 2026-11-14
tags: ["java", "maven"]
title: 'Getting started with Apache Maven: project layout, lifecycle and dependencies'
---

Apache Maven is a build tool for Java projects. You describe the project in a `pom.xml` file (the Project Object Model): its coordinates, its dependencies, and any plugins. Maven downloads the dependencies, compiles the code, runs the tests and packages the result. It works by convention: if your files are where Maven expects them, the `pom.xml` stays short.

## The standard layout

```text
my-app
├── pom.xml
└── src
    ├── main
    │   ├── java
    │   │   └── com/mycompany/App.java
    │   └── resources
    └── test
        ├── java
        │   └── com/mycompany/AppTest.java
        └── resources
```

`src/main/java` holds application code and `src/main/resources` holds files copied onto the classpath, such as configuration. `src/test/java` and `src/test/resources` are the test equivalents. They are compiled separately and never end up in the packaged JAR. Build output goes to `target/`.

## Coordinates and dependencies

Every Maven artifact is identified by `groupId`, `artifactId` and `version`. You use the same three values to declare a dependency:

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
        <version>3.22.0</version>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>6.1.3</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

Maven downloads dependencies from Maven Central (or a repository you configure, such as a company Nexus or Artifactory) into `~/.m2/repository`, along with their own dependencies. The `scope` decides where a dependency is available. `compile` (the default) is on every classpath, `test` only when compiling and running tests, and `provided` at compile time but not packaged, for things the runtime supplies.

When two libraries pull in different versions of the same dependency, Maven picks the one "nearest" to your project in the dependency tree, not the newest. `mvn dependency:tree` shows what was chosen and why.

## The build lifecycle

Maven's default lifecycle is a fixed sequence of phases. The ones you'll use most are:

1. `validate`
2. `compile`
3. `test`
4. `package`
5. `verify`
6. `install` (copy the artifact into your local `~/.m2` repository)
7. `deploy` (upload it to a remote repository)

Running a phase runs every phase before it, so `mvn package` also compiles and tests. The work in each phase is done by plugin goals bound to it. For a JAR project, `maven-compiler-plugin` runs in `compile`, `maven-surefire-plugin` in `test` and `maven-jar-plugin` in `package`. `mvn clean` belongs to a separate lifecycle and deletes `target/`.

## Create, build and run a project

Install a JDK and Maven. Maven 3.10.0 is the current release and needs JDK 8 or newer to run. Maven 4 is still in release candidates and not recommended for production yet. Then generate a project from the quickstart archetype:

```bash
mvn archetype:generate \
  -DgroupId=com.mycompany \
  -DartifactId=my-app \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DarchetypeVersion=1.5 \
  -DinteractiveMode=false
```

This creates a `my-app` directory with a `pom.xml`, a `com.mycompany.App` class that prints "Hello World!", and a JUnit 5 test (archetype 1.5 defaults to JUnit 5.11.0). It also targets Java 17 by default. Pass `-DjavaCompilerVersion=21` to change it. Without `-DarchetypeVersion`, you may get an old version of the archetype.

Build it:

```bash
cd my-app
mvn package
```

This compiles the code, runs the tests and writes `target/my-app-1.0-SNAPSHOT.jar`. Run the class:

```bash
java -cp target/my-app-1.0-SNAPSHOT.jar com.mycompany.App
```

The JAR has no `Main-Class` in its manifest, so `java -jar` won't work without configuring `maven-jar-plugin`. It also doesn't include dependencies. To build a runnable "fat" JAR, use `maven-shade-plugin` or `maven-assembly-plugin`.

## Gotchas

- **Pin plugin versions.** If the `pom.xml` doesn't set a plugin version, Maven uses a default from its own super POM, which changes between Maven releases. The quickstart archetype pins them in `<pluginManagement>`, so keep that section.
- **Commit the Maven Wrapper.** Running `mvn wrapper:wrapper` adds `mvnw` scripts that download a fixed Maven version, so everyone (and CI) builds with the same one.
- **`SNAPSHOT` means "may change".** A `-SNAPSHOT` dependency can resolve to a different build tomorrow. Release builds shouldn't depend on snapshots.

## Further reading

- [Maven in 5 minutes](https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html)
- [Introduction to the build lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)
- [Introduction to the dependency mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)
