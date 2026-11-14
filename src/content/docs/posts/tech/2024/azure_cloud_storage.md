---
title: "Writing temporary files in Azure Functions with Python's tempfile"
description: "Why writes to your Azure Functions app folder fail, where you can write instead, and how to use Python's tempfile module to handle files safely in a function."
tags: ["tempfile", "File Storage", "Read-Only Environment", "Azure Function Apps", "Serverless Architecture", "Python"]
pubDate: "2024-03-23T19:17:25.000Z"
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3267094508_short_ruler_in_the_grass.png"
---

Many Python libraries want a file path rather than bytes: PDF parsers, `ffmpeg` wrappers, zip tools. In an Azure Function, writing that file next to your code usually fails with a read-only file system error. The fix is to write to the instance's temp directory, and the standard library's `tempfile` module does that for you.

## Why the app folder is read-only

Python functions only run on Linux in Azure Functions. When the app runs from a deployment package, the runtime mounts the zip as a read-only `/home/site/wwwroot`. That's the default on the Flex Consumption plan, and it's what the `WEBSITE_RUN_FROM_PACKAGE` setting turns on for the other plans. Anything that tries to write there, including libraries that cache files next to the code, raises `OSError: [Errno 30] Read-only file system`.

The instance's temporary storage is writable. On Linux that's `/tmp`, which is what `tempfile.gettempdir()` returns. A few things to know about it:

- It's local to one instance. Another instance, or the next invocation after a scale-in, won't see your files.
- It's small. At the time of writing, Microsoft's [service limits table](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale#service-limits) lists 0.8 GB of temporary storage for Flex Consumption and 11 GB or more for Premium.
- It's not cleaned up between invocations on a warm instance, so delete what you create.

If a file needs to outlive the invocation, put it in Blob Storage instead.

## Example: process an uploaded file

This HTTP-triggered function uses the Python v2 programming model. It writes the request body to a temporary directory, hands the path to code that needs a real file, and lets the context manager delete everything afterwards.

```python
import os
import tempfile

import azure.functions as func

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)


def count_lines(path: str) -> int:
    # Stand-in for a library that only accepts a file path.
    with open(path, "rb") as f:
        return sum(1 for _ in f)


@app.route(route="upload", methods=["POST"])
def upload(req: func.HttpRequest) -> func.HttpResponse:
    body = req.get_body()
    if not body:
        return func.HttpResponse("Empty request body", status_code=400)

    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "upload.bin")
        with open(path, "wb") as f:
            f.write(body)

        lines = count_lines(path)

    # tmpdir and everything in it is gone here
    return func.HttpResponse(f"{lines} lines")
```

The example uses `TemporaryDirectory` rather than `NamedTemporaryFile` on purpose. A directory lets you pick the file name and extension (some libraries look at the extension), lets a tool write extra output files next to the input, and is removed in one go. If you only need a single scratch file, this works too:

```python
import tempfile

with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp:
    tmp.write(data)
    tmp.flush()  # make sure the bytes are on disk before another reader opens tmp.name
    result = parse_pdf(tmp.name)
# the file is deleted when the with block exits
```

Here `data` and `parse_pdf` stand in for your own bytes and parser. Don't forget the `flush()`. Without it, a library that opens `tmp.name` may read an empty or partial file, because the data is still sitting in Python's buffer.

## What tempfile gives you

- Unique names, so concurrent invocations on the same instance don't overwrite each other's files.
- Files created with mode `0600` and directories with `0700`, so only the creating user can read them.
- Cleanup when the context manager exits, including when an exception is raised.
- A `dir=` argument if you need to put files somewhere other than the default temp directory.

## Gotchas

- Don't build paths with a hardcoded `/tmp/myfile`. Two invocations running at once on the same instance will collide. Let `tempfile` choose the name.
- Large uploads are buffered in memory by `req.get_body()` before you ever write them. HTTP requests to Functions are capped at 210 MB, and the Flex Consumption memory sizes start at 512 MB. For big files, have the client upload directly to Blob Storage and trigger on the blob.
- Code that runs fine locally can still fail after deployment, because your local project folder is writable. Test file writes in Azure, or point them at `tempfile.gettempdir()` from the start.

## Further reading

- [`tempfile` documentation](https://docs.python.org/3/library/tempfile.html)
- [Azure Functions Python developer guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
- [Run your functions from a package file](https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package)
