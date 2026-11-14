---
tags: ['python', 'imagemagick']
title: Converting PDFs to PNGs with ImageMagick from Python
description: A Python script that converts every PDF in a folder to PNG images by calling ImageMagick with subprocess, plus the Ghostscript and policy gotchas.
pubDate: Mon, 7 December 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2022/dall-e/DALL·E 2022-12-14 22.06.43 - blank book open on the coffee table.png"
---

ImageMagick is a command-line toolkit for converting and editing images. It can rasterise PDF pages to PNG, which is handy for dropping plots or slides from a PDF into a web page or a document that only takes images. This post shows a small Python script that converts every PDF in a folder.

## Prerequisites

- **ImageMagick.** In ImageMagick 7 the main command is `magick`. The ImageMagick 6 command `convert` is still available in 7 as a legacy alias, but `magick` is the recommended name. Many Linux distributions still ship ImageMagick 6, which only has `convert`.
- **Ghostscript.** ImageMagick hands PDF rendering off to Ghostscript, so it must be installed and on your `PATH`. Without it you get a "no images defined" or delegate error.

## Calling ImageMagick from Python

You could build a command string and run it with `os.system`:

```python
import os

os.system("magick input.jpg output.png")
```

That passes the string through the shell, so a filename containing spaces breaks the command, and a filename containing shell syntax can run arbitrary commands. Pass the arguments as a list to `subprocess.run` instead. No shell is involved, so each argument reaches ImageMagick exactly as written:

```python
import subprocess

subprocess.run(["magick", "input.jpg", "output.png"], check=True)
```

`check=True` raises `CalledProcessError` if ImageMagick exits with an error, instead of silently carrying on.

## Converting every PDF in a folder

```python
import os
import shutil
import subprocess
from pathlib import Path


def find_imagemagick() -> str:
    # ImageMagick 7 installs `magick`; ImageMagick 6 only has `convert`.
    # Don't fall back to `convert` on Windows: C:\Windows\System32\convert.exe
    # is an unrelated tool for converting FAT drives to NTFS.
    exe = shutil.which("magick")
    if exe is None and os.name != "nt":
        exe = shutil.which("convert")
    if exe is None:
        raise SystemExit("ImageMagick not found on PATH")
    return exe


def pdf_to_png(magick: str, pdf: Path, density: int = 400) -> None:
    cmd = [
        magick,
        "-density", str(density),  # must come before the input file
        str(pdf),
        "-background", "white",
        "-alpha", "remove",        # replace transparency with the white background
        "-alpha", "off",
        str(pdf.with_suffix(".png")),
    ]
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    magick = find_imagemagick()
    for pdf in sorted(Path(".").glob("*.pdf")):
        pdf_to_png(magick, pdf)


if __name__ == "__main__":
    main()
```

Run it from the folder containing your PDFs. A one-page `plot.pdf` becomes `plot.png`. A multi-page PDF produces one file per page: `report-0.png`, `report-1.png`, and so on.

### The options

- `-density 400` sets the resolution (in DPI) Ghostscript renders the PDF at. It has to come *before* the input file, because it controls how the PDF is read. The default is 72 DPI, which looks blurry for anything with text. Higher values give sharper, larger files.
- `-background white -alpha remove -alpha off` flattens transparency onto a white background. PDF pages rendered to PNG often have a transparent background, which shows up black or checkered in some viewers.

The original version of this script used `-flatten` for the same purpose. That works for single-page PDFs, but `-flatten` merges every image in the sequence into one, so on a multi-page PDF all the pages end up drawn on top of each other. `-alpha remove` works per page.

## Gotchas

- **"not authorized" / "not allowed by the security policy `PDF'".** Some Linux packages (Debian and Ubuntu's ImageMagick 6 builds, for example) have shipped a `policy.xml` that disables PDF reading, because Ghostscript has had security vulnerabilities. Run `convert -list policy` (or `magick -list policy`) to see what's active. If you trust the PDFs you're converting, change the `<policy domain="coder" rights="none" pattern="PDF" />` line in `/etc/ImageMagick-6/policy.xml` to `rights="read|write"`. Don't do this on a server that converts PDFs uploaded by users.
- **Huge output.** At 400 DPI a US Letter page is 3400 × 4400 pixels. Drop the density, or add `-resize` after the input file, if you only need thumbnails.
- **If you only need PDF to image**, you can call Ghostscript (`gs -sDEVICE=png16m -r300 ...`) or Poppler's `pdftoppm` directly and skip ImageMagick.

## References

- https://github.com/FriendlyUser/ELEC370/blob/master/Assignments/A1/html/pdfToPNGMagick.py
- [ImageMagick command-line options](https://imagemagick.org/script/command-line-options.php)
- [Porting from ImageMagick 6 to 7](https://imagemagick.org/porting/)
