---
description: "Set up Celery with Redis, define and call tasks, add retries, route tasks to queues and set priorities, and monitor workers with the CLI and Flower."
imgSrc: "/imgs/2023/book-placed-into-bookshelf.webp"
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-24T00:20:26.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "Celery in Python: background tasks, retries, routing and monitoring"
---

Celery is a distributed task queue for Python. Your application sends a message describing a function call to a broker (usually Redis or RabbitMQ), and one or more worker processes pick it up and run it. Use it for work that shouldn't block a web request: sending email, resizing images, calling slow third-party APIs, or periodic jobs.

The examples were checked against Celery 5.7, which requires Python 3.10 or later.

## Setup

Install Celery with the Redis extras (plus `requests`, which the retry examples use). The extras install the `redis` Python client, but you still need a Redis server running:

```bash
pip install "celery[redis]" requests
docker run -d -p 6379:6379 redis
```

Create `tasks.py`:

```python
import requests
from celery import Celery

app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)


@app.task
def add(x, y):
    return x + y
```

The `broker` carries task messages. The `backend` stores return values. Without a backend you can still send tasks, but you can't read their results.

Start a worker from the same directory:

```bash
celery -A tasks worker --loglevel=INFO
```

Celery doesn't officially support Windows. If you're testing locally on Windows, add `--pool=solo`, because the default prefork pool doesn't work there.

For RabbitMQ, the broker URL looks like `amqp://guest:guest@localhost:5672//`.

## Calling tasks

`delay()` sends the task and returns an `AsyncResult` immediately:

```python
from tasks import add

result = add.delay(4, 4)
print(result.id)
print(result.get(timeout=10))  # blocks until the worker finishes: 8
```

`result.ready()` checks without blocking. `apply_async()` is the full form of `delay()` and takes options like `countdown`, `eta`, `queue` and `priority`:

```python
add.apply_async((4, 4), countdown=30)  # run no earlier than 30 seconds from now
```

## Retries

For transient errors, let Celery retry automatically:

```python
@app.task(
    autoretry_for=(requests.RequestException,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 5},
)
def fetch_url(url):
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.text
```

`retry_backoff=True` waits 1s, 2s, 4s and so on between attempts (with jitter), up to `retry_backoff_max` (600 seconds by default).

For more control, bind the task and call `self.retry()` yourself. `retry()` raises an exception to tell the worker to reschedule the task, so `raise` it:

```python
@app.task(bind=True, max_retries=5)
def fetch_url_manual(self, url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as exc:
        raise self.retry(exc=exc, countdown=60)
```

Tasks that may be retried, or redelivered after a worker crash, should be idempotent: running them twice must not do the work twice.

## Routing to queues

Send slow tasks to their own queue so they don't hold up quick ones. Configure the routing on the app:

```python
app.conf.task_routes = {
    "tasks.generate_report": {"queue": "reports"},
}


@app.task
def generate_report(report_id):
    ...
```

You can also choose a queue per call with `generate_report.apply_async((42,), queue="reports")`. Then start a worker that consumes that queue:

```bash
celery -A tasks worker --loglevel=INFO -Q reports
```

A worker started without `-Q` only consumes the default `celery` queue, so tasks routed to `reports` sit in Redis until a worker listens there.

## Priorities

Priorities exist, but they behave differently per broker:

- **RabbitMQ:** higher numbers run first. The queue must be declared with `x-max-priority`, for example via `app.conf.task_queue_max_priority = 10`.
- **Redis:** 0 is the highest priority and 9 the lowest. By default, the 10 levels collapse into 4 internal lists. Redis has no native priorities, so the ordering is approximate.

```python
add.apply_async((2, 2), priority=0)
```

In practice, separate queues with dedicated workers are usually more predictable than priorities.

## Monitoring

The `inspect` and `control` commands talk to running workers:

```bash
celery -A tasks inspect active       # tasks being executed now
celery -A tasks inspect reserved     # prefetched, waiting to run
celery -A tasks inspect scheduled    # tasks with an ETA/countdown
celery -A tasks call tasks.add -a '[2, 3]'
celery -A tasks control revoke <task_id>
celery -A tasks control pool_grow 2
```

[Flower](https://flower.readthedocs.io/) is a web dashboard for workers and tasks:

```bash
pip install flower
celery -A tasks flower
```

It listens on `http://localhost:5555` by default. Don't expose it publicly without authentication, because it can revoke tasks and shut down workers.

## Further reading

- [Celery: First steps](https://docs.celeryq.dev/en/stable/getting-started/first-steps-with-celery.html)
- [Tasks (retries, options)](https://docs.celeryq.dev/en/stable/userguide/tasks.html)
- [Routing tasks and priorities](https://docs.celeryq.dev/en/stable/userguide/routing.html)
- [Monitoring and management guide](https://docs.celeryq.dev/en/stable/userguide/monitoring.html)
