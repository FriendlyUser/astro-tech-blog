---
title: "Using Redis from Python with redis-py: data types, expiry and pub/sub"
pubDate: "2024-08-19T21:25:57.000Z"
lastUpdated: 2026-11-14
description: "Connect to Redis from Python with redis-py and work with strings, hashes, lists, sets, sorted sets, key expiry and pub/sub messaging."
tags: ["python"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3382720876.webp
---

Redis is an in-memory key-value store whose values can be strings, hashes, lists, sets, sorted sets and more. It's commonly used as a cache, a session store, a rate limiter or a lightweight message broker. This post walks through the official Python client, `redis-py`, against a local Redis server.

## Setup

Install a Redis server by following the [official install guide](https://redis.io/docs/latest/operate/oss_and_stack/install/) for your OS (or run it in a container), then start it:

```bash
redis-server
```

Install the client. `redis-py` 8.x requires Python 3.10 or newer:

```bash
pip install redis
```

## Connecting

```python
import redis

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
r.ping()  # True if the server is reachable
```

`host` and `port` locate the server, and `db` selects one of the numbered logical databases (0 by default). By default `redis-py` returns `bytes`; `decode_responses=True` decodes replies to `str`, which is what you usually want for text data. The examples below assume it's set.

## Strings and expiry

Strings are the basic type and are binary-safe, so they can hold text, serialised JSON or raw bytes.

```python
r.set("name", "John Doe")
print(r.get("name"))  # 'John Doe'

# Counters: INCR is atomic, so concurrent clients won't lose updates
r.set("counter", 1)
r.incr("counter")
print(r.get("counter"))  # '2' (values come back as strings)

# Cache entry that expires after 60 seconds
r.set("session:abc", "user-1", ex=60)
print(r.ttl("session:abc"))  # 60 (seconds remaining)
```

Setting an expiry with `ex=` (seconds) or `px=` (milliseconds) is how you use Redis as a cache: the key disappears on its own once it's stale.

## Hashes

A hash maps string fields to string values under one key, which suits small objects:

```python
r.hset("user:1", mapping={"name": "Jane Doe", "email": "jane.doe@example.com"})

print(r.hget("user:1", "name"))  # 'Jane Doe'
print(r.hgetall("user:1"))       # {'name': 'Jane Doe', 'email': 'jane.doe@example.com'}
```

## Lists

Lists keep insertion order. Push and pop from either end to use them as a queue or a stack:

```python
r.lpush("fruits", "apple", "banana", "orange")

print(r.llen("fruits"))            # 3
print(r.lrange("fruits", 0, -1))   # ['orange', 'banana', 'apple']
```

`LPUSH` inserts each value at the head in turn, which is why the last value pushed comes first.

## Sets

Sets are unordered collections of unique strings:

```python
r.sadd("colors", "red", "green", "blue")

print(r.sismember("colors", "red"))  # 1 (0 if not a member)
print(r.smembers("colors"))          # {'red', 'green', 'blue'} in no particular order
```

## Sorted sets

Each member of a sorted set has a numeric score, and members are kept ordered by score. Leaderboards are the classic use:

```python
r.zadd("scores", {"Alice": 100, "Bob": 200, "Charlie": 150})

print(r.zrank("scores", "Alice"))  # 0 (lowest score ranks first)

# Members with scores between 100 and 200, inclusive
print(r.zrange("scores", 100, 200, byscore=True))  # ['Alice', 'Charlie', 'Bob']
```

Older code uses `zrangebyscore()`; Redis 6.2 folded that command into `ZRANGE ... BYSCORE`, which is what `byscore=True` sends.

## Pub/sub

Clients can subscribe to channels and receive anything published to them. Run the subscriber first:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
pubsub = r.pubsub()
pubsub.subscribe("news")

for message in pubsub.listen():
    # The first message is the subscribe confirmation, so filter on type
    if message["type"] == "message":
        print(f"Received: {message['data']}")
```

Then publish from another process:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
r.publish("news", "Breaking news: Redis is up")  # returns the number of subscribers that got it
```

## Gotchas

- Pub/sub is fire-and-forget. A message published while no one is subscribed is lost, and a subscriber that disconnects misses everything sent in the meantime. If you need delivery guarantees or replay, use [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/) instead.
- Everything lives in memory. Set a `maxmemory` limit and an eviction policy when using Redis as a cache, and configure persistence (RDB/AOF) if you can't afford to lose the data on restart.
- Forgetting `decode_responses=True` is the usual reason you see `b'...'` values.

## Further reading

- [redis-py documentation](https://redis.readthedocs.io/en/stable/)
- [Redis Python client guide](https://redis.io/docs/latest/develop/clients/redis-py/)
