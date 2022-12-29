---
title: Publishing a java package to github and jitpack
description: How I published a java package to github and jitpack
pubDate: Saturday, 9 June 2023 13:00:00 GMT
tags: ["solidity", "dapp"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/powell_ANGRY.png'
---

Despite using java throughout my academic career, I had completely forgotten how to deploy java packages.

Maven is a build automation tool for Java projects. It uses a standard directory layout and a declarative approach to specify the build requirements for a project.

A typical Maven project has the following directory structure:

```
├── src
│   ├── main
│   │   ├── java
│   │   └── resources
│   └── test
│       ├── java
│       └── resources
├── target
├── pom.xml
└── README.md
```
src/main/java: This directory contains the Java source code for the project.
src/main/resources: This directory contains resource files such as property files and configuration files that need to be included in the classpath of the project.
src/test/java: This directory contains the Java source code for the unit tests of the project.
src/test/resources: This directory contains resource files such as property files and configuration files that need to be included in the classpath of the unit tests.
target: This directory is created by Maven and is used to store the compiled class files and other build artifacts.

pom.xml: This is the main Maven configuration file for the project. It contains information about the project, its dependencies, and the build configuration.
README.md: This file provides an overview of the project and may contain additional documentation.
This is just a basic structure, and a Maven project can have additional directories and files based on the needs of the project.


Using chatgpt to convert the 13F parser I did in python, I noticed there was a lot of build errors I had to fix, and the imports were wrong.

```
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

It got the core imports, but failed to get the exceptions that were being used and the other imports.

I needed to add the package name to the file and make sure the file is called DocParser to reflect the public class name.

And make sure your package path is specified in pom.xml
```xml
<distributionManagement>
   <repository>
     <id>github</id>
     <name>GitHub FriendlyUser Apache Maven Packages</name>
     <url>https://maven.pkg.github.com/FriendlyUser/13F-java</url>
   </repository>
</distributionManagement>
```

I used the following code below to publish to github packages.

```
# publish maven project to github packages
name: Publish Package

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 18
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu' # See 'Supported distributions' for available options
          java-version: '17'
      - name: Build with Maven
        run: mvn -B package --file pom.xml
      - name: Publish package to GitHub Packages
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu' # See 'Supported distributions' for available options
          java-version: '17'
      - name: Publish to GitHub Packages Apache Maven
        run: mvn --batch-mode deploy
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This is a GitHub Actions workflow configuration file that defines a job with several steps. The job is triggered on push or pull request events to the main branch.

The first step uses the actions/checkout action to checkout the code repository. The second step sets up the Java Development Kit (JDK) version 18 using the actions/setup-java action. The third step uses the mvn command to build the Maven project by running the package goal.

The fourth step sets up the JDK again using the actions/setup-java action. The fifth step uses the mvn command to deploy the package to GitHub Packages using the deploy goal. The GITHUB_TOKEN environment variable is set to the value of the GITHUB_TOKEN secret, which is provided by GitHub to authenticate the action.

This workflow can be used to automate the process of building and publishing a Maven package to GitHub Packages whenever changes are pushed to the main branch or a pull request is opened or updated.


To publish a Maven package to Jitpack using JitCI, you can use the following steps:


1. Make sure that you have a Jitpack account and have set up a repository on Jitpack.

2. Add the Jitpack repository to your pom.xml file:
```
<repositories>
  <repository>
    <id>jitpack.io</id>
    <url>https://jitpack.io</url>
  </repository>
</repositories>
```

3. Add the JitCI Maven plugin to your pom.xml file:
```
  <repositories>
    <repository>
        <id>jitpack.io</id>
        <url>https://jitpack.io</url>
    </repository>
    </repositories>
```

4. Commit and push your changes to your code repository.

5. Go to the JitCI dashboard and enable JitCI for your repository.

6. JitCI will automatically build and publish your Maven package to Jitpack whenever you push changes to your repository.

## REferences 

For full code changes you can view them at

https://github.com/FriendlyUser/13F-java/blob/main/pom.xml
* https://github.com/FriendlyUser/13F-java/packages/1760367
* https://jitpack.io/#FriendlyUser/13F-java