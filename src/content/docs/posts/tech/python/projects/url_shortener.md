---
tags: ['python', 'urls']
title: Build a simple URL shortener in Python with Flask and SQLite
description: A single-file Flask app that turns long URLs into six-character codes, stores them in SQLite, and redirects visitors to the original address.
pubDate: Fri, 14 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2851628136.webp
---

A URL shortener maps a short code to a long URL. When someone visits `/<code>`, the server looks up the code and sends back an HTTP redirect to the original address. That lookup is the whole idea. Hosted services add click analytics, custom domains and abuse filtering on top.

Two downsides are worth knowing. Short links hide the real destination, so they are a common way to disguise phishing links. And if the service shuts down, every link it created stops working.

This post builds a minimal version with Flask and SQLite in one file.

## Install

Only Flask needs installing. `sqlite3` is part of Python's standard library, so there is no `pip install sqlite3`.

```bash
pip install flask
```

## The app

Save this as `app.py`. The HTML is inline with `render_template_string`, so you don't need a `templates/` folder.

```python
import secrets
import sqlite3
import string

from flask import Flask, abort, redirect, render_template_string, request, url_for

app = Flask(__name__)
DB = "url_shortener.db"
ALPHABET = string.ascii_letters + string.digits

FORM = """
<form method="post" action="{{ url_for('shorten_url') }}">
  <input name="url" type="url" placeholder="https://example.com/a/long/path" required>
  <button>Shorten</button>
</form>
{% if short_url %}<p>Short URL: <a href="{{ short_url }}">{{ short_url }}</a></p>{% endif %}
"""


def get_db():
    conn = sqlite3.connect(DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS urls (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            original_url TEXT NOT NULL UNIQUE,
            code         TEXT NOT NULL UNIQUE
        )
    """)
    return conn


def generate_code(length=6):
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


@app.route("/")
def home():
    return render_template_string(FORM, short_url=None)


@app.route("/shorten", methods=["POST"])
def shorten_url():
    original_url = request.form["url"].strip()
    # Only allow web URLs, so the redirect can't be pointed at javascript: or similar
    if not original_url.startswith(("http://", "https://")):
        abort(400, "URL must start with http:// or https://")

    with get_db() as conn:
        row = conn.execute(
            "SELECT code FROM urls WHERE original_url = ?", (original_url,)
        ).fetchone()
        if row:
            code = row[0]
        else:
            # Retry if the random code is already taken (unlikely, but possible)
            while True:
                code = generate_code()
                try:
                    conn.execute(
                        "INSERT INTO urls (original_url, code) VALUES (?, ?)",
                        (original_url, code),
                    )
                    break
                except sqlite3.IntegrityError:
                    continue

    short_url = url_for("redirect_url", code=code, _external=True)
    return render_template_string(FORM, short_url=short_url)


@app.route("/<code>")
def redirect_url(code):
    with get_db() as conn:
        row = conn.execute(
            "SELECT original_url FROM urls WHERE code = ?", (code,)
        ).fetchone()
    if row is None:
        abort(404)
    return redirect(row[0])


if __name__ == "__main__":
    app.run(debug=True)
```

The app has three routes:

- `/` shows a form for the long URL.
- `/shorten` (POST) returns the existing code if the URL has been shortened before. Otherwise it generates a new random six-character code and stores it.
- `/<code>` looks the code up and redirects, or returns 404.

`with get_db() as conn:` commits the transaction when the block exits without an error. It does not close the connection, which is acceptable for a demo. A real app would open one connection per request and close it in `teardown_appcontext`, as the [Flask SQLite pattern](https://flask.palletsprojects.com/en/stable/patterns/sqlite3/) shows.

The `UNIQUE` constraint on `original_url` makes the duplicate check safe at the database level too. There are 62⁶ (about 57 billion) six-character codes, so collisions are rare. The retry loop still handles them.

## Run it

```bash
python app.py
```

Flask's development server listens on `http://127.0.0.1:5000` by default. `flask --app app run --debug` also works. Don't use `debug=True` or the development server in production. Run the app under a WSGI server such as Gunicorn or Waitress.

## Gaps before using this for real

- `redirect()` returns a 302 by default. Use `redirect(url, code=301)` if you want browsers and search engines to treat the short link as permanent. Browsers cache a 301, so later click counts will be lower.
- Codes are random, so anyone can create unlimited links. Add rate limiting and, ideally, check submitted URLs against a blocklist.
- There's no click counting. Add a `clicks` column and increment it in `redirect_url` if you want basic stats.
