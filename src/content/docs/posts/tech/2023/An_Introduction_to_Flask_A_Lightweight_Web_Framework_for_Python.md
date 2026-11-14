---
description: 'Install Flask 3, write a small app with HTML and JSON routes, run it with the flask CLI, and see which extensions add databases, forms and logins.'
imgSrc: /imgs/2023/DALL·E 2022-12-25 21.48.12 - teddy bear on coach looking out the
  window at a tree.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-31T19:30:20.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: 'Getting started with Flask: routes, JSON and the dev server'
---

Flask is a small Python web framework. The core gives you URL routing, request and response objects, Jinja templates and a development server, and leaves databases, forms and authentication to extensions you pick yourself. That makes it a good fit for APIs, internal tools and small sites where Django's built-in ORM and admin would be more than you need.

Flask was written by Armin Ronacher and is maintained by the Pallets project. It is built on two other Pallets libraries: Werkzeug (the WSGI toolkit that handles requests, responses and routing) and Jinja (the template engine). The examples below were run with Flask 3.1, which needs Python 3.9 or newer.

## Installation

Install Flask into a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install Flask
```

This also pulls in Werkzeug, Jinja2, Click, ItsDangerous, MarkupSafe and Blinker.

## A first app

Save this as `app.py`:

```python
from flask import Flask

app = Flask(__name__)


@app.route("/")
def index():
    return "Hello, World!"
```

`Flask(__name__)` creates the application. Flask uses the module name to find templates and static files relative to your code. `@app.route("/")` maps the root URL to `index`, and whatever the view function returns becomes the response body.

Run it with the `flask` command:

```bash
flask --app app run --debug
```

```text
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

Open `http://127.0.0.1:5000/` and you get "Hello, World!". `--debug` turns on the auto-reloader and the interactive debugger, so code changes are picked up without a restart. If the file is called `app.py` or `wsgi.py`, you can leave out `--app`.

You can also add `if __name__ == "__main__": app.run(debug=True)` at the bottom and run `python app.py`. Both start the same development server.

## Route variables and JSON

Most Flask apps quickly grow a JSON API. Flask converts a returned `dict` or `list` to JSON, and you can return a `(body, status)` tuple to set the status code:

```python
from flask import Flask, abort, request

app = Flask(__name__)

BOOKS = {
    1: {"id": 1, "title": "Fluent Python"},
    2: {"id": 2, "title": "Architecture Patterns with Python"},
}


@app.route("/")
def index():
    return "Hello, World!"


@app.get("/books/<int:book_id>")
def get_book(book_id):
    book = BOOKS.get(book_id)
    if book is None:
        abort(404)
    return book  # dicts are serialised to JSON


@app.post("/books")
def create_book():
    data = request.get_json()
    if not data or "title" not in data:
        return {"error": "title is required"}, 400
    book_id = max(BOOKS) + 1
    BOOKS[book_id] = {"id": book_id, "title": data["title"]}
    return BOOKS[book_id], 201
```

A few things to note:

- `<int:book_id>` is a converter. Flask only matches the route when that part of the URL is an integer, and passes it to the view as an `int`. Other converters include `string` (the default), `float`, `path` and `uuid`.
- `@app.get` and `@app.post` are shortcuts for `@app.route(..., methods=["GET"])` and `methods=["POST"]`.
- `request.get_json()` returns a 415 Unsupported Media Type error if the request's `Content-Type` isn't `application/json`.

Try it with curl:

```bash
curl http://127.0.0.1:5000/books/1
curl -X POST http://127.0.0.1:5000/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Flask Web Development"}'
```

The `BOOKS` dict lives in process memory, so it resets on every restart and isn't shared between worker processes. Use a database for real data.

## Testing without a server

Flask's test client sends requests to the app directly, with no network involved. It works well with pytest:

```python
from app import app


def test_get_book():
    client = app.test_client()
    response = client.get("/books/1")
    assert response.status_code == 200
    assert response.json["title"] == "Fluent Python"


def test_missing_book():
    client = app.test_client()
    assert client.get("/books/99").status_code == 404
```

## Extensions

Flask doesn't include a database layer, form handling or user sessions beyond signed cookies. Common extensions fill those gaps:

- [Flask-SQLAlchemy](https://flask-sqlalchemy.readthedocs.io/): SQLAlchemy integration with per-request sessions.
- [Flask-WTF](https://flask-wtf.readthedocs.io/): WTForms integration with CSRF protection.
- [Flask-Login](https://flask-login.readthedocs.io/): login sessions and `@login_required`.

For a JSON API you often don't need an extension at all, because views can return dicts and lists directly. Flask-RESTful still exists, but it hasn't had a release since 2023.

## Before you deploy

- Don't use `flask run` or `app.run()` in production. Run the app under a WSGI server such as Gunicorn (`gunicorn app:app`) or Waitress on Windows, behind a reverse proxy.
- Never enable debug mode on a public server. The interactive debugger lets anyone who can trigger an error run Python code.
- Set a real `SECRET_KEY` from the environment if you use sessions or Flask-WTF.
- Once the app has more than a handful of routes, split it with [blueprints](https://flask.palletsprojects.com/en/stable/blueprints/) and an [application factory](https://flask.palletsprojects.com/en/stable/patterns/appfactories/).

## Further reading

- [Flask documentation](https://flask.palletsprojects.com/en/stable/), including the tutorial that builds a small blog
- [Flask quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)
- [Deploying to production](https://flask.palletsprojects.com/en/stable/deploying/)
