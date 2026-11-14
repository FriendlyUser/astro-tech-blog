---
tags: ['python', 'introtopython', 'flask', 'docker']
title: "Chapter 9: Web development with Python and Flask"
description: Chapter 9 of my intro to Python book covers HTTP, HTML, CSS and JavaScript basics, Python web frameworks, a small Flask app with a form, and running it in Docker.
pubDate: Fri, 30 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1938616315.png

---
This chapter covers the basics you need before writing a web app in Python: how browsers and servers talk to each other, what HTML, CSS and JavaScript each do, which Python frameworks exist, and how to build, run and containerise a small Flask app.

## How the web works

### Client and server

When you visit a website, your browser is the **client** and the machine hosting the site is the **server**. The client sends a request, the server sends back a response, and the browser renders it. A single page usually takes many requests: one for the HTML, then more for the stylesheets, scripts and images it references.

### HTTP

Requests and responses use HTTP (Hypertext Transfer Protocol). A request contains:

- a **method**: `GET` to fetch something, `POST` to submit data, `PUT`/`PATCH` to update, `DELETE` to remove
- a **path** to the resource, such as `/` or `/images/logo.png`
- **headers** (cookies, accepted content types, and so on) and, for methods like `POST`, a **body**

The response has a **status code** (`200 OK`, `302 Found` for a redirect, `404 Not Found`, `500 Internal Server Error`), headers, and usually a body with the HTML, JSON or file that was asked for.

## HTML, CSS and JavaScript

### HTML

HTML describes the structure and content of a page using tags such as headings, paragraphs, images and links:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1>Welcome to My Website</h1>
    <p id="greeting">This is a paragraph.</p>
    <img src="myimage.png" alt="My Image">
    <a href="https://www.example.com/">Click here to visit Example.com</a>
    <button id="greet-button">Say hi</button>
    <script src="script.js"></script>
  </body>
</html>
```

### CSS

CSS controls how the HTML looks: layout, colours, fonts and spacing. This `style.css` styles the page above:

```css
body {
  background-color: #f5f5f5;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  font-size: 32px;
  margin-top: 20px;
}

p {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 20px;
}

img {
  width: 100%;
  max-width: 600px;
  height: auto;
  display: block;
  margin: 0 auto;
}

a {
  color: #0070c0;
  text-decoration: none;
}
```

### JavaScript

JavaScript runs in the browser and makes the page interactive: it can respond to clicks, change the HTML and CSS, and fetch data from a server without reloading the page. This `script.js` changes the paragraph text when the button is clicked:

```js
const button = document.getElementById("greet-button");
const greeting = document.getElementById("greeting");

button.addEventListener("click", () => {
  greeting.textContent = "Hi there! You clicked the button.";
});
```

As a Python developer you mostly write the server side, but you will still produce HTML (usually through templates) and often a bit of CSS and JavaScript.

## Python web frameworks

A web framework handles the repetitive parts of a web app: mapping URLs to functions (routing), parsing requests, rendering templates, and often database access and authentication. The main options:

- **Flask** is a small framework. It gives you routing, request handling, Jinja templates and a test client, and leaves the rest (database, forms, auth) to extensions you choose. It is a good place to start and is what the rest of this chapter uses.
- **Django** is "batteries included": it ships with an ORM, migrations, templates, forms, authentication and an auto-generated admin interface. It suits larger apps where you want those decisions made for you.
- **FastAPI** is built for JSON APIs. You declare request and response types with Python type hints, and it validates input and generates OpenAPI docs from them.
- **Pyramid** is a flexible framework that lets an app start small and grow. It doesn't bundle a template engine; you add one through packages such as `pyramid_jinja2` or `pyramid_chameleon`.
- **Bottle** is a micro-framework distributed as a single file with no dependencies outside the standard library. It includes its own simple template engine.
- **CherryPy** is a minimalist, object-oriented framework that ships with its own multi-threaded HTTP server, so it can run without a separate WSGI server.

## Building a small Flask app

The app below shows a page with a form, accepts the submitted name via `POST`, and renders a greeting.

### Step 1: Install Flask

Create a virtual environment and install Flask into it:

```bash
python -m venv .venv
source .venv/bin/activate   # on Windows: .venv\Scripts\activate
pip install Flask
```

### Step 2: Create the app

Create `app.py`:

```python
from flask import Flask, render_template, request

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/hello", methods=["POST"])
def hello():
    name = request.form["name"]
    return render_template("hello.html", name=name)
```

`@app.route` maps a URL to a function. The `/hello` route only accepts `POST`, and `request.form` holds the submitted form fields.

### Step 3: Add templates

Flask looks for templates in a folder called `templates` next to `app.py`. Create `templates/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Hello, World!</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <form method="POST" action="{{ url_for('hello') }}">
      <label for="name">Enter your name:</label>
      <input type="text" id="name" name="name" required>
      <button type="submit">Say Hello</button>
    </form>
  </body>
</html>
```

`{{ url_for('hello') }}` is Jinja syntax: Flask fills in the URL of the `hello` function (`/hello`), so the form keeps working if you change the route later.

Then create `templates/hello.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Hello, {{ name }}!</title>
  </head>
  <body>
    <h1>Hello, {{ name }}!</h1>
    <a href="{{ url_for('index') }}">Back</a>
  </body>
</html>
```

Jinja escapes `{{ name }}` automatically, so a user who types HTML into the form can't inject it into the page.

### Step 4: Run it

```bash
flask --app app run --debug
```

Open `http://127.0.0.1:5000/`, type a name and submit the form. `--debug` reloads the server when you edit code and shows an interactive debugger on errors; never enable it on a public server. (Older tutorials set the `FLASK_APP` environment variable instead of passing `--app`; that still works, and if your file is called `app.py` plain `flask run` finds it on its own.)

## Serving static files with `http.server`

Python's standard library includes a basic HTTP server. It serves the files in a directory as-is: handy for previewing a plain HTML/CSS/JS site like the one at the start of this chapter. It cannot run a Flask or Django app.

```bash
cd mysite
python -m http.server
```

The server listens on port 8000 by default. Pass a different port as an argument, and use `--directory` to serve a folder without `cd`-ing into it:

```bash
python -m http.server 8080 --directory mysite
```

Open `http://localhost:8000` (or your chosen port). If the directory has an `index.html`, it is served at `/`; otherwise you get a directory listing. A file at `images/image.jpg` is available at `http://localhost:8000/images/image.jpg`.

By default it listens on all network interfaces, so other machines on your network can reach it. Add `--bind 127.0.0.1` to keep it local. The Python docs say outright that `http.server` is not meant for production; only use it for local testing.

## Packaging the Flask app with Docker

Docker packages an app together with its Python version and dependencies into an **image**. Running the image gives you a **container**, which behaves the same on your laptop, a CI runner or a cloud server.

For production, run Flask behind a WSGI server such as Gunicorn rather than `flask run`, which is a development server. Create `requirements.txt`:

```text
Flask
gunicorn
```

Pin exact versions (`pip freeze > requirements.txt`) once the app works, so rebuilds are reproducible.

Then add a `Dockerfile` next to `app.py`:

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install dependencies first so Docker can cache this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Then copy the app code
COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

Copying `requirements.txt` before the rest of the code means editing `app.py` doesn't force Docker to reinstall every package. `app:app` tells Gunicorn to load the `app` object from `app.py`, and binding to `0.0.0.0` makes it reachable from outside the container.

Build and run it:

```bash
docker build -t my-web-app .
docker run -p 8000:8000 my-web-app
```

The app is now at `http://localhost:8000`. Add a `.dockerignore` containing `.venv` and `__pycache__` so your local virtual environment isn't copied into the image.

## Deploying

Once the app is in a container, most hosting platforms can run it: you push the image (or your Git repository) and the platform builds it, gives it a URL, and lets you set environment variables and scale the number of instances. The details differ per provider, so follow their Python or container quickstart. Note that Heroku, which older tutorials often recommend, ended its free plans in November 2022.

## Further reading

- [Flask quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)
- [Deploying Flask to production](https://flask.palletsprojects.com/en/stable/deploying/)
- [`http.server` docs](https://docs.python.org/3/library/http.server.html)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [MDN: Learn web development](https://developer.mozilla.org/en-US/docs/Learn_web_development)
