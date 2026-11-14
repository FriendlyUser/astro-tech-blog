---
title: "Exclude live-server tests by default with pytest markers and fixtures"
pubDate: "2024-03-30T00:00:00.000Z"
lastUpdated: 2026-11-14
description: "Tag tests that hit a live server with a custom pytest marker, skip them by default, and opt in with -m or an environment variable."
tags: ["Pytest", "Python", "Software Testing", "Live Server Testing", "Test Automation", "Fixtures", "Markers", "Test Exclusion", "testing"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1992331816.png"
---

Some tests talk to a real server: a staging API, a third-party sandbox, sometimes production. You don't want those running on every `pytest` call, because they're slow, need credentials, and put load on systems you don't own. pytest has two features that handle this cleanly:

- **Markers** tag tests (`@pytest.mark.live_server`) so you can select or deselect them with `-m`.
- **Fixtures** supply what a test needs (here, the server URL) and can skip the test when it isn't available.

## Register a custom marker

Declare the marker in `pytest.ini` so pytest knows about it. With `--strict-markers`, a typo such as `@pytest.mark.live_sever` becomes an error instead of a silently ignored tag.

```ini
[pytest]
markers =
    live_server: tests that call a real server (deselect with '-m "not live_server"')
addopts = --strict-markers -m "not live_server"
```

The `addopts` line is what makes the exclusion the default: every run behaves as if you typed `-m "not live_server"`.

## Tag the tests

```python
import pytest


@pytest.mark.live_server
def test_live_server_interaction():
    ...
```

To tag every test in a module, set `pytestmark = pytest.mark.live_server` at the top of the file.

## Choose what runs

```bash
pytest                    # everything except live_server tests (from addopts)
pytest -m live_server     # only the live_server tests
pytest -m ""              # everything
```

Options in `addopts` are inserted before the command-line arguments, and when `-m` is given twice the last one wins, so the `-m` you type overrides the default.

## Supply the server with a fixture

A marker decides *whether* a test is selected; a fixture can decide whether it can actually run. This fixture reads the server URL from the environment and skips the test if it's not set, so a stray `pytest -m live_server` on a laptop without credentials skips instead of failing:

```python
# conftest.py
import os

import pytest


@pytest.fixture
def live_server_url():
    url = os.environ.get("LIVE_SERVER_URL")
    if not url:
        pytest.skip("set LIVE_SERVER_URL to run live server tests")
    return url.rstrip("/")
```

```python
# test_health.py
import urllib.request

import pytest


@pytest.mark.live_server
def test_health_endpoint(live_server_url):
    with urllib.request.urlopen(f"{live_server_url}/health", timeout=10) as resp:
        assert resp.status == 200
```

```bash
LIVE_SERVER_URL=https://staging.example.com pytest -m live_server
```

## Alternative: an environment-variable switch instead of addopts

If you'd rather see live tests reported as *skipped* than have them silently deselected, drop `-m "not live_server"` from `addopts` and skip them in a collection hook unless a variable is set:

```python
# conftest.py
import os

import pytest


def pytest_collection_modifyitems(config, items):
    if os.environ.get("RUN_LIVE_SERVER_TESTS") == "1":
        return
    skip_live = pytest.mark.skip(reason="set RUN_LIVE_SERVER_TESTS=1 to run")
    for item in items:
        if item.get_closest_marker("live_server"):
            item.add_marker(skip_live)
```

```bash
RUN_LIVE_SERVER_TESTS=1 pytest   # runs everything, including live tests
```

Setting an environment variable on its own does nothing; something in `conftest.py` has to read it.

## Gotchas

- If you use pytest-django, it already provides a fixture called `live_server`. A marker of the same name doesn't clash with it, but pick a different fixture name (as above) to avoid confusion.
- Deselected tests appear only as a count in the summary line ("N deselected"). If you want them visible in CI output, use the skip approach.
- In CI, run the live suite as a separate job with its own credentials, so a flaky remote server doesn't block ordinary merges.

## Further reading

- [Working with custom markers](https://docs.pytest.org/en/stable/example/markers.html)
- [How to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- [Control skipping of tests according to command line option](https://docs.pytest.org/en/stable/example/simple.html#control-skipping-of-tests-according-to-command-line-option)
