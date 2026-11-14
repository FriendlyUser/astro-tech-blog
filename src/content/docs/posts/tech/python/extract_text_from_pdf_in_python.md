---
tags: ['python', 'pypdf2']
title: Extracting text from a PDF in Python with pypdf
description: A small command-line script that uses pypdf (the successor to PyPDF2) to write the text of every page in a PDF to a text file, including encrypted PDFs.
pubDate: Fri, 3 January 2025
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3702590653.png"
---

:::caution
This post originally used `PyPDF2`. PyPDF2 is deprecated and its development has moved back into [`pypdf`](https://pypi.org/project/pypdf/). The old API it used (`PdfFileReader`, `numPages`, `getPage`, `extractText`) was removed in PyPDF2 3.0 and now raises a `DeprecationError`. The script below uses `pypdf` instead.
:::

[pypdf](https://pypdf.readthedocs.io/) is a pure-Python library for reading and writing PDFs. It can pull out the text layer of a PDF, which is enough for most generated documents such as reports and statements. Install it with:

```bash
pip install pypdf
```

The script below was checked against pypdf 7.x. If you need to open AES-encrypted PDFs, also install `cryptography`.

## The script

```python
import sys

from pypdf import PdfReader
from pypdf.errors import DependencyError, PdfReadError


def extract_pdf_text(pdf_path: str, output_path: str, password: str = "") -> bool:
    try:
        reader = PdfReader(pdf_path)

        if reader.is_encrypted:
            # Many "encrypted" PDFs only have an owner password and an empty
            # user password, so decrypting with "" is worth trying first.
            if not reader.decrypt(password):
                print(f"Error: {pdf_path} is encrypted and the password is wrong.")
                return False

        print(f"Total pages: {len(reader.pages)}")
        with open(output_path, "w", encoding="utf-8") as output_file:
            for page in reader.pages:
                output_file.write(page.extract_text())
                output_file.write("\n")
        print(f"Text written to {output_path}")
        return True
    except FileNotFoundError:
        print(f"Error: the file {pdf_path} was not found.")
    except DependencyError as e:
        print(f"Error: {e} (try `pip install cryptography`)")
    except PdfReadError as e:
        print(f"Error: unable to read {pdf_path}: {e}")
    return False


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        print("Usage: python pdf_to_text.py input.pdf output.txt [password]")
        sys.exit(2)
    password = sys.argv[3] if len(sys.argv) == 4 else ""
    ok = extract_pdf_text(sys.argv[1], sys.argv[2], password)
    sys.exit(0 if ok else 1)
```

Save it as `pdf_to_text.py` and run it with the input and output paths:

```bash
python pdf_to_text.py input.pdf output.txt
```

Changes from the PyPDF2 version:

| PyPDF2 (old) | pypdf |
| --- | --- |
| `PdfFileReader(f)` | `PdfReader(path)` |
| `isEncrypted` | `is_encrypted` |
| `numPages` / `getPage(i)` | `len(reader.pages)` / `reader.pages[i]` |
| `extractText()` | `extract_text()` |
| `PyPDF2.utils.PdfReadError` | `pypdf.errors.PdfReadError` |

The old script also gave up on any encrypted PDF. `decrypt()` returns a `PasswordType` value that is falsy when decryption fails, so the script tries the password (empty by default) and only stops if that fails.

## Gotchas

- `extract_text()` reads the PDF's text layer. A scanned PDF is just images, so you'll get little or no text and need OCR (for example Tesseract) instead.
- Text order and spacing come from how the PDF was drawn, not from what you see on screen. `page.extract_text(extraction_mode="layout")` tries to keep the visual layout, which helps with tables and columns.
- Extracting text parses the page's whole content stream, so very large or malformed pages can use a lot of memory.

## Further reading

- [pypdf: extracting text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)
- [pypdf: encryption and decryption](https://pypdf.readthedocs.io/en/stable/user/encryption-decryption.html)
- [pypdf migration guide (PyPDF2 1.x API to the current names)](https://pypdf.readthedocs.io/en/stable/meta/migration-1-to-2.html)
