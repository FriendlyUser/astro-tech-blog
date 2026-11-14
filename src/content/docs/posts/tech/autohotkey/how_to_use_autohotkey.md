---
tags: ['autohotkey']
title: "AutoHotkey v2 basics: hotkeys, hotstrings, remaps and window automation"
description: "Write AutoHotkey v2 scripts for Windows: hotkeys, key remaps, hotstrings, per-app hotkeys, moving windows, and sending clicks and keystrokes."
pubDate: Fri, 14 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.png
---

AutoHotkey is a free, open-source scripting language for Windows. You use it to bind
hotkeys, remap keys, expand abbreviations as you type, and automate clicks, keystrokes and
window management.

:::note
All examples below use **AutoHotkey v2** syntax, the current major version. v2 is not
backwards compatible: v1.1 scripts (`MsgBox, Hello`, `Run, notepad.exe`, `%var%`) won't run
under v2, and many older tutorials and forum posts use v1 syntax.
:::

## Installing and running scripts

Download the installer from [autohotkey.com](https://www.autohotkey.com/download/) and run it.
Scripts are plain-text `.ahk` files; double-click one to run it. While a script is running it
shows a green "H" icon in the system tray, where you can reload, pause or exit it.

To run a script when you log in, put a shortcut to it in your Startup folder (press
Win+R and enter `shell:startup`).

Start each script with a `#Requires` line so it fails clearly if it's opened by the wrong
AutoHotkey version:

```ahk2
#Requires AutoHotkey v2.0
```

## Functions

In v2 everything is a function call. Parentheses are optional when you call a function as a
statement on its own line, and strings must be quoted:

```ahk2
Run "notepad.exe"          ; start Notepad
MsgBox "Hello World!"      ; show a message box
Send "{Enter}"             ; press Enter

x := SubStr("AutoHotkey", 5)                     ; "Hotkey"
answer := MsgBox("Do you want to continue?", , "YesNo")  ; returns "Yes" or "No"
id := WinExist("Untitled - Notepad")             ; window ID, or 0 if not found
```

Functions you'll use most often: `Run`, `MsgBox`, `Send`, `WinActivate`, `WinExist`,
`WinMove`, `Click`, `SubStr` and `StrLen`, plus control flow with `if`/`else` and `Loop`.
The [v2 documentation](https://www.autohotkey.com/docs/v2/) has an index of all of them.

## Hotkeys

A hotkey is a key combination, two colons, then what to do:

```ahk2
#n::Run "notepad.exe"   ; Win+N opens Notepad
!c::Send "^c"           ; Alt+C sends Ctrl+C
F10::Send "Hello"       ; F10 types "Hello"
```

Modifier symbols are `#` (Win), `!` (Alt), `^` (Ctrl) and `+` (Shift). A few more you'll see:

```ahk2
*#n::Run "notepad.exe"       ; * = fire even if extra modifiers are held (e.g. Win+Shift+N)
<^>!a::MsgBox "AltGr+A"      ; <^>! = AltGr on keyboard layouts that have it
F1 & F2::MsgBox "F1 + F2"    ; custom combo: hold F1, then press F2
```

Note that `F1 & F2` makes F1 a prefix key: on its own it now fires when released rather than
pressed. Key names are listed on the [key list](https://www.autohotkey.com/docs/v2/KeyList.htm)
page, and multi-line hotkeys use braces:

```ahk2
^!t:: {
    Run "notepad.exe"
    WinWaitActive "ahk_exe notepad.exe"
    Send "Today's notes:{Enter}"
}
```

## Remapping keys

A remap uses the same `::` syntax, but with a key on both sides:

```ahk2
a::b             ; A types B
CapsLock::Ctrl   ; CapsLock acts as Ctrl
XButton1::F1     ; first extra mouse button sends F1
```

Remaps behave like the real key: modifiers you hold still apply to the destination key, and
the destination key stays down for as long as you hold the original one. See
[Remapping keys](https://www.autohotkey.com/docs/v2/misc/Remap.htm).

## Hotstrings

Hotstrings replace an abbreviation with text as you type. By default they fire when you type
an ending character such as Space, Enter or a period:

```ahk2
::btw::by the way
```

Options go between the first pair of colons:

```ahk2
:*:thx::thanks          ; * = no ending character needed
:?*:e.g.::for example   ; ? = also fires inside another word
:O:ex::example          ; O = drop the ending character, so "ex" + Space gives "example"
```

Other options include `C` (case sensitive), `B0` (don't erase the abbreviation) and `R`/`T`
(send the replacement as raw text). Full list:
[Hotstrings](https://www.autohotkey.com/docs/v2/Hotstrings.htm).

## Targeting specific apps or windows

Most window functions take a `WinTitle` argument. It can be a window title (or the start of
one), or criteria such as `ahk_exe notepad.exe`, `ahk_class Notepad` or `ahk_id`. `"A"` means
the active window. See [WinTitle](https://www.autohotkey.com/docs/v2/misc/WinTitle.htm).

To find a window's title, class or process name, use **Window Spy**. Open it from the tray
menu of any running script, from the Start menu, or from the AutoHotkey Dash.

`#HotIf` makes the hotkeys and hotstrings below it apply only when its condition is true:

```ahk2
#HotIf WinActive("ahk_exe notepad.exe")
^d::Send FormatTime(, "yyyy-MM-dd")   ; Ctrl+D inserts today's date, in Notepad only
#HotIf                                ; end of context-sensitive section
```

### Activating, closing and moving windows

```ahk2
WinActivate "Untitled - Notepad"       ; bring Notepad to the front
WinClose "Calculator"                  ; close the Calculator window
WinMove 0, 0, , , "A"                  ; move the active window to the top-left corner
WinMove , , 800, 600, "A"              ; resize the active window to 800x600

#!Left::WinMove 0, , , , "A"           ; Win+Alt+Left: snap the active window to the left edge
```

`WinMove` takes `X, Y, Width, Height, WinTitle`; leave a parameter empty to keep its current
value.

A script to resize a window to an exact size. Win+= asks for a width and a height,
prefilled with the current size rounded down to a multiple of 4:

```ahk2
#Requires AutoHotkey v2.0-
#Warn
#SingleInstance

#=::resizeWindow(WinGetID("A")) ; [Win]+[=]

resizeWindow(window) {
    WinGetPos , , &W, &H, window
    width := InputBox("Width: " W "px", "Resize", "w100 h84", W - Mod(W, 4))
    if (width.Result = "OK") {
        height := InputBox("Height: " H "px", "Resize", "w100 h84", H - Mod(H, 4))
        if (height.Result = "OK") {
            WinMove , , width.Value, height.Value, window
        }
    }
}
```

## Mouse movement and clicks

`MouseGetPos` reads the cursor position, `MouseMove` moves it, and `Click` clicks. This clicks
a point and then puts the cursor back where it was:

```ahk2
MouseGetPos &origX, &origY
Click 987, 851
MouseMove origX, origY
```

`Click` options can be combined in one string or list of arguments:

```ahk2
Click                  ; left click at the current position
Click "Right"          ; right click
Click 2                ; double click
Click 1000, 500        ; move to (1000, 500) and click
Click "1000 500 Right" ; same, with the right button
```

Coordinates are relative to the active window's client area unless you change it with
`CoordMode "Mouse", "Screen"`. `Click` has no speed or mode option of its own: use
`SetDefaultMouseSpeed` for movement speed and `SendMode` to switch between the
Input/Event/Play methods (Play works in some games where the default doesn't).

`ControlClick` clicks a control without moving the mouse or activating the window. Get the
control's ClassNN (for example `Button2`) from Window Spy:

```ahk2
ControlClick "Button2", "WindowTitle"
```

## Sending keystrokes

`Send` types into the active window. Modifier symbols work the same as in hotkeys, and special
keys go in braces:

```ahk2
Send "^a"              ; Ctrl+A
Send "Hello{Enter}"    ; type Hello, then press Enter
Send "{Raw}+a"         ; type the literal characters "+a"
Send "{Blind}{Ctrl up}" ; release Ctrl without touching other held modifiers
```

There's no inline delay syntax; use `SetKeyDelay` (which applies to SendEvent mode) if a
target app drops keystrokes. See [Send](https://www.autohotkey.com/docs/v2/lib/Send.htm).

`ControlSend` sends keys to a control in a window that doesn't need to be active:

```ahk2
ControlSend "Hello World!", "Edit1", "ahk_class Notepad"
```

Some apps ignore `ControlSend`. Modern UI frameworks often don't expose standard controls like
`Edit1` (the Windows 11 Notepad is one of them). In that case, activate the window with
`WinActivate`, use `Send`, then switch back.

## Recording macros with Pulover's Macro Creator

If you'd rather record actions than write them, [Pulover's Macro Creator](https://www.macrocreator.com/)
is a recorder and editor built on AutoHotkey. Be aware that its last release (5.4.1) was in 2021.

1. Start Pulover's Macro Creator.
2. Press the record hotkey (F9 by default) and perform your mouse and keyboard actions.
3. Press the record hotkey again to stop.
4. Press the playback hotkey (F3 by default) to replay.

The Options menu controls recording mode, delays and coordinate mode, and recorded macros can
be edited, saved and exported. See the [help page](https://www.macrocreator.com/help/).
