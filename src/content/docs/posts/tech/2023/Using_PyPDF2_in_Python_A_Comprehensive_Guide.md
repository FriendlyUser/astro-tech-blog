---
description: Read, extract text from, merge, watermark and encrypt PDFs in Python. PyPDF2 is now pypdf, so the examples use the current pypdf API.
imgSrc: /imgs/2023/pokedex_types.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-24T12:44:35.000Z'
lastUpdated: 2026-11-14
tags: ["python", "pypdf2"]
title: "PyPDF2 (now pypdf): reading, merging and watermarking PDFs in Python"
---

:::caution[PyPDF2 is deprecated; use pypdf]
PyPDF2 3.0.x was the last PyPDF2 release. Development moved back to the original package name, [`pypdf`](https://pypi.org/project/pypdf/), maintained by the same [py-pdf](https://github.com/py-pdf/pypdf) team. The old camelCase API from earlier versions of this post (`PdfFileReader`, `PdfFileMerger`, `numPages`, `getPage()`, `extractText()`) was removed in PyPDF2 3.0.0 and raises `DeprecationError`. The examples below use pypdf and were run against pypdf 7.1.0.
:::

PyPDF2, and now pypdf, is a pure-Python library for working with existing PDF files: reading pages and metadata, extracting text, splitting and merging documents, overlaying one page on another, rotating and cropping, and encrypting. It doesn't need any compiled dependencies for the basics, which makes it easy to drop into a script. It isn't a tool for laying out new PDFs from scratch; use something like ReportLab for that.

## Installation

```bash
pip install pypdf
```

AES encryption and decryption need the `cryptography` package, which you can pull in with the `crypto` extra:

```bash
pip install "pypdf[crypto]"
```

## Reading a PDF

`PdfReader` accepts a path or a binary file object. Pages are exposed as a list-like `reader.pages`:

```python
from pypdf import PdfReader

reader = PdfReader("example.pdf")
print(f"Number of pages: {len(reader.pages)}")
print(reader.metadata)
```

`reader.metadata` is a dictionary-like object with entries such as `/Title`, `/Author` and `/Producer`, or `None` if the file has no document info.

## Extracting text

```python
from pypdf import PdfReader

reader = PdfReader("example.pdf")
text = "\n".join(page.extract_text() for page in reader.pages)
print(text)
```

`extract_text()` reads the text operators in the page content stream. It works well on PDFs generated from Word, LaTeX or a browser, but returns little or nothing for scanned documents, because those pages are just images. For those you need OCR, for example [Tesseract](https://tesseract-ocr.github.io/). If you need finer control over layout, [pdfminer.six](https://pdfminersix.readthedocs.io/en/latest/) exposes character positions.

## Merging PDFs

`PdfMerger` was removed from pypdf; `PdfWriter.append()` does the same job:

```python
from pypdf import PdfWriter

writer = PdfWriter()
for path in ["example1.pdf", "example2.pdf"]:
    writer.append(path)

writer.write("merged.pdf")
```

`append()` also takes a `pages` argument, so `writer.append("example.pdf", pages=[0, 2])` copies only the first and third pages. That is also the easiest way to split a document.

## Adding a watermark

Create a one-page PDF with the watermark (text, logo, "DRAFT" stamp), then merge it onto each page:

```python
from pypdf import PdfReader, PdfWriter

watermark_page = PdfReader("watermark.pdf").pages[0]

writer = PdfWriter(clone_from="example.pdf")
for page in writer.pages:
    page.merge_page(watermark_page, over=True)

writer.write("watermarked.pdf")
```

`over=True` draws the watermark on top of the page content. Use `over=False` to put it underneath, which works better for a background image but is hidden by pages with an opaque white background.

## Encrypting and rotating

```python
from pypdf import PdfWriter

writer = PdfWriter(clone_from="example.pdf")
writer.pages[0].rotate(90)  # must be a multiple of 90
writer.encrypt("secret-password", algorithm="AES-256")
writer.write("encrypted.pdf")
```

To open it again, call `reader.decrypt("secret-password")` after creating the `PdfReader`.

## Migrating old PyPDF2 code

If you have scripts written against the pre-3.0 API, these are the renames you'll hit most:

| Old PyPDF2 1.x name | pypdf |
| --- | --- |
| `PdfFileReader(file)` | `PdfReader(file)` |
| `reader.numPages` | `len(reader.pages)` |
| `reader.getPage(i)` | `reader.pages[i]` |
| `page.extractText()` | `page.extract_text()` |
| `PdfFileWriter()` | `PdfWriter()` |
| `writer.addPage(page)` | `writer.add_page(page)` |
| `PdfFileMerger().append(f)` | `PdfWriter().append(f)` |
| `page.mergePage(other)` | `page.merge_page(other)` |

After that, changing `import PyPDF2` to `from pypdf import ...` is usually all that's left.

## Further reading

- [pypdf documentation](https://pypdf.readthedocs.io/en/stable/)
- [pypdf migration guide from 1.x](https://pypdf.readthedocs.io/en/stable/meta/migration-1-to-2.html)
- [pypdf on GitHub](https://github.com/py-pdf/pypdf)
