---
tags: ['autohotkey', 'windows']
title: "Automate Windows with AutoHotkey: hotkeys, text expansion and key remaps"
description: What AutoHotkey is, what it's good for, and a short AutoHotkey v2 script with a hotkey, a text-expansion hotstring and a key remap.
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.webp
---

AutoHotkey is a free, open-source (GNU GPLv2) scripting language for Windows. You use it to automate desktop tasks: keyboard and mouse shortcuts, key remapping, text expansion, form filling, auto-clicking and other macros. It's small, needs no setup beyond the installer, and a useful script can be just a few lines.

## What you can do with it

- **Hotkeys.** Bind any key or mouse-button combination to an action, such as launching a program or running a function.
- **Hotstrings.** Type an abbreviation and have it replaced with longer text, like autocorrect. Handy for email replies and boilerplate you type often.
- **Remaps.** Make one key behave like another, for example turning Caps Lock into Ctrl.
- **Scripting.** Beyond shortcuts, it's a full language with functions, loops, arrays, objects and classes, plus built-ins for the clipboard, window management, files, GUIs, sound and COM automation.

## A first script

The current version is AutoHotkey v2 (2.0.31 is the latest stable release on the download page). v2 isn't backward compatible with v1.1, so older scripts and forum examples often need changes. Save this as `my-shortcuts.ahk` and double-click it to run it:

```ahk2
#Requires AutoHotkey v2.0

; Ctrl+Alt+N opens Notepad
^!n::Run "notepad.exe"

; Typing "btw" followed by a space or punctuation expands it
::btw::by the way

; Caps Lock acts as Ctrl
CapsLock::Ctrl

; Ctrl+Alt+C copies the selection and shows it in a tooltip for 2 seconds
^!c::
{
    A_Clipboard := ""
    Send "^c"
    if ClipWait(1)
        ToolTip A_Clipboard
    SetTimer () => ToolTip(), -2000
}
```

`^` is Ctrl, `!` is Alt, `+` is Shift and `#` is the Windows key. The script stays running in the system tray; right-click its icon to reload, edit or exit it.

## Gotchas

- Hotkeys that clash with Windows or app shortcuts override them while the script is running, so pick combinations you don't already use.
- Scripts can't send keystrokes to programs running as administrator unless the script itself runs elevated.
- Some games and anti-cheat software block or flag simulated input.

## Further reading

You can download AutoHotkey from https://www.autohotkey.com/ or http://www.autohotkey.org/ .

- [AutoHotkey v2 documentation](https://www.autohotkey.com/docs/v2/)
- [Hotkeys](https://www.autohotkey.com/docs/v2/Hotkeys.htm) and [Hotstrings](https://www.autohotkey.com/docs/v2/Hotstrings.htm)
- [Changes from v1.1 to v2.0](https://www.autohotkey.com/docs/v2/v2-changes.htm)
