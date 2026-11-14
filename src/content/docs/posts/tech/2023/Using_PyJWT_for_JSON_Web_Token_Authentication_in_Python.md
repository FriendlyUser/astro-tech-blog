---
description: How a JSON Web Token is structured, and how to sign, verify and expire JWTs in Python with PyJWT 2.x, including which exceptions to catch.
imgSrc: /imgs/2023/DALL·E 2023-01-07 13.47.20 - spaceship paper.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-07T00:01:07.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: Signing and verifying JSON Web Tokens in Python with PyJWT
---

A JSON Web Token (JWT) is a signed, URL-safe string that carries a set of claims, such as "this request is from user 42 and is valid until 10:15". Web APIs use them as bearer tokens: the server signs a token at login, and later checks the signature instead of looking up a session. [PyJWT](https://pyjwt.readthedocs.io/) is the usual library for this in Python. The examples below were run against PyJWT 2.15.1.

## How a JWT is put together

A JWT has three Base64url-encoded parts joined by dots:

```text
header.payload.signature
```

The **header** names the signing algorithm and token type:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

The **payload** holds the claims. Some names are registered in [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1), such as `sub` (subject), `iss` (issuer), `iat` (issued at) and `exp` (expiry); you can add your own alongside them:

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}
```

The **signature** is computed over `base64url(header) + "." + base64url(payload)` using the algorithm in the header and a key. With HS256 that is an HMAC-SHA256 with a shared secret; with RS256 or ES256 it is a private-key signature that anyone holding the public key can check.

The signature only proves the token wasn't changed. The header and payload are encoded, not encrypted, so anyone holding the token can read them. Don't put secrets in a JWT.

## Installing PyJWT

```bash
pip install pyjwt
```

That covers the HMAC algorithms (HS256, HS384, HS512). For RSA or EC algorithms, install the `cryptography` extra with `pip install "pyjwt[crypto]"`.

## Encoding and decoding

```python
import jwt

payload = {
    "sub": "1234567890",
    "name": "John Doe",
    "iat": 1516239022,
}

# HS256 keys should be at least 32 bytes; PyJWT warns about shorter ones.
secret = "replace-me-with-a-random-32-byte-or-longer-secret"

encoded_jwt = jwt.encode(payload, secret, algorithm="HS256")
print(encoded_jwt)

decoded = jwt.decode(encoded_jwt, secret, algorithms=["HS256"])
print(decoded)
```

Output:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.KyKFQfD9LQl_TEbhLdnYnDu3TQ8DZU2nvuzthSb_ADI
{'sub': '1234567890', 'name': 'John Doe', 'iat': 1516239022}
```

Since PyJWT 2.0, `jwt.encode()` returns a `str`. Older 1.x code and examples show `bytes` (`b'eyJ...'`) and call `.decode("utf-8")` on the result, which fails on 2.x.

Two details in `decode()` matter:

- `algorithms` is required, and you should list only the algorithms you actually issue. Accepting whatever the token's header says is how the classic "alg: none" and key-confusion attacks work.
- Recent PyJWT versions reject a `sub` claim that isn't a string, so use `"sub": "42"`, not `"sub": 42`.

In a real application, load the secret from configuration or a secrets manager rather than hard-coding it. `python -c "import secrets; print(secrets.token_urlsafe(32))"` generates a suitable value.

## Expiry and error handling

Tokens should expire. PyJWT accepts `datetime` objects for `exp`, `iat` and `nbf`, converts them to Unix timestamps, and checks `exp` and `nbf` automatically on decode.

All validation errors inherit from `jwt.exceptions.InvalidTokenError`. `ExpiredSignatureError` and `InvalidSignatureError` are subclasses of it, so catch them first and use `InvalidTokenError` as the catch-all for malformed tokens, missing claims and so on:

```python
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidSignatureError, InvalidTokenError

secret = "replace-me-with-a-random-32-byte-or-longer-secret"


def issue_token(user_id: str) -> str:
    now = datetime.now(tz=timezone.utc)
    claims = {"sub": user_id, "iat": now, "exp": now + timedelta(minutes=15)}
    return jwt.encode(claims, secret, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except ExpiredSignatureError:
        print("Token has expired.")
    except InvalidSignatureError:
        print("Invalid signature.")
    except InvalidTokenError as exc:
        print(f"Invalid token: {exc}")
    return None


token = issue_token("42")
print(verify_token(token))
print(verify_token("not-a-jwt"))
```

Output (the timestamps will differ):

```text
{'sub': '42', 'iat': 1794674251, 'exp': 1794675151}
Invalid token: Not enough segments
None
```

`decode()` only checks `exp` if the token has one. To reject tokens that lack it, pass `options={"require": ["exp"]}`, which raises `MissingRequiredClaimError` (also an `InvalidTokenError`).

## Gotchas

- A signed JWT can't be revoked before it expires. Keep lifetimes short, or keep a server-side denylist if you need logout to take effect immediately.
- With HS256, every service that verifies tokens also holds the key that can mint them. If several services need to verify, use RS256 or ES256 so they only need the public key.
- Allow for clock drift between servers with the `leeway` argument to `decode()`, for example `leeway=10` seconds.

## Further reading

- [PyJWT usage examples](https://pyjwt.readthedocs.io/en/stable/usage.html)
- [PyJWT API reference](https://pyjwt.readthedocs.io/en/stable/api.html)
- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
