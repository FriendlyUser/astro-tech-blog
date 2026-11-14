---
title: "Decrypting Laravel Crypt::encryptString values in Python"
description: "How Laravel's encrypter builds its AES-256-CBC payload and HMAC-SHA256 MAC, and a Python function using pycryptodome that verifies and decrypts it."
tags: ["Laravel", "Cryptography", "Python", "AES-256-CBC", "HMAC-SHA256", "pycryptodome", "php"]
pubDate: "2025-10-17T19:17:25.000Z"
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3267094508_short_ruler_in_the_grass.png"
---

Laravel's `Crypt` facade encrypts values with your application's `APP_KEY`. If you're migrating data out of a Laravel app, auditing a database, or reading encrypted columns from a non-PHP service, you need to reproduce `Crypt::decryptString()` yourself. This post walks through the payload format and a Python function that verifies and decrypts it with `pycryptodome`.

## The payload format

Laravel's `Illuminate\Encryption\Encrypter` does the following when you call `Crypt::encryptString($plaintext)` with the default `AES-256-CBC` cipher:

1. Generates a random 16-byte IV.
2. Encrypts the plaintext with `openssl_encrypt` using the raw 32-byte key. Because no `OPENSSL_RAW_DATA` flag is passed, the ciphertext comes back already Base64-encoded.
3. Base64-encodes the IV.
4. Computes `mac = hash_hmac('sha256', $iv . $value, $key)`, a lowercase hex string over the *Base64-encoded* IV and ciphertext concatenated together.
5. JSON-encodes `{"iv": ..., "value": ..., "mac": ..., "tag": ...}` and Base64-encodes the whole JSON string.

The `tag` field is only used by the GCM ciphers (`aes-128-gcm`, `aes-256-gcm`). With CBC it's an empty string and the MAC provides integrity instead.

## The decryption function

Install the one third-party dependency:

```bash
pip install pycryptodome
```

`base64`, `json`, `hmac` and `hashlib` are in the standard library.

```python
import base64
import hashlib
import hmac
import json

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad


def decrypt_laravel_string(encrypted_str: str, app_key: str) -> str:
    """Decrypt a value produced by Laravel's Crypt::encryptString (AES-256-CBC)."""
    # APP_KEY is usually stored as "base64:<key>"; older apps may store the raw key.
    if app_key.startswith("base64:"):
        key = base64.b64decode(app_key[len("base64:"):])
    else:
        key = app_key.encode()
    if len(key) != 32:
        raise ValueError("AES-256-CBC needs a 32-byte key")

    data = json.loads(base64.b64decode(encrypted_str))

    # The MAC covers the Base64 strings exactly as they appear in the payload.
    expected_mac = hmac.new(
        key, (data["iv"] + data["value"]).encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_mac, data["mac"]):
        raise ValueError("MAC is invalid: wrong key or tampered payload")

    iv = base64.b64decode(data["iv"])
    ciphertext = base64.b64decode(data["value"])

    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
    return plaintext.decode("utf-8")


if __name__ == "__main__":
    LARAVEL_APP_KEY = "base64:..."  # from the app's .env
    ENCRYPTED_STRING = "eyJpdiI6..."  # from the database column

    print(decrypt_laravel_string(ENCRYPTED_STRING, LARAVEL_APP_KEY))
```

A few details worth knowing:

- **Verify the MAC before decrypting.** That's what Laravel does, and it stops you from feeding tampered ciphertext into CBC decryption. `hmac.compare_digest` does a constant-time comparison, like PHP's `hash_equals`.
- **Let errors raise.** An earlier version of this function caught every exception and returned the error message as a string, which makes a failed decryption look like a successful one. Catch `ValueError` at the call site if you need to handle bad rows.
- **Padding is PKCS#7.** OpenSSL pads CBC plaintext to the 16-byte block size, and `unpad` removes it (raising `ValueError` if it's malformed).

## Gotchas

- **`encrypt()` vs `encryptString()`.** `Crypt::encrypt($value)` and the `encrypt()` helper PHP-`serialize()` the value first. Decrypting those with this function gives you a serialized string such as `s:5:"hello";`, which you'd then need to unserialize (for example with the `phpserialize` package).
- **Rotated keys.** Recent Laravel versions accept `APP_PREVIOUS_KEYS` and try each key in turn. If the MAC fails with the current key, try the previous ones.
- **GCM ciphers.** If `config/app.php` sets `cipher` to `aes-256-gcm`, the payload has an empty `mac` and a non-empty `tag`. You'd need `AES.MODE_GCM` with `decrypt_and_verify` instead of the CBC path above.

## Further reading

- [Laravel encryption docs](https://laravel.com/docs/encryption)
- [`Encrypter.php` source](https://github.com/laravel/framework/blob/12.x/src/Illuminate/Encryption/Encrypter.php)
- [PyCryptodome CBC mode](https://pycryptodome.readthedocs.io/en/latest/src/cipher/classic.html#cbc-mode)
