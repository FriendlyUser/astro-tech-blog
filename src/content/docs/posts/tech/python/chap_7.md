---
tags: ['python', 'introtopython']
title: "Chapter 7: Reading, writing and processing files in Python"
description: Opening files with open() and with, file modes, processing lines with string methods and regex, CSV/JSON/XML modules, large files, and running ffmpeg.
pubDate: Fri, 30 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1096284488.png

---

This chapter covers reading and writing files with the built-in `open()`, the standard-library modules for CSV, JSON and XML, processing files too large to load at once, and calling external programs such as ffmpeg from Python.

## Opening, reading and writing files

`open(path, mode)` returns a file object. Always open files with a `with` block: it closes the file when the block ends, even if an exception is raised.

```python
with open("example.txt", "w", encoding="utf-8") as f:
    f.write("Hello, World!\n")

with open("example.txt", "r", encoding="utf-8") as f:
    contents = f.read()

print(contents)
```

Pass `encoding="utf-8"` for text files. Without it, Python uses the platform's default encoding, which differs between Windows and Linux/macOS and is a common source of `UnicodeDecodeError`.

If you don't use `with`, you must call `f.close()` yourself, and an exception between `open()` and `close()` will leave the file open. `with` avoids that.

### Reading methods

- `f.read()` returns the whole file as one string.
- `f.readline()` returns the next line, including its trailing `\n` (and `""` at end of file).
- `f.readlines()` returns a list of all lines.
- Iterating with `for line in f:` reads one line at a time and is usually what you want.

### Writing methods

- `f.write(s)` writes a string and returns the number of characters written.
- `f.writelines(lines)` writes each string in an iterable. It does **not** add newlines, so include them yourself:

```python
lines = ["Hello", "World"]
with open("example.txt", "w", encoding="utf-8") as f:
    f.writelines(line + "\n" for line in lines)
```

## File modes

| Mode | Meaning | If the file doesn't exist | If it exists |
| --- | --- | --- | --- |
| `"r"` | Read (default) | `FileNotFoundError` | Read from start |
| `"w"` | Write | Created | Truncated (contents erased) |
| `"a"` | Append | Created | Writes go to the end |
| `"x"` | Exclusive create | Created | `FileExistsError` |
| `"r+"` | Read and write | `FileNotFoundError` | Not truncated |
| `"w+"` | Read and write | Created | Truncated |
| `"a+"` | Read and append | Created | Writes always go to the end |

Add `"b"` for binary mode (`"rb"`, `"wb"`, …) when working with images, audio or other non-text files. In binary mode you read and write `bytes` instead of `str`, and you don't pass `encoding`:

```python
with open("example.mp3", "rb") as f:
    header = f.read(10)  # first 10 bytes
```

### A note on Linux file permissions

Python's `open()` can only write to a file if the operating system allows it; otherwise you get a `PermissionError`. On Linux and macOS, permissions are set with `chmod`, using three octal digits for the owner, the group, and everyone else. Each digit is the sum of read (4), write (2) and execute (1):

- `chmod 700 file.txt`: owner can read, write and execute; nobody else has access.
- `chmod 644 file.txt`: owner can read and write; group and others can only read.
- `chmod 755 directory`: owner has full access; group and others can list and enter the directory but not create or delete files in it.

You can do the same from Python with `os.chmod("file.txt", 0o644)`.

## Processing data line by line

Iterating over a file reads one line at a time, so it works on files of any size:

```python
with open("example.txt", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
```

`strip()` removes the trailing newline and surrounding whitespace. For simple delimited data, `split()` turns a line into fields:

```python
with open("example.txt", encoding="utf-8") as f:
    for line in f:
        values = line.strip().split(",")
        print(values[0])
```

This breaks as soon as a field contains a quoted comma; use the `csv` module (below) for real CSV files.

Regular expressions help when you're searching for a pattern rather than splitting on a fixed character. This pulls email-like strings out of each line:

```python
import re

EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

with open("example.txt", encoding="utf-8") as f:
    for line in f:
        for email in EMAIL.findall(line):
            print(email)
```

Compiling the pattern once with `re.compile()` and using `findall()` catches every address on a line, not just the first.

## CSV, JSON and XML

### CSV

```python
import csv

with open("example.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Name", "Age", "City"])
    writer.writerow(["John", 30, "New York"])
    writer.writerow(["Jane", 25, "San Francisco"])

with open("example.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        print(row["Name"], row["City"])
```

Open CSV files with `newline=""`, as the [csv docs](https://docs.python.org/3/library/csv.html) recommend; otherwise you can get blank lines between rows on Windows. `csv.reader` gives each row as a list of strings, while `csv.DictReader` uses the header row as dictionary keys. Every value comes back as a string, so convert numbers yourself.

### JSON

```python
import json

data = {"name": "John", "age": 30, "city": "New York"}

with open("example.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

with open("example.json", encoding="utf-8") as f:
    loaded = json.load(f)

print(loaded["age"])  # 30
```

`json.dump`/`json.load` work with files; `json.dumps`/`json.loads` work with strings.

### XML

```python
import xml.etree.ElementTree as ET

tree = ET.parse("example.xml")
root = tree.getroot()

for child in root:
    print(child.tag, child.attrib, child.text)
```

`getroot()` returns the top-level element, and iterating over an element yields its direct children. Use `root.iter("tag")` to find matching elements at any depth, or `root.find()`/`root.findall()` for simple path queries. The `xml` modules are not safe against maliciously constructed XML, so don't parse untrusted input with them (see the [security note](https://docs.python.org/3/library/xml.html#xml-vulnerabilities) in the docs).

## Processing large files

Because iterating over a file is already lazy, `for line in f:` handles large text files without loading them into memory. You don't need to wrap `readline()` in your own generator.

Generators are still useful for building processing pipelines on top of that, or for reading binary files in fixed-size chunks:

```python
def read_in_chunks(f, chunk_size=1024 * 1024):
    """Yield successive chunks of a binary file."""
    while True:
        chunk = f.read(chunk_size)
        if not chunk:
            break
        yield chunk


total = 0
with open("large_data_set.bin", "rb") as f:
    for chunk in read_in_chunks(f):
        total += len(chunk)

print(f"{total} bytes")
```

Generator expressions let you chain steps without building intermediate lists:

```python
with open("large_data_set.txt", encoding="utf-8") as f:
    stripped = (line.strip() for line in f)
    non_empty = (line for line in stripped if line)
    print(sum(1 for _ in non_empty), "non-empty lines")
```

## Running command-line tools: converting MP4 to MP3 with ffmpeg

The `subprocess` module runs external programs. This converts a video's audio track to MP3 with [ffmpeg](https://ffmpeg.org/ffmpeg.html), which must be installed and on your `PATH`:

```python
import subprocess

input_file = "path/to/video.mp4"
output_file = "path/to/audio.mp3"

subprocess.run(
    ["ffmpeg", "-y", "-i", input_file, "-vn", "-acodec", "libmp3lame", output_file],
    check=True,
)
```

- `-y` overwrites the output file without asking.
- `-i` sets the input file.
- `-vn` drops the video stream.
- `-acodec libmp3lame` encodes the audio as MP3.

Passing the command as a list (rather than one string with `shell=True`) avoids problems with spaces and special characters in file names. `check=True` raises `subprocess.CalledProcessError` if ffmpeg exits with an error, instead of failing silently.

`subprocess.run()` waits for the command to finish. To convert several files at once, start them with `subprocess.Popen()` and wait on each, or submit `subprocess.run` calls to a `concurrent.futures.ThreadPoolExecutor`.

## Further reading

- [Reading and Writing Files](https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files) in the Python tutorial
- [`open()`](https://docs.python.org/3/library/functions.html#open), [`csv`](https://docs.python.org/3/library/csv.html), [`json`](https://docs.python.org/3/library/json.html), [`xml.etree.ElementTree`](https://docs.python.org/3/library/xml.etree.elementtree.html) and [`subprocess`](https://docs.python.org/3/library/subprocess.html) reference docs
