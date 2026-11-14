---
description: How to serve a Flask (or any WSGI) app with Gunicorn, set workers, bind address and timeouts in gunicorn.conf.py, and put Nginx in front of it.
imgSrc: /imgs/2023/3893879687.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-08-25T10:07:00.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: Serving a Python web app with Gunicorn and Nginx
---

Gunicorn ("Green Unicorn") is a WSGI HTTP server for Python. It uses a pre-fork model: a master process starts a number of worker processes and restarts any that crash or hang. Flask's and Django's built-in servers are for development; Gunicorn is one of the usual ways to run the same app in production, typically behind Nginx.

Gunicorn only runs on Unix-like systems (Linux, macOS, BSD) because it depends on `fork`. On Windows, run it under WSL or in a container, or use a Windows-compatible WSGI server such as Waitress.

## Install

At the time of writing the current release is Gunicorn 27.0.1, which requires Python 3.10 or newer. Inside a virtual environment:

```bash
pip install gunicorn flask
```

## Run a Flask app

Create `app.py`:

```python
from flask import Flask

app = Flask(__name__)


@app.route("/")
def hello_world():
    return "Hello, Gunicorn!"
```

From the same directory, start Gunicorn:

```bash
gunicorn app:app
```

`app:app` means "import the module `app` and use the object named `app` in it". With no other options Gunicorn starts one sync worker and listens on `127.0.0.1:8000`, so `curl http://127.0.0.1:8000` returns `Hello, Gunicorn!`. (If the `PORT` environment variable is set, the default bind becomes `0.0.0.0:$PORT`, which is what platforms such as Heroku rely on.)

For an app built with the factory pattern, Gunicorn can call the factory for you: `gunicorn "myproject:create_app()"`.

## Common settings

Every setting can be given on the command line or in a config file. The ones you'll touch most often:

| Flag | Default | What it does |
|---|---|---|
| `-w`, `--workers` | `1` | Number of worker processes. |
| `-b`, `--bind` | `127.0.0.1:8000` | Address to listen on. Can be repeated, and accepts `unix:/path/to.sock`. |
| `-t`, `--timeout` | `30` | Seconds a worker can stay silent before the master kills and restarts it. |
| `--log-level` | `info` | One of `debug`, `info`, `warning`, `error`, `critical`. |
| `-c`, `--config` | `./gunicorn.conf.py` | Config file to load. |

On worker count, the Gunicorn docs suggest starting with `(2 × CPU cores) + 1` and adjusting under real load. More workers is not automatically better: each one is a full copy of your app in memory.

```bash
gunicorn app:app --workers 5 --bind 127.0.0.1:8000
```

### Config file

Gunicorn automatically loads `gunicorn.conf.py` from the directory it's started in, so you don't need `-c` unless the file lives elsewhere. The file is plain Python, which means you can compute values:

```python
# gunicorn.conf.py
import multiprocessing

bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
timeout = 30
loglevel = "info"
accesslog = "-"  # write access logs to stdout
```

```bash
gunicorn app:app
```

## Put Nginx in front

Gunicorn's default sync workers handle one request at a time each, so a slow client uploading or downloading slowly ties up a whole worker. The Gunicorn docs say the sync worker needs a buffering proxy such as Nginx in production. Nginx buffers the request and response, serves static files, and terminates TLS.

Keep Gunicorn bound to `127.0.0.1` (or a Unix socket) so only Nginx can reach it, and add a server block such as `/etc/nginx/conf.d/myapp.conf`:

```nginx
upstream app_server {
    server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_pass http://app_server;
    }
}
```

`X-Forwarded-Proto` tells the app whether the original request was HTTPS, so it builds correct URLs. Gunicorn only trusts these forwarded headers from addresses in `forwarded_allow_ips`, which defaults to `127.0.0.1,::1`. That works when Nginx is on the same machine; if Nginx runs on another host, add its IP there. Avoid setting it to `*` unless Gunicorn is unreachable from anywhere except the proxy, because clients could then forge the headers.

## Gotchas

- **Long requests get killed.** If an endpoint legitimately takes longer than 30 seconds, the worker is killed and the client sees a 502 from Nginx. Raise `timeout`, or better, move the work to a background job queue.
- **Code changes need a reload.** Gunicorn doesn't watch files by default. Use `--reload` in development, and send `HUP` to the master process (or restart the systemd service) after deploying.
- **Run it under a process manager.** In production, start Gunicorn from systemd, Docker or similar so it comes back after a crash or reboot.
- **Async frameworks need a different worker.** The default workers speak WSGI. For an ASGI app (FastAPI, Starlette), recent Gunicorn releases include a native ASGI worker: `gunicorn main:app --worker-class asgi`. It was added as a beta in 24.0 and marked stable in 25.1; on older versions, use Uvicorn instead.

## Further reading

- [Gunicorn settings reference](https://gunicorn.org/reference/settings/)
- [Deploying Gunicorn (Nginx, systemd)](https://gunicorn.org/deploy/)
- [Gunicorn design: worker types and how many workers](https://gunicorn.org/design/)
- [Gunicorn ASGI worker](https://gunicorn.org/asgi/)
