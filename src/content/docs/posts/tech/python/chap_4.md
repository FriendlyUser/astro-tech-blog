---
tags: ['python', 'introtopython']
title: "Chapter 4: Python modules, packages and pip"
description: How to import modules, use the standard library, write your own modules and packages, and install third-party packages with pip.
pubDate: Fri, 14 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2851628136.png
---
A module is a `.py` file containing Python definitions and statements. A package is a directory of modules (and possibly sub-packages). Splitting code into modules and packages lets you reuse it across programs and keep each file focused on one job.

## Importing modules

`import` loads a whole module; you then reach its contents with dot notation:

```python
import math

result = math.sqrt(16)
print(result)  # 4.0
```

`from ... import` pulls specific names into your namespace, so you can call them directly:

```python
from math import sqrt, pow

print(sqrt(16))   # 4.0
print(pow(2, 3))  # 8.0
```

`as` gives a module or name an alias:

```python
import math as m
from math import sqrt as s

print(m.pi, s(9))
```

Prefer plain `import module` or importing a few explicit names. Avoid `from module import *`: it makes it hard to tell where a name came from and can silently overwrite your own names.

## A few standard library modules

Python ships with a large standard library. Some modules you'll use early on:

```python
import datetime
import os
import random

print(random.randint(1, 10))        # random integer from 1 to 10, inclusive
print(datetime.datetime.now())      # current local date and time
print(os.getcwd())                  # current working directory
```

`datetime.datetime` is a class inside the `datetime` module, and `now()` is a class method on it, which is why the name appears twice.

### Parsing XML with xml.etree.ElementTree

`xml.etree.ElementTree` parses XML into a tree of elements. Given `example.xml`:

```xml
<root>
  <child1 foo="bar">
    <grandchild1/>
    <grandchild2/>
  </child1>
  <child2 baz="qux">
    <grandchild3/>
  </child2>
</root>
```

this script prints each direct child of the root with its attributes:

```python
import xml.etree.ElementTree as ET

tree = ET.parse("example.xml")
root = tree.getroot()

for child in root:
    print(child.tag, child.attrib)
```

Output:

```text
child1 {'foo': 'bar'}
child2 {'baz': 'qux'}
```

ElementTree also supports namespaces and a limited subset of XPath through `find()`, `findall()` and `iterfind()`. Don't use it on XML from untrusted sources; the Python docs recommend `defusedxml` for that.

## Writing your own module

Any `.py` file is a module. Save this as `my_module.py`:

```python
def greet(name):
    print(f"Hello, {name}!")


def goodbye(name):
    print(f"Goodbye, {name}!")
```

A script in the same directory can import it by file name, without the `.py`:

```python
import my_module

my_module.greet("Alice")    # Hello, Alice!
my_module.goodbye("Bob")    # Goodbye, Bob!
```

Don't name your own modules after standard library ones (`math.py`, `random.py`, `json.py`). Python searches the script's directory first, so your file shadows the real module and imports start failing in confusing ways.

## Creating a package

A package is a directory of modules. The usual layout is:

```text
my_package/
    __init__.py
    my_module.py
```

`__init__.py` can be empty, or it can run setup code and re-export names so users can write `from my_package import greet`. With `my_module.py` from the previous section inside `my_package/`, you import from it like this:

```python
from my_package.my_module import greet

greet("Alice")  # Hello, Alice!
```

Since Python 3.3, a directory without `__init__.py` can still be imported as a "namespace package" (PEP 420). Include `__init__.py` anyway for normal packages; namespace packages are meant for splitting one package across several directories.

## Installing third-party packages with pip

`pip` installs packages from the Python Package Index (PyPI). Run it through the interpreter you intend to use so the package lands in the right environment:

```bash
python -m pip install requests
```

Then import it like any other module:

```python
import requests

response = requests.get("https://www.python.org")
print(response.status_code)  # 200 if the request succeeded
```

pip also installs each package's dependencies, and theirs in turn. For example, `pandas` depends on `numpy` and `python-dateutil` (plus `tzdata` on Windows), so `python -m pip install pandas` pulls those in too.

### Pinning versions

Use `==` to install an exact version:

```bash
python -m pip install pandas==3.1.1
```

To record the versions a project needs, list them in a `requirements.txt` file:

```text
numpy==2.5.4
pandas==3.1.1
```

and install everything in it with `-r`:

```bash
python -m pip install -r requirements.txt
```

These were the latest releases on PyPI when this post was updated; numpy 2.5 requires Python 3.12 or newer. Old pins such as `pandas==1.0.0` have no wheels for current Python versions, so pip will try to build them from source and usually fail.

Install packages into a virtual environment (`python -m venv .venv`) rather than your system Python, so each project gets its own set of versions.

## Further reading

- [The Python Tutorial: Modules](https://docs.python.org/3/tutorial/modules.html)
- [The Python Standard Library](https://docs.python.org/3/library/index.html)
- [xml.etree.ElementTree](https://docs.python.org/3/library/xml.etree.elementtree.html)
- [Installing packages (Python Packaging User Guide)](https://packaging.python.org/en/latest/tutorials/installing-packages/)
