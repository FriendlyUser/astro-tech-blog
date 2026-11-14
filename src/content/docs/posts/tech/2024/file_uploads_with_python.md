---
title: "Handling file uploads in FastAPI, Django and Flask"
pubDate: "2024-03-20T19:17:25.000Z"
lastUpdated: 2026-11-14
description: "Minimal, working file upload endpoints in FastAPI, Django and Flask: what to install, how to save the file safely, and how to cap upload size."
tags: ["FastAPI", "Django", "Flask", "Python", "Web Development", "File Uploads", "Backend Development", "Programming", "Software Development"]
layout: "@/templates/BasePost.astro"
imgSrc: "https://unsplash.com/photos/a-room-with-purple-walls-and-a-green-couch-7bVA09G6Whs"
---

All three frameworks receive uploads the same way underneath: the browser sends a `multipart/form-data` request, and the framework parses the file part into an object you can read or save. The differences are in what you need to install and how each one hands you the file. Each example below saves the upload to an `uploads/` directory.

Two rules apply to all of them:

- **Never trust the client's filename.** It can contain `../` or absolute paths. Strip it to a safe base name (`secure_filename` in Flask, `Path(name).name` elsewhere), or better, generate your own name.
- **Cap the upload size.** Otherwise anyone can fill your disk or memory.

## FastAPI

FastAPI needs the `python-multipart` package to parse form data. The `standard` extra includes it, along with Uvicorn and the `fastapi` CLI:

```bash
pip install "fastapi[standard]"
```

```python
# main.py
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()


@app.post("/uploadfile/")
def create_upload_file(file: UploadFile):
    filename = Path(file.filename or "upload").name
    with open(UPLOAD_DIR / filename, "wb") as out:
        shutil.copyfileobj(file.file, out)
    return {"filename": filename, "content_type": file.content_type}
```

Run it with:

```bash
fastapi dev main.py
```

Then test with `curl -F "file=@report.pdf" http://127.0.0.1:8000/uploadfile/`, or use the interactive docs at `/docs`.

`UploadFile` has no `save()` method. It wraps a `SpooledTemporaryFile` (kept in memory up to a size limit, then spilled to disk), exposed as `file.file`. It also has async `read()`, `write()`, `seek()` and `close()` methods. The endpoint above is a plain `def`, so FastAPI runs it in a thread pool and the blocking `copyfileobj` doesn't stall the event loop. If you write an `async def` endpoint, use `await file.read()` instead, or move the copy into a thread.

FastAPI has no built-in upload size limit. Enforce one at the reverse proxy (for example, Nginx's `client_max_body_size`) or check the size as you read.

## Django

```bash
pip install django
```

Define a form:

```python
# forms.py
from django import forms


class UploadFileForm(forms.Form):
    file = forms.FileField()
```

Handle it in a view. `request.FILES` is only populated for `POST` requests whose form has `enctype="multipart/form-data"`:

```python
# views.py
from pathlib import Path

from django.http import HttpResponseRedirect
from django.shortcuts import render

from .forms import UploadFileForm

UPLOAD_DIR = Path("uploads")


def handle_uploaded_file(f):
    UPLOAD_DIR.mkdir(exist_ok=True)
    with open(UPLOAD_DIR / Path(f.name).name, "wb") as destination:
        for chunk in f.chunks():
            destination.write(chunk)


def upload_file(request):
    if request.method == "POST":
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            handle_uploaded_file(request.FILES["file"])
            return HttpResponseRedirect("/success/url/")
    else:
        form = UploadFileForm()
    return render(request, "upload.html", {"form": form})
```

The template needs the right `enctype`, or `request.FILES` will be empty:

```html
<!-- templates/upload.html -->
<form method="post" enctype="multipart/form-data">
  {% csrf_token %}
  {{ form }}
  <button type="submit">Upload</button>
</form>
```

Wire the view into `urls.py` as usual. Iterating over `f.chunks()` avoids loading a large file into memory at once. Django keeps small uploads in memory and streams larger ones to a temporary file, with the cutoff set by `FILE_UPLOAD_MAX_MEMORY_SIZE` (2.5 MB by default). That setting is not a size limit. Enforce a maximum in form validation or at the web server.

If you're storing files against a model, a `FileField` on the model plus a `ModelForm` handles saving and naming for you through the configured storage backend (`MEDIA_ROOT` by default).

## Flask

```bash
pip install flask
```

```python
# app.py
import os

from flask import Flask, request
from werkzeug.utils import secure_filename

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB; larger requests get a 413


@app.post("/upload")
def upload_file():
    file = request.files.get("file")
    if file is None or file.filename == "":
        return "No file uploaded", 400

    filename = secure_filename(file.filename)
    if not filename:
        return "Invalid filename", 400

    file.save(os.path.join(UPLOAD_DIR, filename))
    return "File uploaded", 201


if __name__ == "__main__":
    app.run(debug=True)
```

`request.files["file"]` is a Werkzeug `FileStorage`, which does have a `save()` method. `secure_filename` can return an empty string for names made entirely of unsafe characters, so check for that. With `MAX_CONTENT_LENGTH` set, reading `request.files` on an oversized request raises a 413 instead of buffering the whole body.

## Further reading

- [FastAPI: Request Files](https://fastapi.tiangolo.com/tutorial/request-files/)
- [Django: File Uploads](https://docs.djangoproject.com/en/stable/topics/http/file-uploads/)
- [Flask: Uploading Files](https://flask.palletsprojects.com/en/stable/patterns/fileuploads/)
