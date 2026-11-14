---
description: "Build a small Django app from scratch: create a project and app, define a model, run migrations, and render it with a view, URLs, a template and static files."
imgSrc: /imgs/2023/3750534419.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-31T19:03:01.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "Getting started with Django: models, views, URLs and templates"
---

Django is a batteries-included Python web framework. It ships an ORM, migrations, an admin site, authentication, forms and a template engine, so a CRUD-style site needs very few extra packages. Django calls its structure Model-View-Template (MVT). The "view" is the function that handles a request, and the "template" renders the HTML.

This walkthrough builds a page that lists blog posts. It was checked against Django 6.1, which requires Python 3.12 or later.

## Install

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install django
python -m django --version
```

## Create a project and an app

A **project** holds settings and the root URL configuration. An **app** is a package with models, views and templates for one feature. A project usually contains several apps.

```bash
django-admin startproject myproject
cd myproject
python manage.py startapp myapp
```

```text
myproject/
    manage.py
    myproject/
        __init__.py
        asgi.py
        settings.py
        urls.py
        wsgi.py
    myapp/
        __init__.py
        admin.py
        apps.py
        migrations/
            __init__.py
        models.py
        tests.py
        views.py
```

Django doesn't pick up the app until you add it to `INSTALLED_APPS`. Without that step, `makemigrations` doesn't see your models and the template loader doesn't find your templates:

```python
# myproject/settings.py
INSTALLED_APPS = [
    "myapp",
    "django.contrib.admin",
    # ...the rest of the defaults
]
```

## Model and migrations

```python
# myapp/models.py
from django.db import models


class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    pub_date = models.DateTimeField("date published")

    def __str__(self):
        return self.title
```

```bash
python manage.py makemigrations myapp
python manage.py migrate
```

`makemigrations` writes a migration file describing the change. `migrate` applies it, along with the built-in apps' migrations, to the database (SQLite by default).

To add posts without writing a form, register the model with the admin and create a superuser:

```python
# myapp/admin.py
from django.contrib import admin

from .models import Post

admin.site.register(Post)
```

```bash
python manage.py createsuperuser
```

## View and URLs

```python
# myapp/views.py
from django.shortcuts import render

from .models import Post


def index(request):
    posts = Post.objects.order_by("-pub_date")
    return render(request, "myapp/index.html", {"posts": posts})
```

Give the app its own URL configuration, then include it from the project's:

```python
# myapp/urls.py
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
]
```

```python
# myproject/urls.py
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("myapp/", include("myapp.urls")),
    path("admin/", admin.site.urls),
]
```

## Template and static files

With the default `APP_DIRS: True` setting, Django looks for templates in each installed app's `templates/` directory, and the static files app looks in each app's `static/` directory. Repeat the app name inside both directories (`templates/myapp/`, `static/myapp/`) so files from different apps with the same name don't collide.

```css
/* myapp/static/myapp/style.css */
h2 { color: navy; }
```

```html
<!-- myapp/templates/myapp/index.html -->
{% load static %}
<!DOCTYPE html>
<html>
<head>
  <title>Posts</title>
  <link rel="stylesheet" href="{% static 'myapp/style.css' %}">
</head>
<body>
  {% for post in posts %}
    <h2>{{ post.title }}</h2>
    <p>{{ post.content }}</p>
    <p>Published on {{ post.pub_date|date:"Y-m-d" }}</p>
  {% empty %}
    <p>No posts yet.</p>
  {% endfor %}
</body>
</html>
```

## Run it

```bash
python manage.py runserver
```

Add a post at `http://127.0.0.1:8000/admin/`, then open `http://127.0.0.1:8000/myapp/`.

## Gotchas

- `runserver` serves static files only while `DEBUG = True`. In production, run `collectstatic` and serve the files with your web server or a package like WhiteNoise.
- With `USE_TZ = True` (the default), assign timezone-aware datetimes (`django.utils.timezone.now()`), not `datetime.now()`.
- Django loads templates from apps in `INSTALLED_APPS` order, and the first match wins. Without the `myapp/` subdirectory, another app's `index.html` could shadow yours.

## Further reading

- [Official tutorial](https://docs.djangoproject.com/en/stable/intro/tutorial01/)
- [Models and databases](https://docs.djangoproject.com/en/stable/topics/db/models/)
- [Managing static files](https://docs.djangoproject.com/en/stable/howto/static-files/)
- [Deployment checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
