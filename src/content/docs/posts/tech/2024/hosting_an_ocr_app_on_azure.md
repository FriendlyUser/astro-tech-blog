---
title: "Running OCRmyPDF in a containerized Azure Function"
pubDate: "2024-03-15T19:17:25.000Z"
lastUpdated: 2026-11-14
description: "Package OCRmyPDF, Tesseract and Ghostscript into a custom Azure Functions container and expose an HTTP endpoint that OCRs an uploaded PDF and returns its text."
tags: ["Azure", "Docker", "OCR", "Python", "Serverless", "Azure Functions", "Cloud Computing", "Web Development", "Containerization", "OCRmypdf"]
layout: "@/templates/BasePost.astro"
imgSrc: "https://unsplash.com/photos/a-person-on-a-snowboard-in-front-of-a-colorful-wall-d391zwqXkRI"
---

[OCRmyPDF](https://ocrmypdf.readthedocs.io/) adds a searchable text layer to scanned PDFs. It's a Python package, but it shells out to Tesseract (for the OCR itself) and optionally Ghostscript, so you can't deploy it as a plain code-only Azure Function: the Functions host image doesn't have those programs. The fix is a custom container built on Microsoft's Functions base image with the extra system packages installed.

This post covers the Dockerfile, an HTTP-triggered function that accepts a PDF and returns its text, and deployment.

## Project layout

A Python function app using the v2 programming model looks like this:

```text
.
├── Dockerfile
├── function_app.py
├── host.json
└── requirements.txt
```

`func init --worker-runtime python --docker` (from Azure Functions Core Tools) generates all of these. The entry file must be called `function_app.py`; the Python worker looks for that name by default.

`requirements.txt`:

```text
azure-functions
ocrmypdf
pdfminer.six
```

## Dockerfile

```dockerfile
FROM mcr.microsoft.com/azure-functions/python:4-python3.12

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

# Tesseract, Ghostscript and the other programs OCRmyPDF calls
RUN apt-get update && \
    apt-get install -y --no-install-recommends ocrmypdf && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /
RUN pip install --no-cache-dir -r /requirements.txt

COPY . /home/site/wwwroot
```

A few notes on why it looks like this:

- **The base image.** `mcr.microsoft.com/azure-functions/python:4-python3.12` contains the Functions host and Python worker. Keep the `4-pythonX.Y` tag rather than pinning a minor runtime version, and rebuild regularly: Microsoft publishes base image updates monthly and expects custom containers to stay current.
- **Installing `ocrmypdf` from apt and pip.** The Debian package is the easy way to pull in Tesseract, Ghostscript and the other external tools. The Debian 12 package is an old OCRmyPDF (14.x), so `pip install` puts the current release on top for the Python side. This is the approach OCRmyPDF's own installation docs suggest. Current OCRmyPDF needs Python 3.11 or newer.
- **No Ghostscript build from source.** The first version of this Dockerfile used the `4-python3.11` image and compiled Ghostscript 9.56.1 from source. That image is based on Debian 11, whose Ghostscript (9.53.3) is older than the 9.54 OCRmyPDF requires, which is what the source build worked around. The `4-python3.12` image is Debian 12, which ships Ghostscript 10.0.0, so the apt package is enough. It also drops `build-essential` and a slow compile from every image build.
- **`AzureWebJobsScriptRoot`** tells the Functions host where the app lives, and the logging variable sends host logs to the container's console. Both come from Microsoft's template Dockerfile.

## The function

```python
import logging
import tempfile
from pathlib import Path

import azure.functions as func
import ocrmypdf
from pdfminer.high_level import extract_text

app = func.FunctionApp()


@app.route(route="ScanPdf", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def scan_pdf(req: func.HttpRequest) -> func.HttpResponse:
    upload = req.files.get("file")
    if upload is None:
        return func.HttpResponse(
            "Send the PDF as a multipart form field named 'file'.", status_code=400
        )

    with tempfile.TemporaryDirectory() as tmp:
        input_pdf = Path(tmp) / "input.pdf"
        output_pdf = Path(tmp) / "output.pdf"
        upload.save(str(input_pdf))

        try:
            # skip_text: pages that already have a text layer are passed through
            # instead of failing the whole job with PriorOcrFoundError.
            ocrmypdf.ocr(input_pdf, output_pdf, deskew=True, skip_text=True)
        except Exception:
            logging.exception("OCR failed")
            return func.HttpResponse("Failed to process the PDF file.", status_code=500)

        text = extract_text(output_pdf)

    return func.HttpResponse(text, mimetype="text/plain", status_code=200)
```

What it does:

- `req.files` holds multipart uploads; each entry is a Werkzeug `FileStorage`, which can save itself to disk.
- `TemporaryDirectory` gives OCRmyPDF real file paths and deletes both PDFs when the block exits. Writing to a `NamedTemporaryFile` and passing its name to OCRmyPDF without flushing, as an earlier version of this code did, can hand OCRmyPDF a partly written file and leaves temp files behind.
- `extract_text` from pdfminer.six reads the text layer from the output, which includes both the new OCR text and any text the pages already had. OCRmyPDF's `sidecar` option writes a text file directly, but it only contains text OCRmyPDF produced, so pages skipped by `skip_text` would be missing.

## Build and deploy

Build and test locally first. The Functions host listens on port 80 in the container, and HTTP routes get an `/api` prefix:

```bash
docker build -t ocr-function-app:v1 .
docker run -p 8080:80 ocr-function-app:v1
curl -F "file=@scan.pdf" http://localhost:8080/api/ScanPdf
```

Then push the image to a registry, for example Azure Container Registry:

```bash
az acr login --name <registry-name>
docker tag ocr-function-app:v1 <registry-name>.azurecr.io/ocr-function-app:v1
docker push <registry-name>.azurecr.io/ocr-function-app:v1
```

Containerized function apps can't run on the Consumption or Flex Consumption plans. Microsoft's recommended host for them is Azure Container Apps; the Functions Premium and Dedicated (App Service) plans also run Linux containers. Follow [Create your first containerized functions on Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/functions-usage) or [Create your first containerized Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-deploy-container) for the plan you choose.

## Gotchas

- **Size the compute for the PDFs you expect.** OCR is CPU- and memory-heavy, and larger files need more. For my work, 2 cores and 4 GiB has been enough.
- **HTTP requests time out at 230 seconds** no matter what `functionTimeout` is set to. A long scanned document can exceed that. For big files, accept the upload, queue the work (Blob or Queue trigger, or Durable Functions) and let the client fetch the result later.
- **Anonymous auth means anyone with the URL can use your compute.** Switch to `func.AuthLevel.FUNCTION` and send the function key in the `x-functions-key` header, or put the app behind authentication.
- **OCR language.** Tesseract defaults to English. For other languages, install the matching `tesseract-ocr-<lang>` apt package and pass `language=["deu"]` (for example) to `ocrmypdf.ocr`.
