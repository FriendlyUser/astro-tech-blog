---
tags: ['dart', 'appwrite']
title: "Dart functions on Appwrite: base64 encode, HTTPS check and email slicer"
description: Three small Dart functions (base64 encoder, HTTPS URL check, email slicer) and how to run them as Appwrite Functions with the current context API.
pubDate: Fri, 29 November 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/248665811.webp
---

:::caution
The functions in the [dart_fns repo](https://github.com/FriendlyUser/dart_fns) use Appwrite's old
`start(req, res)` entrypoint with `req.payload` and `req.variables`. Appwrite 1.4 replaced it with a
single `context` argument (`context.req`, `context.res`, `context.log`). The examples below use the
current syntax.
:::

[Appwrite](https://appwrite.io/) is an open-source backend-as-a-service: auth, databases, storage and
serverless functions, either self-hosted or on Appwrite Cloud. Its Functions product runs your code
in a managed runtime and gives each function an HTTP endpoint, so you don't have to run a server for
small utilities like the ones below.

## The functions

These are plain Dart and run anywhere. Each one became its own Appwrite function in the repo.

### Base64 encode

```dart
import 'dart:convert';

String encode(String input) => base64Encode(utf8.encode(input));
```

`utf8.encode` turns the string into bytes and `base64Encode` turns those bytes into a base64 string.
Both live in `dart:convert`.

### Check for an HTTPS URL

```dart
bool isHttpsUrl(String url) {
  final uri = Uri.tryParse(url);
  return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty;
}
```

`Uri.tryParse` returns `null` instead of throwing on malformed input. Checking `host` matters because
`https:` on its own parses fine but isn't a usable URL. This only checks the format; it doesn't
check that the host exists or that its certificate is valid.

### Email slicer

```dart
Map<String, String> sliceEmail(String email) {
  final parts = email.split('@');
  if (parts.length != 2 || parts[0].isEmpty || parts[1].isEmpty) {
    throw FormatException('Invalid email format', email);
  }
  return {'username': parts[0], 'domain': parts[1]};
}

void main() {
  print(sliceEmail('example.user@example.com'));
  // {username: example.user, domain: example.com}
}
```

This splits on `@` and rejects anything without exactly one. It isn't a full email validator:
quoted local parts such as `"a@b"@example.com` are valid addresses that this rejects.

## Running one as an Appwrite function

An Appwrite Dart function is a package whose entrypoint (`lib/main.dart` in the starter template)
exports `main(context)`. The handler reads the request from `context.req` and must return one of the
`context.res` helpers (`text`, `json`, `binary`, `redirect`, `empty`). Here is the encoder:

```dart
import 'dart:convert';

Future<dynamic> main(final context) async {
  final input = context.req.bodyText as String;
  if (input.isEmpty) {
    return context.res.json({'error': 'Send the text to encode as the request body.'}, 400);
  }

  context.log('Encoding ${input.length} characters');
  return context.res.json({
    'originalPayload': input,
    'encodedPayload': base64Encode(utf8.encode(input)),
  });
}
```

`context.req` also has `bodyJson`, `headers`, `query`, `path` and `method`. Use `context.log` and
`context.error` instead of `print`; their output shows up in the execution logs in the Appwrite
Console. `res.send` still exists but is deprecated in favour of `res.text`.

These functions don't call any Appwrite APIs, so they don't need the SDK. If yours does, add
`dart_appwrite` (`dart pub add dart_appwrite`) and build the client from the values the runtime
provides:

```dart
import 'dart:io';
import 'package:dart_appwrite/dart_appwrite.dart';

Future<dynamic> main(final context) async {
  final client = Client()
      .setEndpoint(Platform.environment['APPWRITE_FUNCTION_API_ENDPOINT'] ?? '')
      .setProject(Platform.environment['APPWRITE_FUNCTION_PROJECT_ID'] ?? '')
      .setKey(context.req.headers['x-appwrite-key'] ?? '');
  final users = Users(client);

  final result = await users.list();
  return context.res.json({'totalUsers': result.total});
}
```

The `x-appwrite-key` header carries a short-lived API key that Appwrite issues for the execution,
scoped to the permissions you grant the function, so you don't need to paste a long-lived key into
your code or variables.

## Deploying

With the [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation):

```bash
appwrite init functions   # pick the Dart runtime; generates a starter function
# replace lib/main.dart with your code
appwrite push functions
```

Without the CLI, package the function folder with
`tar --exclude code.tar.gz -czf code.tar.gz .`, then upload it in the Console under the function's
**Create deployment > Manual** tab and set the entrypoint (`lib/main.dart`).

Once deployed, you can run the function from the Console's **Execute** button or call its domain
with an HTTP request; the request body becomes `context.req.bodyText`.

## Further reading

- [Appwrite Functions: develop](https://appwrite.io/docs/products/functions/develop)
- [Appwrite Dart starter template](https://github.com/appwrite/templates/tree/main/dart/starter)
- [dart_fns source](https://github.com/FriendlyUser/dart_fns/functions)
