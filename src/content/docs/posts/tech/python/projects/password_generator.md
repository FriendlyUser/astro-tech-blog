---
tags: ['python', 'tortoise_tts']
title: Build a password generator in Python with secrets and tkinter
description: Generate random passwords with Python's secrets module, then wrap the generator in a small tkinter window with a length field and a button.
pubDate: Fri, 15 April 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3750534419.png"
---

A password generator is a small project that covers two things: picking random characters securely, and building a basic GUI. Everything here uses the standard library. On some Linux distributions, tkinter is a separate package (for example `python3-tk` on Debian/Ubuntu).

## Generate a random password

Use the `secrets` module, not `random`, for anything security-related. `random` is a predictable pseudo-random generator meant for simulations. The [Python docs](https://docs.python.org/3/library/random.html) warn against using it for security. `secrets.choice` draws from the operating system's cryptographically secure source.

```python
import secrets
import string


def generate_password(length: int) -> str:
    chars = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(chars) for _ in range(length))


print(generate_password(16))
```

`string.punctuation` includes characters such as quotes and backslashes, which some sites reject. Remove it from `chars` if that is a problem.

This picks each character independently, so a short password might have no digits or no symbols. If a site requires at least one of each, regenerate until the password meets the rule. The `secrets` docs show this pattern:

```python
def generate_strong_password(length: int = 16) -> str:
    chars = string.ascii_letters + string.digits + string.punctuation
    while True:
        password = "".join(secrets.choice(chars) for _ in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in string.punctuation for c in password)):
            return password
```

## Add a tkinter GUI

The window has an entry for the length, a button, and a label that shows the result. The button handler needs its own name, `on_generate`. If you named it `generate_password`, it would replace the function above and call itself forever.

```python
import secrets
import string
import tkinter as tk


def generate_password(length: int) -> str:
    chars = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(chars) for _ in range(length))


def on_generate():
    try:
        length = int(length_entry.get())
    except ValueError:
        password_var.set("Enter a whole number")
        return
    if length < 1:
        password_var.set("Length must be at least 1")
        return
    password_var.set(generate_password(length))


window = tk.Tk()
window.title("Password Generator")

tk.Label(window, text="Password length:").pack()

length_entry = tk.Entry(window)
length_entry.insert(0, "16")
length_entry.pack()

tk.Button(window, text="Generate", command=on_generate).pack()

# A read-only Entry instead of a Label, so the password can be selected and copied
password_var = tk.StringVar()
tk.Entry(window, textvariable=password_var, state="readonly", width=40).pack()

window.mainloop()
```

`password_var` is a `StringVar`. When it changes, the read-only entry updates, and the user can select the text and copy it. A plain `Label` would display the password but wouldn't let the user select it.

## Next steps

- Add checkboxes (`tk.Checkbutton` with `tk.BooleanVar`) to include or exclude digits and symbols.
- Add a "Copy" button that calls `window.clipboard_clear()` and `window.clipboard_append(password)`.
- Use a password manager for real accounts. This is a learning project.

Further reading: [`secrets`](https://docs.python.org/3/library/secrets.html), [`tkinter`](https://docs.python.org/3/library/tkinter.html).
