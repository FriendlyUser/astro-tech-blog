---
description: "Control the mouse and keyboard from Python with PyAutoGUI: moving, clicking, typing, hotkeys, screenshots and image matching, plus a Notepad script."
imgSrc: /imgs/2023/226878303.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-09-17T00:24:45.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: Automating mouse and keyboard input in Python with PyAutoGUI
---

PyAutoGUI sends real mouse and keyboard events and takes screenshots on Windows, macOS and Linux. It is useful for scripting apps that have no API: filling a legacy form, clicking through an installer, or repeating a sequence of keystrokes. It only knows screen coordinates and pixels, not the widgets underneath, so scripts break when windows move or the theme changes.

The examples use PyAutoGUI 0.9.54. It was released in May 2023 and is still the latest version on PyPI.

## Install

```sh
pip install pyautogui
```

On Linux, screenshots need the `scrot` command (`sudo apt-get install scrot`). Image matching with a `confidence` value needs OpenCV (`pip install opencv-python`). On macOS, grant your terminal Accessibility and Screen Recording permissions, or events and screenshots won't work.

## Safety first

Two settings to know before you run anything:

```python
import pyautogui

pyautogui.FAILSAFE = True  # the default: moving the mouse into a screen corner raises FailSafeException
pyautogui.PAUSE = 0.25     # seconds to wait after every PyAutoGUI call
```

The fail-safe is your emergency stop when a script goes wrong. Leave it on.

## Mouse

Coordinates start at `(0, 0)` in the top-left corner of the primary screen.

```python
pyautogui.moveTo(100, 200, duration=2)       # glide to (100, 200) over 2 seconds
pyautogui.click(100, 200)                    # left click at (100, 200)
pyautogui.click(100, 200, button="right")    # right click
pyautogui.doubleClick(300, 400)
pyautogui.dragTo(500, 400, duration=1)       # drag from the current position with the left button held
pyautogui.scroll(5)                          # positive scrolls up, negative scrolls down
print(pyautogui.position())                  # current mouse position
```

How far one `scroll()` unit moves depends on the platform and the application, so tune the number by trial.

## Keyboard

```python
pyautogui.write("hello world", interval=0.05)  # type a string, 50 ms between characters
pyautogui.press("enter")
pyautogui.press("tab", presses=3)
pyautogui.hotkey("ctrl", "c")                   # press ctrl, press c, release in reverse order
```

`write()` is the name the docs use; `typewrite()` is the original name and still works. `write()` only types characters that map to keys, so it won't type most non-ASCII text. Valid key names are in `pyautogui.KEYBOARD_KEYS`.

## Screen and image matching

```python
width, height = pyautogui.size()
color = pyautogui.pixel(10, 10)  # RGB tuple of the pixel at (10, 10)
pyautogui.screenshot("screen.png")
```

`locateOnScreen()` finds an image on the screen and returns a box (`left`, `top`, `width`, `height`). Since 0.9.41 it raises `ImageNotFoundException` when the image isn't found, instead of returning `None`:

```python
try:
    box = pyautogui.locateOnScreen("save_button.png", confidence=0.9)
    pyautogui.click(pyautogui.center(box))
except pyautogui.ImageNotFoundException:
    print("Save button not on screen")
```

Matching is pixel-based, so capture the reference image at the same display scaling and theme the script will run under. Searching the whole screen is slow; pass `region=(left, top, width, height)` to narrow it down.

## Example: write a file in Notepad (Windows)

```python
import time

import pyautogui

pyautogui.PAUSE = 0.2

# Open Notepad from the Run dialog
pyautogui.hotkey("win", "r")
time.sleep(0.5)
pyautogui.write("notepad")
pyautogui.press("enter")
time.sleep(2)

# Type some text
pyautogui.write("Hello, PyAutoGUI!\n", interval=0.05)

# Save As dialog: type a file name and confirm
pyautogui.hotkey("ctrl", "s")
time.sleep(1)
pyautogui.write("example.txt")
pyautogui.press("enter")
time.sleep(1)

# Close Notepad
pyautogui.hotkey("alt", "f4")
```

The fixed `sleep()` calls are the weak point: if Notepad opens slowly, keystrokes land in the wrong window. If `example.txt` already exists, Windows asks whether to replace it, and the script doesn't handle that prompt. Recent Windows 11 versions of Notepad also restore tabs from the previous session, so check what the window looks like on your machine before relying on the script.

## When not to use it

If the target has an API, a CLI, or a scriptable interface, use that instead. For web pages, Playwright or Selenium work with the DOM and don't care where the window is. On Windows, `pywinauto` drives controls through the UI Automation API, which is more reliable than clicking coordinates. Keep PyAutoGUI for the cases where pixels and keystrokes really are the only interface.

## Further reading

- [PyAutoGUI documentation](https://pyautogui.readthedocs.io/)
- [PyAutoGUI on PyPI](https://pypi.org/project/PyAutoGUI/)
