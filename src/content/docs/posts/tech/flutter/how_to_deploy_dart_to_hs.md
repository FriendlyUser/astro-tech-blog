---
tags: ["dart", "flutter", "huggingspace", "docker"]
title: How I deployed a Dart Alfred server to a Hugging Face Docker Space
description: Compiling a Dart Alfred HTTP server to a native executable and running it on a Hugging Face Docker Space with a multi-stage Dockerfile.
pubDate: Mon, 13 November 2023
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/656417929.webp'
layout: '@/templates/BasePost.astro'
---

Hugging Face Spaces can run any Docker image, not only Gradio and Streamlit apps, which makes them
a free place to host a small HTTP server. I used one to host a Dart server built with
[Alfred](https://pub.dev/packages/alfred), a small Express-style web framework.

Dart suits this well because `dart compile exe` produces a self-contained native executable. The
Dart runtime is bundled into the binary, so the final image doesn't need the Dart SDK, and an
ahead-of-time compiled binary starts much faster than running the source on the VM.

## The server

```dart
import 'dart:io';

import 'package:alfred/alfred.dart';

void main(List<String> arguments) async {
  // Hugging Face routes traffic to port 7860 unless the Space sets app_port.
  var port = 7860;
  if (arguments.isNotEmpty) {
    port = int.tryParse(arguments.first) ?? port;
  }

  final app = Alfred();

  app.get('/', (req, res) => {'json_response': true});
  app.get('/text', (req, res) => 'Text response');

  app.get('/json', (req, res) => {'json_response': true});

  app.get('/jsonExpressStyle', (req, res) {
    res.json({'type': 'traditional_json_response'});
  });

  app.get('/html', (req, res) {
    res.headers.contentType = ContentType.html;
    return '<html><body><h1>Test HTML</h1></body></html>';
  });

  app.post('/post-route', (req, res) async {
    final body = await req.body; // parsed JSON body
    return {'received': body};
  });

  await app.listen(port);
}
```

Alfred turns whatever a handler returns into the response: a `String` becomes text, a `Map` or
`List` becomes JSON. A handler that returns `null` without closing the response falls through to
the next route, so the `/post-route` handler has to return something or the client gets a 404.

The port defaults to 7860, the port Hugging Face sends traffic to, and can be overridden with the
first command-line argument. `app.listen` binds to `0.0.0.0` by default, which is what you want
inside a container.

The full server in the Space also has routes that search Open Food Facts and scrape top Steam
sellers; I've left those out here.

## The Dockerfile

A multi-stage build compiles the server in the full Dart SDK image, then copies only the
executable into a small runtime image:

```dockerfile
FROM dart:2.19.1 AS builder
WORKDIR /app
COPY pubspec.yaml pubspec.lock ./
RUN dart pub get
COPY . .
RUN dart compile exe bin/dart_off_server.dart -o /app/dart_off_server

# Copy the compiled server into a small image to run it
FROM ubuntu:latest
WORKDIR /app
COPY --from=builder /app/dart_off_server /app/dart_off_server
CMD ["/app/dart_off_server"]
```

Copying `pubspec.yaml` and `pubspec.lock` before the rest of the source means Docker can reuse the
cached `dart pub get` layer when only the code changes.

The project was written against Dart 2.19 (its `pubspec.yaml` has `sdk: '>=2.17.5 <3.0.0'`), so the
image is pinned to `dart:2.19.1`. For a new project, use `dart:stable` and a Dart 3 SDK constraint.

The runtime image only contains the binary. Anything the server reads from disk at runtime, such as
static files, has to be copied in as well.

## Why Ubuntu and not scratch

Ideally I would have used `scratch` or something equally small, but I couldn't get that to work on
Hugging Face. Ubuntu is about 30 MB compressed, so it's not too bad.

A likely reason: `dart compile exe` output is dynamically linked against the system C library, so
it can't run in an empty image on its own. The official
[`dart` image](https://hub.docker.com/_/dart) ships the files those binaries need under `/runtime/`,
and its README shows a `FROM scratch` stage that starts with `COPY --from=build /runtime/ /` before
copying the executable. That's worth trying if image size matters.

## Space configuration

A Docker Space needs `sdk: docker` in the YAML block at the top of its `README.md`. To use a port
other than 7860, set `app_port`:

```yaml
---
title: Dart Off Server
sdk: docker
app_port: 7860
---
```

Spaces run the container as user ID 1000. This server doesn't write to disk, so that didn't matter
here, but a server that does will need a user and writable directory set up in the Dockerfile (see
the [Docker Spaces docs](https://huggingface.co/docs/hub/spaces-sdks-docker#permissions)).

## References

As of this update the Space reports a build error, so the live URL may not respond. The code is
still in the repository.

* https://friendlyuser-dart-off-server.hf.space/
* https://huggingface.co/spaces/FriendlyUser/dart_off_server/tree/main
