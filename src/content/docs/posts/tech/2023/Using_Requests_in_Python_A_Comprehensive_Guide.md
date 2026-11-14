---
description: 'How to make HTTP requests in Python with Requests: GET and POST, query parameters, file uploads and downloads, timeouts, errors, auth and redirects.'
imgSrc: /imgs/2023/2851628136.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-15T01:07:52.000Z'
lastUpdated: 2026-11-14
tags: ['python', 'requests', 'http']
title: 'Making HTTP requests in Python with Requests'
---

[Requests](https://requests.readthedocs.io/en/latest/) is the most widely used third-party HTTP client for Python. It wraps `urllib3` behind a small API: you call `requests.get()` or `requests.post()`, and get back a `Response` with the status code, headers and body already decoded. The examples below use [httpbin.org](https://httpbin.org), a public service that echoes back what you send, so you can run them as-is.

## Installing

Current Requests releases (2.34.x) require Python 3.10 or newer.

```bash
pip install requests
```

## GET and POST

```python
import requests

response = requests.get("https://httpbin.org/get", timeout=10)
print(response.status_code)  # 200
print(response.json())       # parsed JSON body
```

`response.text` gives the body as a string and `response.content` as bytes; `response.json()` parses it as JSON.

For a POST, `data=` sends a form-encoded body and `json=` serialises a dict to JSON and sets the `Content-Type` header for you:

```python
import requests

# application/x-www-form-urlencoded
response = requests.post("https://httpbin.org/post", data={"name": "John", "age": 30}, timeout=10)
print(response.json()["form"])  # {'age': '30', 'name': 'John'}

# application/json
response = requests.post("https://httpbin.org/post", json={"name": "John", "age": 30}, timeout=10)
print(response.json()["json"])  # {'age': 30, 'name': 'John'}
```

## Query parameters

Pass a dict to `params=` instead of building the query string yourself; Requests URL-encodes it:

```python
import requests

payload = {"q": "rust error handling", "page": 2}
response = requests.get("https://httpbin.org/get", params=payload, timeout=10)
print(response.url)  # https://httpbin.org/get?q=rust+error+handling&page=2
```

## Uploading and downloading files

To upload, pass open file objects in `files=`. Requests builds a `multipart/form-data` body. Open the file in binary mode and close it when you're done:

```python
import requests

with open("example.txt", "rb") as f:
    response = requests.post("https://httpbin.org/post", files={"file": f}, timeout=10)
print(response.json()["files"])
```

To download a large file without loading it all into memory, use `stream=True` and write it in chunks:

```python
import requests

url = "https://httpbin.org/bytes/102400"  # 100 KiB of random bytes

with requests.get(url, stream=True, timeout=10) as response:
    response.raise_for_status()
    with open("download.bin", "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
```

Using the response as a context manager makes sure the connection is released even if writing fails.

## Timeouts and errors

Requests has **no default timeout**: without `timeout=`, a request to an unresponsive server can hang forever. Always pass one. A single number applies to both connecting and reading; a tuple sets them separately:

```python
import requests

try:
    response = requests.get("https://httpbin.org/delay/5", timeout=(3.05, 2))
except requests.Timeout:
    print("The request timed out")
```

A 4xx or 5xx status does not raise on its own. Call `raise_for_status()` to turn it into an exception, and catch `requests.RequestException` (the base class) for connection failures and other errors:

```python
import requests

try:
    response = requests.get("https://httpbin.org/status/404", timeout=10)
    response.raise_for_status()
except requests.HTTPError as error:
    print(f"HTTP error: {error}")
except requests.RequestException as error:
    print(f"Request failed: {error}")
```

## Authentication

Basic auth is built in, and a `(user, password)` tuple is shorthand for `HTTPBasicAuth`:

```python
import requests

response = requests.get(
    "https://httpbin.org/basic-auth/user/passwd",
    auth=("user", "passwd"),
    timeout=10,
)
print(response.status_code)  # 200
```

Digest auth is available as `requests.auth.HTTPDigestAuth`. OAuth is not part of Requests itself; use the separate [requests-oauthlib](https://requests-oauthlib.readthedocs.io/en/latest/) package. For bearer tokens, set the header directly: `headers={"Authorization": f"Bearer {token}"}`.

## Redirects

Requests follows redirects automatically for every method except `HEAD`. `response.history` lists the intermediate responses and `response.url` is the final URL:

```python
import requests

response = requests.get("https://httpbin.org/redirect/2", timeout=10)
print(response.url)      # https://httpbin.org/get
print(response.history)  # [<Response [302]>, <Response [302]>]
```

Set `allow_redirects=False` to inspect the redirect yourself:

```python
import requests

response = requests.get("https://httpbin.org/redirect/1", allow_redirects=False, timeout=10)
print(response.status_code)          # 302
print(response.headers["Location"])  # /get
```

## Sessions

If you make several requests to the same host, use a `Session`. It reuses the underlying TCP connection and keeps cookies and default headers between calls:

```python
import requests

with requests.Session() as session:
    session.headers.update({"User-Agent": "my-script/1.0"})
    for page in range(1, 4):
        response = session.get("https://httpbin.org/get", params={"page": page}, timeout=10)
        print(response.json()["args"])
```

## When not to use Requests

Requests is synchronous. If you need to make many requests concurrently from `asyncio` code, or need HTTP/2, look at [HTTPX](https://www.python-httpx.org/) or `aiohttp` instead; HTTPX keeps an API close to Requests.

See the [Requests documentation](https://requests.readthedocs.io/en/latest/) for proxies, SSL verification, retries via `HTTPAdapter`, and more.
