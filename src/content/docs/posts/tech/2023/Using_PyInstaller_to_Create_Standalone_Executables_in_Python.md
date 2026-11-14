---
description: Package a Python script into a standalone executable with PyInstaller, set an icon, hide the console, bundle data files and fix common build problems.
imgSrc: /imgs/2023/336369522.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-11-03T18:16:10.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: Packaging Python scripts as standalone executables with PyInstaller
---

PyInstaller bundles a Python script, the Python interpreter, and the packages it imports into a folder or a single executable. People can then run your program without installing Python or any dependencies. It works on Windows, macOS, and Linux, but it is **not a cross-compiler**: to get a Windows `.exe` you build on Windows, to get a macOS app you build on macOS, and so on.

## Installation

Install it into the same virtual environment as your project's dependencies, because PyInstaller bundles whatever that environment has installed:

```bash
pip install pyinstaller
```

## Building an executable

```bash
pyinstaller your_script.py
```

PyInstaller follows your imports, collects the modules it finds, and writes:

- `build/`: intermediate files (safe to delete)
- `dist/your_script/`: the app folder to distribute. Since PyInstaller 6.0, most of its contents sit in an `_internal/` subfolder next to the executable.
- `your_script.spec`: the generated build configuration

That default is **one-folder** mode. To get a single file instead:

```bash
pyinstaller --onefile your_script.py
```

A one-file executable is easier to hand around, but each time it starts it unpacks itself to a temporary directory first, so it starts slower than the one-folder build.

## Customising the build

### Icon

```bash
pyinstaller --onefile --icon=app.ico your_script.py
```

`--icon` applies to Windows executables (`.ico`) and macOS app bundles (`.icns`). If you pass another image format and Pillow is installed, PyInstaller tries to convert it. On Linux there's no executable icon to set; desktop icons come from a `.desktop` file instead.

### Hiding the console window

For GUI programs (Tkinter, PySide, and so on) you usually don't want a terminal window to appear:

```bash
pyinstaller --onefile --windowed your_script.py
```

`--windowed` and `--noconsole` are the same option. It works on Windows and macOS (on macOS it also produces a `.app` bundle) and is ignored on Linux. With no console, `print` output and tracebacks have nowhere to go, so log to a file.

## Data files

PyInstaller only finds Python imports. Non-code files your program opens at runtime (images, templates, config files) must be added with `--add-data SOURCE:DEST`, where `DEST` is the folder inside the bundle:

```bash
pyinstaller --onefile --add-data "assets/config.json:assets" your_script.py
```

Since PyInstaller 6.0, the `:` separator works on every platform. Older versions required `;` on Windows (`assets/config.json;assets`), which you'll still see in older tutorials.

In the code, locate bundled files relative to the module's `__file__`, not the current working directory. PyInstaller sets `__file__` so this works both in development and in the bundle:

```python
from pathlib import Path

config_path = Path(__file__).resolve().parent / "assets" / "config.json"
print(config_path.read_text())
```

Older guides use `sys._MEIPASS` for this; it still works, but the PyInstaller docs now recommend `__file__`.

## Troubleshooting

- **`ModuleNotFoundError` when running the executable.** The package was imported dynamically (for example via `importlib` or a plugin system), so PyInstaller didn't see it. Add `--hidden-import package_name`, or `--collect-all package_name` to pull in a package's submodules and data files.
- **It works in development but can't find a file in the bundle.** Usually a relative path resolved against the working directory, or a missing `--add-data`. Use the `__file__` pattern above.
- **The build is huge.** PyInstaller bundles every package your code imports, plus whatever those packages import, from the active environment. Build from a clean virtual environment with only your runtime dependencies installed.
- **Errors disappear before you can read them.** Build without `--windowed` (or add `--debug=imports`) and run the executable from a terminal to see the output.
- **Repeated builds with lots of flags.** Edit the generated `.spec` file and run `pyinstaller your_script.spec` instead of retyping options.

Further reading: [PyInstaller manual](https://pyinstaller.org/en/stable/), especially [Using PyInstaller](https://pyinstaller.org/en/stable/usage.html) for the full option list and [When things go wrong](https://pyinstaller.org/en/stable/when-things-go-wrong.html).
