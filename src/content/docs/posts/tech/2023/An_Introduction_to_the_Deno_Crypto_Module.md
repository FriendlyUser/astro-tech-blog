---
description: 'Hash, sign and encrypt data in Deno with the built-in Web Crypto API, and use @std/crypto for extra hash algorithms and timing-safe comparison.'
imgSrc: /imgs/2023/2776175216.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-05-16T06:54:24.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript"]
title: 'Cryptography in Deno: Web Crypto and @std/crypto'
---

:::caution[Updated in November 2026]
The first version of this post imported `crypto` from `https://deno.land/std@0.115.0/crypto/mod.ts`. The standard library is no longer published to `deno.land/std`; it now lives on JSR as separate `@std/*` packages. You also don't need the standard library for most cryptography, because Deno provides the Web Crypto API as the global `crypto`. The examples below were run with Deno 2.9.
:::

Deno implements the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto), the same interface browsers expose, as the global `crypto` object. There's nothing to import: `crypto.subtle` handles hashing, HMAC, signatures, encryption and key derivation, and `crypto.getRandomValues` and `crypto.randomUUID` produce secure random data. Code written against it also runs in browsers, Node.js and Bun.

The standard library package [`@std/crypto`](https://jsr.io/@std/crypto) adds a few things on top: hash algorithms that Web Crypto doesn't include (such as BLAKE3), hashing of streams, and a timing-safe comparison function.

## What Web Crypto covers

`crypto.subtle` is asynchronous: every method returns a `Promise`. The main operations are:

- `digest`: SHA-1, SHA-256, SHA-384 and SHA-512, plus SHA-3 in recent Deno versions.
- `sign` / `verify`: HMAC, RSASSA-PKCS1-v1_5, RSA-PSS, ECDSA and Ed25519.
- `encrypt` / `decrypt`: AES-GCM, AES-CBC, AES-CTR and RSA-OAEP.
- `deriveKey` / `deriveBits`: PBKDF2, HKDF, ECDH and X25519.
- `generateKey`, `importKey`, `exportKey`, `wrapKey` / `unwrapKey` for key management.

Deno 2.9 also implements several algorithms from the WICG [Modern Algorithms in WebCrypto](https://wicg.github.io/webcrypto-modern-algos/) proposal, including ChaCha20-Poly1305, ML-KEM, ML-DSA and Argon2. These aren't in browsers yet, so code that uses them is Deno-specific for now.

## Hashing a string

```typescript
import { encodeHex } from "jsr:@std/encoding@1/hex";

const data = new TextEncoder().encode("Hello, Deno!");
const digest = await crypto.subtle.digest("SHA-256", data);
console.log(encodeHex(digest));
// 00642205d9fc5973c9ee804a3bdb82ec0d2f6f616a952d651b0071a14f6c2e8d
```

`digest` takes bytes, not strings, so encode text with `TextEncoder` first. It returns an `ArrayBuffer`. `encodeHex` from `@std/encoding` turns that into a hex string, which saves writing the `Array.from(...).map(b => b.toString(16).padStart(2, "0"))` dance by hand.

Don't use a plain hash for passwords. Use a slow, salted key derivation function such as PBKDF2 (available in Web Crypto) or Argon2.

## Signing and verifying with HMAC

HMAC proves that a message came from someone who holds a shared secret and wasn't changed. It's what you'd use for signed cookies or webhook signatures:

```typescript
const encoder = new TextEncoder();

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

const message = encoder.encode("user=42&role=admin");
const signature = await crypto.subtle.sign("HMAC", key, message);

const ok = await crypto.subtle.verify("HMAC", key, signature, message);
const tampered = await crypto.subtle.verify(
  "HMAC",
  key,
  signature,
  encoder.encode("user=42&role=owner"),
);
console.log(ok, tampered); // true false
```

The second argument to `generateKey` is `extractable`. Setting it to `false` means the raw key bytes can't be exported from the `CryptoKey` object. To use an existing secret (say, from an environment variable), load it with `crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])`.

Use `crypto.subtle.verify` rather than comparing signatures with `===`. A normal comparison can stop at the first differing byte, which leaks timing information.

## Encrypting with AES-GCM

AES-GCM encrypts and authenticates in one step, so decryption fails if the ciphertext was modified:

```typescript
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt", "decrypt"],
);

// A 96-bit IV, unique per message. Never reuse an IV with the same key.
const iv = crypto.getRandomValues(new Uint8Array(12));
const plaintext = new TextEncoder().encode("card ending 4242");

const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  plaintext,
);

const decrypted = await crypto.subtle.decrypt(
  { name: "AES-GCM", iv },
  key,
  ciphertext,
);
console.log(new TextDecoder().decode(decrypted)); // card ending 4242
```

The IV isn't secret. Store it alongside the ciphertext, since you need it to decrypt. Reusing an IV with the same key breaks GCM's security, so generate a fresh random one for every message. `@std/crypto/aes-gcm` has `encryptAesGcm` and `decryptAesGcm` helpers that generate the nonce and prepend it to the output for you.

## Random values

```typescript
console.log(crypto.randomUUID()); // e.g. f488abb9-710f-49b0-8f4e-2cfe3c7d85d9
console.log(crypto.getRandomValues(new Uint8Array(16)));
```

Both use a cryptographically secure generator. Use them, not `Math.random()`, for tokens, IDs and salts.

## @std/crypto: more hash algorithms and streams

The `crypto` export from `@std/crypto` wraps the global one. It passes standard calls through to Web Crypto, and handles extra algorithms and streaming input with a bundled WebAssembly build:

```typescript
import { crypto } from "jsr:@std/crypto@1";
import { timingSafeEqual } from "jsr:@std/crypto@1/timing-safe-equal";
import { encodeHex } from "jsr:@std/encoding@1/hex";

const data = new TextEncoder().encode("Hello, Deno!");

// BLAKE3 is not in the Web Crypto spec; @std/crypto provides it via Wasm.
console.log(encodeHex(await crypto.subtle.digest("BLAKE3", data)));

// Hash a file as a stream without reading it all into memory.
using file = await Deno.open("large-file.bin");
console.log(encodeHex(await crypto.subtle.digest("SHA-256", file.readable)));

const a = await crypto.subtle.digest("SHA-256", data);
const b = await crypto.subtle.digest("SHA-256", data);
console.log(timingSafeEqual(a, b)); // true
```

Run it with `deno run --allow-read hash.ts`, because opening the file needs read permission.

The extra digest algorithms include BLAKE2B, BLAKE2S, BLAKE3, the Keccak and SHA-3 families, SHAKE, and older ones like MD5 and FNV that are there for compatibility, not security. There's also a synchronous `crypto.subtle.digestSync`.

## Further reading

- [SubtleCrypto on MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto), the best reference for each algorithm's parameters
- [Deno's Web Platform APIs](https://docs.deno.com/runtime/reference/web_platform_apis/), including which newer algorithms Deno supports
- [`@std/crypto` on JSR](https://jsr.io/@std/crypto)
