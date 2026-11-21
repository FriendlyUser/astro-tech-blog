---
title: "Async HTTP in Python with HTTPX: clients, timeouts, retries and limits"
description: "Use httpx.AsyncClient well: one shared client, timeouts and pool limits, what transport retries cover, backoff for 429 and 5xx, streaming and MockTransport."
tags: ["Python", "HTTPX", "asyncio", "HTTP", "Testing"]
pubDate: "2026-12-24T16:00:00.000Z"
imgSrc: "/imgs/2026/python_httpx_async_client.webp"
imgAlt: "A vertical timeline of one GET request retried after two 503 responses and a 429 with Retry-After, with growing sleep bars before a final 200"
---

[HTTPX](https://www.python-httpx.org/) is an HTTP client for Python with a Requests-style API, plus async support and optional HTTP/2. If you're writing asyncio code that talks to APIs, `httpx.AsyncClient` is the usual choice: it pools connections, lets you set timeouts per phase, and has a mock transport that makes tests easy.

The basics take five minutes. The parts that matter in production (reusing the client, timeouts, connection limits, what the built-in retries actually retry, and how to handle 429s) are what this post is about. Examples use HTTPX 0.28.1 on Python 3.14.

```bash
uv add httpx    # or: pip install httpx
```

## Create one client and reuse it

The module-level functions (`httpx.get(...)`) and a fresh `AsyncClient` per request both throw away the connection pool every time, so each request pays for a new TCP connection and TLS handshake. Create one client for the lifetime of your program, or of a batch of work, and share it:

```python
import asyncio
import httpx


async def main() -> None:
    async with httpx.AsyncClient(base_url="https://api.github.com") as client:
        r = await client.get("/repos/encode/httpx")
        r.raise_for_status()
        print(r.json()["stargazers_count"])


asyncio.run(main())
```

The `async with` block closes the pool at the end. In a web app, create the client at startup (for example in a FastAPI lifespan handler) and close it at shutdown with `await client.aclose()`.

Settings on the client (`base_url`, `headers`, `timeout`, `auth`, `params`) apply to every request, and individual calls can override them.

## Timeouts

HTTPX applies a **5-second timeout by default**, unlike Requests, which waits forever unless you pass one. That default covers four separate phases:

| Phase | What it limits | Exception |
|---|---|---|
| `connect` | establishing the TCP/TLS connection | `ConnectTimeout` |
| `read` | waiting for each chunk of the response | `ReadTimeout` |
| `write` | sending each chunk of the request body | `WriteTimeout` |
| `pool` | waiting for a free connection from the pool | `PoolTimeout` |

All four inherit from `httpx.TimeoutException`. Note that `read` is per chunk, not a total: a server that trickles one byte every four seconds never trips a five-second read timeout. If you need a hard deadline for the whole request, wrap it in `asyncio.timeout()`.

Set them on the client with `httpx.Timeout`. The first argument is the default for all four, and keywords override single phases:

```python
timeout = httpx.Timeout(10.0, connect=3.0)
# Timeout(connect=3.0, read=10.0, write=10.0, pool=10.0)
```

A short connect timeout with a longer read timeout is a good general setting: an unreachable host fails fast, while a slow endpoint still gets time to respond. Override per request when one call is known to be slow: `await client.get(url, timeout=60.0)`.

## Connection limits

`httpx.Limits` controls the pool:

- `max_connections`: total open connections (default 100).
- `max_keepalive_connections`: idle connections kept for reuse (default 20).
- `keepalive_expiry`: how long an idle connection is kept, in seconds (default 5.0).

When every connection is busy, further requests wait for one to free up, and give up with `PoolTimeout` after the `pool` timeout. That makes `max_connections` a useful global cap on concurrency toward a server. If you start 1,000 tasks with `asyncio.gather` and the pool holds 20, the other 980 queue inside HTTPX. They also start their pool timers immediately, which is why large fan-outs see `PoolTimeout` errors. Limiting concurrency in your own code with an `asyncio.Semaphore` keeps the queue (and the timeouts) under your control.

## What `retries=` does, and what it doesn't

`httpx.AsyncHTTPTransport(retries=2)` sounds like a general retry setting. It isn't. It retries only when **establishing the connection** fails, with `httpx.ConnectError` or `httpx.ConnectTimeout`. It never retries:

- a request that reached the server and got a 429, 500 or 503 back;
- a `ReadTimeout` or a connection dropped halfway through a response.

That's deliberate: once a request has been sent, HTTPX can't know whether it's safe to send again. Connection-level retries are still worth turning on because they cover a common failure (DNS hiccups, a server restarting) at no risk. For responses you need your own loop.

## A retry loop for 429 and 5xx with backoff

This helper retries `GET` requests on rate limiting, server errors, timeouts and network errors. It waits with exponential backoff and full jitter, and honours `Retry-After` when the server sends it:

```python
# fetcher.py
import asyncio
import email.utils
import random
import time
from pathlib import Path

import httpx

RETRY_STATUSES = {429, 500, 502, 503, 504}


def make_client(**kwargs) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=3.0),
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        transport=kwargs.pop("transport", None) or httpx.AsyncHTTPTransport(retries=2),
        headers={"User-Agent": "example-fetcher/1.0"},
        follow_redirects=True,
        **kwargs,
    )


def retry_after_seconds(response: httpx.Response) -> float | None:
    value = response.headers.get("Retry-After")
    if value is None:
        return None
    if value.isdigit():
        return float(value)
    try:
        when = email.utils.parsedate_to_datetime(value)  # HTTP-date form
    except (TypeError, ValueError):
        return None
    return max(0.0, when.timestamp() - time.time())


async def get_with_retries(
    client: httpx.AsyncClient,
    url: str,
    *,
    attempts: int = 4,
    base_delay: float = 0.5,
    max_delay: float = 20.0,
    **kwargs,
) -> httpx.Response:
    for attempt in range(1, attempts + 1):
        try:
            response = await client.get(url, **kwargs)
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt == attempts:
                raise
            response = None
        else:
            if response.status_code not in RETRY_STATUSES or attempt == attempts:
                return response.raise_for_status()

        delay = min(max_delay, base_delay * 2 ** (attempt - 1))
        delay = random.uniform(0, delay)  # full jitter
        if response is not None and (hinted := retry_after_seconds(response)) is not None:
            delay = min(max_delay, hinted)
        await asyncio.sleep(delay)
    raise AssertionError("unreachable")


async def download(client: httpx.AsyncClient, url: str, dest: Path) -> int:
    tmp = dest.with_suffix(dest.suffix + ".part")
    written = 0
    async with client.stream("GET", url) as response:
        response.raise_for_status()
        with tmp.open("wb") as f:
            async for chunk in response.aiter_bytes(chunk_size=64 * 1024):
                f.write(chunk)
                written += len(chunk)
    tmp.replace(dest)
    return written
```

Some notes on the choices:

- **`raise_for_status()` returns the response** in current HTTPX, so `return response.raise_for_status()` returns successes and raises `HTTPStatusError` for 4xx and for 5xx after the last attempt. A 404 is never retried.
- **Jitter** spreads retries out so that many clients failing at the same moment don't all come back at the same moment.
- **`Retry-After`** can be a number of seconds or an HTTP date; both are handled. It's capped at `max_delay` so a misbehaving server can't park your task for an hour. If you would rather fail than wait that long, raise instead.
- **Only idempotent requests.** Retrying a `POST` that timed out may create the order twice. If you need to retry writes, use the API's idempotency key mechanism if it has one.

If you'd rather not write this yourself, [Tenacity](https://tenacity.readthedocs.io/) and [Stamina](https://stamina.hynek.me/) both provide retry decorators that work with async functions. The loop above is short enough that I'd keep it in the codebase, where it's obvious what gets retried.

## Streaming downloads

`client.get()` reads the whole body into memory. For large files, use `client.stream()`, which returns as soon as the headers arrive and lets you read the body in chunks. `download()` in `fetcher.py` above does that, writing to a `.part` file and renaming it only when the download finishes, so a crash never leaves a truncated file under the real name.

The stream must be consumed inside the `async with` block. After it exits, the connection goes back to the pool and the body can't be read any more. Use `aiter_bytes()` for decoded content (gzip and similar are decompressed), or `aiter_raw()` if you want the bytes exactly as sent.

## Putting it together

This script fetches five pages concurrently, downloads a 5 MB file, and shows the transport retrying a refused connection. To run it end to end without depending on anyone's API, serve a folder locally:

```bash
mkdir site && cd site
for i in 1 2 3 4 5; do echo "page $i" > page$i.txt; done
head -c 5000000 /dev/urandom > big.bin
python -m http.server 8000 --bind 127.0.0.1
```

```python
# main.py
import asyncio
import time
from pathlib import Path

import httpx

from fetcher import download, get_with_retries, make_client

BASE = "http://127.0.0.1:8000"


async def main() -> None:
    async with make_client(base_url=BASE) as client:
        sem = asyncio.Semaphore(5)  # at most 5 requests in flight from this code

        async def fetch(path: str) -> str:
            async with sem:
                r = await get_with_retries(client, path)
                return r.text.strip()

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch(f"/page{i}.txt")) for i in range(1, 6)]
        print([t.result() for t in tasks])

        n = await download(client, "/big.bin", Path("big-copy.bin"))
        print(f"downloaded {n:,} bytes")

    # Nothing listens on port 9: the transport retries the connect, then raises.
    async with make_client() as client:
        t0 = time.perf_counter()
        try:
            await client.get("http://127.0.0.1:9/")
        except httpx.ConnectError as e:
            print(f"ConnectError after {time.perf_counter() - t0:.1f}s: {e!r}")


asyncio.run(main())
```

Output from a run on Windows:

```text
['page 1', 'page 2', 'page 3', 'page 4', 'page 5']
downloaded 5,000,000 bytes
ConnectError after 6.6s: ConnectError('All connection attempts failed')
```

The 6.6 seconds is three connection attempts (the first plus two retries). On Windows a refused local connection itself takes about two seconds to fail; on Linux and macOS it fails almost instantly, so you'll see a much smaller number there.

`asyncio.TaskGroup` (Python 3.11+) cancels the remaining tasks if one fails, which is usually what you want for a batch. If you'd rather collect failures and carry on, use `asyncio.gather(..., return_exceptions=True)`.

## Testing with MockTransport

`httpx.MockTransport` takes a function that receives an `httpx.Request` and returns an `httpx.Response`. Pass it as the client's transport and no network is involved. Because `make_client()` accepts a `transport` argument, the tests exercise the same client configuration as production:

```python
# test_fetcher.py
import httpx
import pytest

from fetcher import download, get_with_retries, make_client


async def test_retries_503_then_succeeds():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls < 3:
            return httpx.Response(503, headers={"Retry-After": "0"})
        return httpx.Response(200, json={"ok": True})

    async with make_client(transport=httpx.MockTransport(handler)) as client:
        response = await get_with_retries(client, "https://api.example.test/items")

    assert response.json() == {"ok": True}
    assert calls == 3


async def test_gives_up_and_raises():
    transport = httpx.MockTransport(lambda request: httpx.Response(500))
    async with make_client(transport=transport) as client:
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await get_with_retries(client, "https://api.example.test/items", attempts=2, base_delay=0)
    assert exc_info.value.response.status_code == 500


async def test_404_is_not_retried():
    calls = 0

    def handler(request):
        nonlocal calls
        calls += 1
        return httpx.Response(404)

    async with make_client(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await get_with_retries(client, "https://api.example.test/missing")
    assert calls == 1


async def test_download_streams_to_disk(tmp_path):
    payload = b"x" * 300_000
    transport = httpx.MockTransport(lambda request: httpx.Response(200, content=payload))
    async with make_client(transport=transport) as client:
        n = await download(client, "https://files.example.test/big.bin", tmp_path / "big.bin")
    assert n == len(payload)
    assert (tmp_path / "big.bin").read_bytes() == payload
    assert not (tmp_path / "big.bin.part").exists()
```

These use `pytest-asyncio` in auto mode:

```ini
# pytest.ini
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
```

```bash
uv run --with httpx --with pytest --with pytest-asyncio pytest -q
# 4 passed in 0.25s
```

The handler can also be an `async def` if it needs to await something. It gets the full request, so you can assert on `request.url.path`, `request.headers` or `request.content` too. For larger suites, the third-party [RESPX](https://lundberg.github.io/respx/) library adds route matching on top of the same idea.

## Gotchas

- **Don't create a client per request.** You lose connection pooling, and in a loop you can run out of sockets.
- **`follow_redirects` is off by default**, unlike Requests. A 301 comes back as a 301 unless you turn it on.
- **HTTP/2 needs an extra**: `pip install "httpx[http2]"` and `AsyncClient(http2=True)`. It helps most when you make many concurrent requests to one host.
- **Mixing event loops.** Pooled connections belong to the event loop that opened them. Don't create a client at import time and then use it from several `asyncio.run()` calls; create it inside the running loop.
- **`ReadTimeout` isn't a total deadline.** Use `asyncio.timeout()` around the call if you need one.

## Further reading

- [HTTPX: Async support](https://www.python-httpx.org/async/)
- [HTTPX: Timeouts](https://www.python-httpx.org/advanced/timeouts/), [Resource limits](https://www.python-httpx.org/advanced/resource-limits/) and [Transports](https://www.python-httpx.org/advanced/transports/)
- [HTTPX exceptions](https://www.python-httpx.org/exceptions/)
- [MDN: Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
