---
title: Publishing a Java Maven package to GitHub Packages and JitPack
description: How I published a small Java library to GitHub Packages with a GitHub Actions workflow, and made it available through JitPack.
pubDate: Saturday, 9 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["solidity", "dapp", "java", "maven", "github actions"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/powell_ANGRY.png'
---

Despite using Java throughout my academic career, I had completely forgotten how to publish a Java package. These are my notes from publishing [13F-java](https://github.com/FriendlyUser/13F-java), a port of my Python 13F parser, to GitHub Packages and JitPack.

## Maven project layout

Maven expects a standard directory layout, with the build described in `pom.xml`:

```text
├── src
│   ├── main
│   │   ├── java        # library source code
│   │   └── resources   # files copied onto the classpath
│   └── test
│       ├── java        # unit tests
│       └── resources   # test-only classpath files
├── target              # build output, created by Maven
├── pom.xml             # project info, dependencies, build config
└── README.md
```

## Fixing the ChatGPT-converted code

I used ChatGPT to convert the 13F parser from Python to Java, and the result had a lot of build errors to fix. The imports were incomplete:

```java
package com.grandfleet.docparser;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
```

It got the core imports but missed the exceptions the code used. The XML parsing API throws checked exceptions, so you need imports such as `javax.xml.parsers.ParserConfigurationException`, `org.xml.sax.SAXException` and `java.io.IOException`.

I also had to add the `package` declaration and make sure the file was named `DocParser.java` to match the public class name.

## Publishing to GitHub Packages

First, point `distributionManagement` in `pom.xml` at the repository's GitHub Packages URL. The `id` must be `github`, because that's the server id `actions/setup-java` writes credentials for:

```xml
<distributionManagement>
  <repository>
    <id>github</id>
    <name>GitHub FriendlyUser Apache Maven Packages</name>
    <url>https://maven.pkg.github.com/FriendlyUser/13F-java</url>
  </repository>
</distributionManagement>
```

Then a GitHub Actions workflow runs `mvn deploy`. This is a cleaned-up version of the workflow I used:

```yaml
name: Publish Package

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v7
      - name: Set up JDK 17
        uses: actions/setup-java@v6
        with:
          distribution: 'zulu'
          java-version: '17'
      - name: Publish to GitHub Packages
        run: mvn --batch-mode deploy
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Things I got wrong the first time:

- **Trigger.** My original workflow ran on every push and pull request to `main`. Pull requests shouldn't publish anything, and GitHub Packages rejects a second upload of the same non-`SNAPSHOT` version, so deploying on every push fails once the version exists. Publishing when a release is created, after bumping `<version>` in `pom.xml`, avoids both problems.
- **A duplicate `setup-java` step.** I had a second "Publish package" step that just ran `setup-java` again. One setup step is enough.
- **Permissions.** `GITHUB_TOKEN` needs `packages: write` to publish. Set it in the workflow rather than relying on the repository's default token permissions.
- `mvn deploy` already runs the `package` phase (and the tests), so a separate `mvn package` step isn't needed.

`setup-java` generates a Maven `settings.xml` with a `github` server entry that reads the username from `GITHUB_ACTOR` and the password from `GITHUB_TOKEN`, which is why the deploy step only needs the `GITHUB_TOKEN` environment variable.

One downside of GitHub Packages: consumers need to authenticate with a personal access token even to download a public package. That's the main reason to also offer the library through JitPack.

## Making it available on JitPack

JitPack doesn't need anything in the library's own `pom.xml`, and there's nothing to upload. It builds a public GitHub repository on demand: the first time someone requests a version (a release tag, a commit hash, or `main-SNAPSHOT`), JitPack checks out that commit, runs `mvn install -DskipTests`, and serves the resulting jars.

To make that work:

1. Make sure `mvn install` succeeds on a clean checkout.
2. JitPack builds with Java 8 by default. If your project needs a newer JDK, add a `jitpack.yml` to the repository root:

    ```yaml
    jdk:
      - openjdk17
    ```

3. Create a GitHub release (for example `v1.0.0`), then look the repository up on [jitpack.io](https://jitpack.io) to trigger and check the build.

Consumers then add the JitPack repository and the dependency to *their* `pom.xml`. The groupId is `com.github.<GitHub user>` and the artifactId is the repository name:

```xml
<repositories>
  <repository>
    <id>jitpack.io</id>
    <url>https://jitpack.io</url>
  </repository>
</repositories>

<dependencies>
  <dependency>
    <groupId>com.github.FriendlyUser</groupId>
    <artifactId>13F-java</artifactId>
    <version>v1.0.0</version>
  </dependency>
</dependencies>
```

Replace `v1.0.0` with the release tag you actually published.

## References

- My `pom.xml`: <https://github.com/FriendlyUser/13F-java/blob/main/pom.xml>
- The GitHub package: <https://github.com/FriendlyUser/13F-java/packages/1760367>
- JitPack page: <https://jitpack.io/#FriendlyUser/13F-java>
- [GitHub docs: Publishing Java packages with Maven](https://docs.github.com/en/actions/tutorials/publish-packages/publish-java-packages-with-maven)
- [JitPack docs: Building](https://docs.jitpack.io/building/)
