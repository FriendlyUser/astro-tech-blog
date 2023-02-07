---
tags: ['dart', 'docker']
title: How I deployed a dart alfred server to hugging space
description: This blog post covers how to deploy a dart space to hugging space using docker spaces.
pubDate: Mon, 13 November 2023
imgSrc: '/imgs/2023/656417929.png'
layout: '@/templates/BasePost.astro'
---
Docker is useful for deployments because it provides a consistent and reproducible environment for applications to run in, regardless of the host operating system. This makes it easier to deploy, test, and run applications in a variety of environments, from local development machines to production servers. Docker containers encapsulate an application and its dependencies, allowing for easy and reliable deployment, as well as efficient resource utilization. Additionally, Docker images can be stored in a central repository, making it easier to share and distribute applications.


Dart is a programming language developed by Google and it allows compiling Dart code into a single binary executable. This is achieved using the Dart SDK and the "dart2native" command-line tool, which compiles Dart code into machine code for a specific platform. The resulting binary is standalone and does not require a Dart runtime or interpreter to be installed on the target system. This makes it easy to distribute the application and eliminates the need for users to install any additional dependencies. Additionally, compiling to a single binary can result in faster startup times and improved performance compared to running the application in a Dart runtime.


```dart 
 import 'package:dart_off_server/core.dart' as cli;
import 'package:alfred/alfred.dart';
import 'dart:io';

void main(List<String> arguments) async  {
  // get port from arguments
  var port = 7860;
  if (arguments.isEmpty) {
    print('Please provide a port number');
  } else {
    port = int.tryParse(arguments.first) ?? 6565;
  }
  final app = Alfred();

  // print line
  // print('Starting up server: on port $port');

  app.get('/', (req, res) => {'json_response': true});
  app.get('/text', (req, res) => 'Text response');

  app.get('/json', (req, res) => {'json_response': true});

  app.get('/jsonExpressStyle', (req, res) {
    res.json({'type': 'traditional_json_response'});
  });

  app.get('/file', (req, res) => File('test/files/image.jpg'));

  app.get('/html', (req, res) {
    res.headers.contentType = ContentType.html;
    return '<html><body><h1>Test HTML</h1></body></html>';
  });
   app.post('/post-route', (req, res) async {
    final body = await req.body; //JSON body
    body != null; //true
  });

  await app.listen(port); //Listening on port 6565
}
 
 ```

This code is a Dart program that sets up an HTTP server using the "alfred" package. The server listens on a specified port and provides several routes for handling HTTP requests. The routes include handling GET requests for JSON and HTML responses, serving a file, and handling a POST request. The port number is specified as the first argument when running the program, and if no argument is provided, the default port number is 6565. If an invalid argument is provided, the port number will be set to 6565. The code uses the Dart "async" keyword to indicate that the "listen" function is asynchronous and can run concurrently with other parts of the code.


Docker multi-stage builds are a feature in Docker that allow optimizing the size of the final Docker image by only including the necessary components and dependencies for production. Multi-stage builds involve using multiple "FROM" statements in the Dockerfile to create multiple intermediate images, each of which can be used as a temporary build environment.

For example, you can use one stage to build your application and its dependencies, and then use another stage to copy only the necessary files (e.g. the compiled binary) into a smaller, minimal base image, such as a runtime-only image. This reduces the size of the final image and minimizes the attack surface by eliminating unnecessary components.

Here's an example of a multi-stage build in a Dockerfile:


```dockerfile
bash`# Build stage
FROM dart AS build
WORKDIR /app
COPY . .
RUN pub get && dart2native main.dart -o myapp

# Production stage
FROM alpine
WORKDIR /app
COPY --from=build /app/myapp /app
CMD ["./myapp"]
```

In this example, the first stage uses the `dart` image as the build environment and compiles the Dart code into a standalone binary. The second stage uses the `alpine` image as a minimal base image and copies only the compiled binary from the build stage into the final image. The final image only includes the necessary components to run the application, resulting in a smaller and more secure image.


```dockerfile 
 FROM dart:2.19.1 as builder
WORKDIR /app
COPY pubspec.yaml pubspec.lock ./
RUN dart pub get 
COPY . .
RUN dart compile exe bin/cli.dart -o /app/dart_off_server

# copy server file to basic image to run the app
FROM ubuntu:latest
WORKDIR /app
# RUN apk add --no-cache bash
COPY --from=builder /app/dart_off_server /app/dart_off_server
RUN ls -la
RUN pwd
CMD ["/app/dart_off_server"]
 
 ```

This Dockerfile creates two Docker images: a build environment image and a final image.

The first stage uses the `dart:2.19.1` image as the base for the build environment and sets the working directory to `/app`. It then copies the `pubspec.yaml` and `pubspec.lock` files and runs `dart pub get` to install the dependencies. It then copies the rest of the application files and compiles the Dart code into an executable binary using the `dart compile exe` command. The resulting binary is saved as `dart_off_server` in the `/app` directory.

The second stage uses the `ubuntu:latest` image as the base for the final image and sets the working directory to `/app`. It then copies the `dart_off_server` binary from the build environment using the `COPY --from=builder` command. The final image only includes the necessary components to run the application, resulting in a smaller and more secure image.

The final step in the Dockerfile sets the command to run the application by executing the `dart_off_server` binary.


Ideally I would be able to use scratch of equivalent, but that didnt seem to work for hugging space, possibly for security reasons or image verification. Luckily ubuntu is about 30 MB so it is not too bad.
Dart is a modern, open-source, general-purpose programming language used for both front-end and back-end development. The advantages of using Dart for back-end development include:

1. Strong Typing: Dart has a strong type system, making it easier to write reliable code and catch bugs early in the development process.
2. Speed: Dart compiles to machine code, making it faster than some other interpreted languages. This can result in improved performance for back-end applications.
3. Scalability: Dart is designed for scalability, with features like isolate-based concurrency, making it well-suited for large-scale server-side applications.
4. Interoperability: Dart can interface with other technologies and platforms, such as C++ and JavaScript, making it possible to integrate with existing systems and technologies.
5. Ecosystem: Dart has a growing ecosystem of packages and tools, making it easier to find solutions to common back-end development problems.
6. Easy to Learn: Dart is a relatively new language and has a simple, straightforward syntax that makes it easy for developers to learn and start using it quickly.
7. Improved Developer Productivity: With its strong typing and other features, Dart can help developers write code faster and with fewer bugs, resulting in improved productivity and time-to-market for back-end applications.

## References

To view the code base

* https://friendlyuser-dart-off-server.hf.space/
* https://huggingface.co/spaces/FriendlyUser/dart_off_server/tree/main