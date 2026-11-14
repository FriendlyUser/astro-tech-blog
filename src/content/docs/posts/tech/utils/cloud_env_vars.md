---
tags: ['js', 'bash', 'node']
title: Storing PEM keys in cloud environment variables with base64
description: Why multi-line values like PEM keys break in environment variables, and how to base64-encode them in bash and decode them in JavaScript.
pubDate: Fri, 30 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1373682361.png
---
Environment variables are key/value pairs a process inherits from whatever started it. Cloud platforms (Heroku, Vercel, Netlify, Cloud Run, GitHub Actions secrets and so on) use them to hand configuration to your app: database URLs, API keys, feature flags. Keeping these out of the source code means the same build can run in development, staging and production, and secrets don't end up in git.

## Everything is a string

At the operating-system level an environment variable's value is just a string. Numbers and booleans have to be parsed by your code (`process.env.PORT` is `"3000"`, not `3000`; `"false"` is truthy in JavaScript).

Multi-line values are where this gets awkward. A PEM private key or certificate looks like this:

```text
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...
-----END PRIVATE KEY-----
```

Many dashboards, CLI flags and `.env` parsers handle the newlines badly: they get stripped, turned into literal `\n`, or cut off the value at the first line. The usual workaround is to base64-encode the whole file into one line, store that, and decode it at startup.

Note that a PEM file is already text: the body between the `BEGIN`/`END` lines is itself base64-encoded binary (DER). Encoding it again isn't about making binary safe, it's only about getting rid of the newlines.

## Base64 in brief

Base64 takes input three bytes (24 bits) at a time and writes them as four characters from a 64-character alphabet (`A–Z`, `a–z`, `0–9`, `+`, `/`), padding the end with `=`. The output is about 33% larger than the input. It is an encoding, not encryption: anyone can decode it, so treat a base64 secret as exactly as sensitive as the original.

## Encoding and decoding in bash

With GNU coreutils (Linux, Git Bash, most CI runners):

```bash
# Encode a file on a single line (-w0 disables line wrapping)
base64 -w0 private-key.pem

# Encode a string. printf avoids the trailing newline that echo adds.
printf '%s' 'Hello, world!' | base64 -w0
# SGVsbG8sIHdvcmxkIQ==

# Decode
printf '%s' 'SGVsbG8sIHdvcmxkIQ==' | base64 -d
# Hello, world!
```

`echo "Hello, world!" | base64` gives `SGVsbG8sIHdvcmxkIQo=` instead, because `echo` appends a newline that gets encoded too. That trailing newline is a common source of "the key is valid locally but rejected in production" bugs.

On macOS, `base64` doesn't support `-w`, but it doesn't wrap lines by default either: use `base64 -i private-key.pem` to encode a file. `openssl base64 -A -in private-key.pem` works the same on both platforms (`-A` keeps the output on one line).

## Decoding in JavaScript

In Node.js, decode with `Buffer`:

```js
// PRIVATE_KEY_B64 holds the output of `base64 -w0 private-key.pem`
const privateKey = Buffer.from(process.env.PRIVATE_KEY_B64, 'base64').toString('utf8');
```

Browsers (and Node.js 16+) also have the global `btoa()` and `atob()` functions:

```js
const message = 'Hello, world!';
const encoded = btoa(message);
console.log(encoded); // SGVsbG8sIHdvcmxkIQ==

const decoded = atob(encoded);
console.log(decoded); // Hello, world!
```

`btoa()` only accepts characters in the Latin-1 range and throws an `InvalidCharacterError` on anything else (emoji, most non-Latin text). In Node.js prefer `Buffer`; in the browser, encode to bytes first with `TextEncoder` if the input might contain non-Latin-1 characters.

## Gotchas

- Some platforms have size limits on individual variables or on the total environment (AWS Lambda, for example, caps all variables for a function at 4 KB). A base64-encoded certificate chain can hit that; a secrets manager is the better home for large values.
- If you control the parser, an alternative to base64 is storing the PEM with literal `\n` sequences and calling `.replace(/\\n/g, '\n')` after reading it. It works, but it's easier to get wrong than base64.
- Environment variables are visible to every process the app spawns and often end up in crash dumps and debug pages. Don't print `process.env` in logs.
