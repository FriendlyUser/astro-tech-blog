---
tags: ['autohotkey']
title: Introduction to AutoHotKey.
description: AutoHotkey is a free, open-source scripting language for Windows that allows users to easily create small to complex scripts
pubDate: Fri, 14 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/test.png
---


# Introduction
AutoHotkey is a free, open-source scripting language for Windows that allows users to easily create small to complex scripts for all kinds of tasks such as: form fillers, auto-clicking, macros, etc. 

You can use AutoHotkey to automate repetitive tasks, customize keyboard shortcuts, create GUIs, manipulate windows and files, and much more. AutoHotkey has a simple and flexible syntax that lets you write scripts in different styles and paradigms.
To install AutoHotkey, you need to download the installer from the official website and run it on your computer. You can choose Express Installation for the default configuration or Custom Installation for more options. 

To run AutoHotkey, you can double-click a script file (.ahk) in Explorer or create a shortcut to it. You can also use Task Scheduler to run a script on startup by creating a basic task and selecting "Start a program" as the action. Then you need to enter the file path of AutoHotkey.exe and the script file as arguments. 
AutoHotkey scripts are composed of lines that can contain commands, expressions, variables, hotkeys, hotstrings, or comments. 

Commands are instructions that perform a specific action, such as sending keystrokes, clicking the mouse, running a program, etc. Commands have a name followed by one or more parameters separated by commas. Parameters can be literal values or expressions. For example:

```
Run, notepad.exe ; This command runs Notepad
MsgBox, Hello World! ; This command displays a message box with "Hello World!"
SendInput, {Enter} ; This command sends an Enter keystroke
```

Functions are similar to commands but they return a value that can be used in an expression. Functions have a name followed by parentheses that enclose one or more parameters separated by commas. Parameters can be literal values or expressions. For example:

```
x := SubStr("AutoHotkey", 5) ; This function returns "Hotkey" and assigns it to x
y := MsgBox("Do you want to continue?", 4) ; This function displays a message box with Yes/No buttons and returns 6 for Yes and 7 for No
z := WinExist("Untitled - Notepad") ; This function returns the window ID of Notepad if it exists
```

Some common commands and functions in AutoHotkey are:

- `Run`: Runs an external program.
- `MsgBox`: Displays a message box with text and buttons.
- `SendInput`: Sends simulated keystrokes and mouse clicks to the active window.
- `WinActivate`: Activates a window based on its title or ID.
- `WinExist`: Checks if a window exists based on its title or ID and returns its ID.
- `Loop`: Repeats a series of commands until a condition is met or until it is broken by another command.
- `If`: Checks if an expression is true and executes one or more commands if it is.
- `Else`: Executes one or more commands if the preceding If statement was false.
- `SubStr`: Returns a substring of a given string based on its position and length.
- `StrLen`: Returns the length of a string in characters.

You can find more commands and functions in the alphabetical index or use the search feature on the official website.

## Hotkeys and Hotstrings

Hotkeys are combinations of keys that trigger a command or function when pressed. You can define hotkeys for the mouse and keyboard using AutoHotkey scripts. 

To define a hotkey, you need to specify the key combination followed by two colons (::) and then the command or function to execute. For example:

```
#n::Run, notepad.exe ; This hotkey runs Notepad when you press Win+N
!c::SendInput, ^c ; This hotkey copies text when you press Alt+C
```

You can use modifiers such as # (Win), ! (Alt), ^ (Ctrl), and + (Shift) to create different combinations. You can also use & to combine two keys into one hotkey. For example:

``autohotkey
F1 & F2::MsgBox, You pressed F1 and F2 ; This hotkey displays a message box when you press F1 and F2 together
```

You can find a list of key names and symbols on the official website. Some keys may require special syntax or brackets to work properly. For example:

```
{F10}::SendInput, Hello ; This hotkey sends "Hello" when you press F10
<^>!a::MsgBox, You pressed Ctrl+Alt+A ; This hotkey displays a message box when you press Ctrl+Alt+A using either side of those keys
```

You can also use wildcards (*) to make a hotkey fire even if extra modifiers are being held down. For example:

``autohotkey
*#n::Run, notepad.exe ; This hotkey runs Notepad when you press Win+N with any other modifier(s)
```

You can find more examples and tips on how to use hotkeys in AutoHotkey on various websites   .
Remapping keys or buttons means changing their function to perform a different action. You can remap keys or buttons using AutoHotkey scripts. 

To remap a key or button, you need to use the same syntax as defining a hotkey, but instead of specifying a command or function to execute, you specify another key or button to send. For example:

```
a::b ; This remaps the A key to send B
CapsLock::Ctrl ; This remaps the CapsLock key to send Ctrl
XButton1::F1 ; This remaps the first extra mouse button to send F1
```

Remapping a key or button is complete in the following respects:

- Holding down a modifier such as Ctrl or Shift while typing the origin key will put that modifier into effect for the destination key.
- CapsLock generally affects remapped keys in the same way as normal keys.
- The destination key or button is held down for as long as you continue to hold down the origin key.

You can find more details and examples on how to remap keys or buttons in AutoHotkey on various websites.
Hotstrings are a feature of AutoHotkey that let you define a string of characters that can be replaced by other text when typed. Hotstrings are often used as text-expansions for abbreviations or symbols. 

To create a hotstring, you need to specify the trigger string followed by two colons (::) and then the replacement text. For example:

```
::btw::by the way ; This hotstring replaces "btw" with "by the way"
:::)::😊 ; This hotstring replaces ":)" with "😊"
```

You can also use options to modify how a hotstring behaves. Options are specified inside a pair of colons before the trigger string. For example:

```
:*:thx::thanks ; This hotstring replaces "thx" with "thanks" without requiring an ending character
:?*:e.g.::for example ; This hotstring replaces "e.g." with "for example" even inside another word
:O:lol::Laugh Out Loud ; This hotstring replaces "lol" with "Laugh Out Loud" and capitalizes it
```

You can find a list of options and their meanings on the official website. Some options may require special syntax or brackets to work properly. For example:

```
:*B0:ahk::{#}ahk{#} ; This hotstring replaces "ahk" with "#ahk#" and prevents backspacing over it
:?C:`n::{Enter 2} ; This hotstring replaces "`n" with two newlines even if typed in an input control
```

You can find more examples and tips on how to use hotstrings in AutoHotkey on various websites.


## Targeting Specific Apps or Windows
Window Spy is a program that can help you get information about any window on your screen, such as its title, class, executable name, position, size, and more. You can use this information to write AutoHotKey scripts that can interact with those windows.

To use Window Spy, you need to have AutoHotKey installed on your computer. You can download it from https://www.autohotkey.com/download/. Then you can run Window Spy in one of these ways:

- Right-click on the AutoHotKey icon in the system tray and select Window Spy from the menu .
- Go to Start > All Programs > AutoHotkey > AutoIt3 Window Spy .
- Extract AU3_Spy.exe from the AutoHotKey installer using 7-Zip and place it in your AutoHotKey folder. Then run it directly.

Once Window Spy is running, you can click on any window to see its information displayed in Window Spy. You can also use keyboard shortcuts to freeze or refresh the information. For more details, please refer to https://www.autohotkey.com/docs/WindowSpy.htm.
WinTitle, WinText, WinClass and other criteria are used to identify which window (or windows) to operate on with AutoHotKey commands and functions. You can use them to specify the title or partial title of the window, and/or any other criteria described on https://www.autohotkey.com/docs/misc/WinTitle.htm.

For example, you can use WinTitle ahk_class WinClass to match a window by its class name , which you can get using Window Spy or WinGetClass. You can also use #If or #IfWinActive directives to create context-sensitive hotkeys and hotstrings that only work when a certain window is active.

For more details and examples, please refer to https://www.autohotkey.com/docs/commands/_If.htm and https://documentation.help/AutoHotkey-en/WinTitle.htm.
You can use AutoHotKey commands and functions to activate, close, resize or move windows on your screen. Here are some examples:

- To activate a window, you can use WinActivate with the window title or other criteria. For example, WinActivate, Untitled - Notepad will activate a Notepad window with no file name.
- To close a window, you can use WinClose with the window title or other criteria. For example, WinClose, Calculator will close a Calculator window.
- To resize a window, you can use WinMove with the window title or other criteria, followed by the new position and size of the window. For example, WinMove, Paintbrush,, 0, 0 will move a Paintbrush window to the top-left corner of the screen without changing its size.
- To move a window, you can also use WinMove with the same parameters as above. For example, WinMove,, , 1000 will move any active window 1000 pixels to the right.

You can also create hotkeys and hotstrings to perform these actions more easily. For example, you can use #!Left::WinMove A,, 0 to make Windows+Alt+Left move any active window to the left edge of the screen .

For more details and examples, please refer to https://www.autohotkey.com/docs/commands/WinActivate.htm, https://www.autohotkey.com/docs/commands/WinClose.htm, https://www.autohotkey.com/docs/commands/WinMove.htm, and https://www.autohotkey.com/docs/Hotkeys.htm.

## Replicating Mouse Movements and Clicks
You can use MouseGetPos and MouseMove commands to get and set the mouse cursor position on your screen. Here are some examples:

- To get the current mouse position, you can use MouseGetPos with two output variables for the X and Y coordinates. For example, MouseGetPos, xpos, ypos will store the current mouse position in xpos and ypos variables.
- To move the mouse to a specific location, you can use MouseMove with two parameters for the X and Y coordinates. For example, MouseMove, 1000, 500 will move the mouse to (1000, 500) on your screen.
- To move the mouse back to its original position after clicking somewhere else, you can use MouseGetPos before clicking and MouseMove after clicking with the same output variables. For example,

```
; Get the current mouse position
MouseGetPos, origx, origy
; Click somewhere else
Click 987,851
; Move back to original position
MouseMove %origx%, %origy%
```

For more details and examples, please refer to https://www.autohotkey.com/docs/commands/MouseGetPos.htm and https://www.autohotkey.com/docs/commands/MouseMove.htm.
You can use Click command to perform a mouse click on a specific location or control on your screen. You can also specify different options for the click, such as:

- The button to click: Left (default), Right, Middle, X1 or X2. For example, Click Right will perform a right-click at the current mouse position.
- The number of times to click: 1 (default) or any positive integer. For example, Click 2 will perform a double-click at the current mouse position.
- The speed of clicking: 0 (fastest) to 100 (slowest), which can be an expression. For example, Click 50 will perform a single-click at half the maximum speed.
- The coordinates to move the mouse before clicking: X and Y coordinates relative to the active window or screen depending on CoordMode setting. For example, Click 1000, 500 will move the mouse to (1000, 500) and perform a single-click there.
- The mode of sending: Event (default) or Play. Event mode is more compatible and reliable but may not work for some games. Play mode may work better for games but is less reliable. For example, Click Play will use Play mode to send a single-click.

You can also use ControlClick command to click a specific control on a window without activating it . You need to specify the control's ClassNN (the internal name of the control) or text and the window's title or other criteria. For example,

```
; Click Button2 on WindowTitle without activating it
ControlClick Button2, WindowTitle
```

For more details and examples, please refer to https://www.autohotkey.com/docs/commands/Click.html, https://www.autohotkey.com/docs/commands/MouseClick.html, and https://www.autohotkey.com/docs/commands/ControlClick.html.

You can record mouse actions with Pulover's Macro Creator by following these steps :

- Start Pulover's Macro Creator.
- Click on the Record button on the toolbar or press Ctrl+R.
- Press the record hotkey (default is F9).
- Make mouse and keyboard actions.
- Press the record hotkey again to stop.
- Press the playback hotkey (default is F3) to reproduce your actions.

You can also change the recording settings, such as recording mode, speed, delay, and coordinates in the Options menu. For more details and examples, please refer to https://www.macrocreator.com/help/ and https://www.macrocreator.com/docs/Tutorial.html.


## Replicating Keyboard Keypresses
You can use Send command to send keystrokes or key combinations to the active window. You can also use different modifiers to change how the keystrokes are sent, such as:

- The prefix modifiers: symbols that correspond to modifier keys like Control (^), Shift (+), Alt (!), and Windows (#). For example, Send ^a will send Ctrl+A to select all text.
- The blind mode: {Blind} keyword that sends keystrokes without changing the state of modifier keys. For example, Send {Blind}{Ctrl up} will release Ctrl without affecting other modifiers.
- The raw mode: {Raw} keyword that sends keystrokes exactly as they appear rather than translating them. For example, Send {Raw}+a will send +a instead of A (Shift+A).
- The delay mode: {Delay Xms} keyword that sets a delay between keystrokes for X milliseconds. For example, Send {Delay 100ms}Hello will send Hello with a 100 ms delay between each letter.

You can also use other keywords and options for more advanced usage of Send command. For more details and examples, please refer to https://www.autohotkey.com/docs/commands/Send.htm and https://www.autohotkey.com/docs/v2/lib/Send.htm.
You can use ControlSend command to send keystrokes to a specific control of a window, even if it is not active or visible. You need to specify the control name or ID, the keystrokes, and the window title or ID as parameters. For example, ControlSend Edit1, Hello World!, Untitled - Notepad will send Hello World! to the edit control of Notepad.

However, some windows or controls may not accept keystrokes sent by ControlSend. In that case, you may need to activate the window briefly before sending keystrokes and then switch back to your current window. You can use WinActivate and WinRestore commands for that purpose. For more details and examples, please refer to https://www.autohotkey.com/docs/commands/ControlSend.htm and https://www.autohotkey.com/board/topic/2155-send-keystrokes-to-background-window/.
You can record keyboard actions with Pulover's Macro Creator by following these steps :

- Start Pulover's Macro Creator.
- Click on the Record button on the toolbar or press Ctrl+R.
- Press the record hotkey (default is F9).
- Make keyboard actions. You can also record mouse actions if you want.
- Press the record hotkey again to stop.
- Press the playback hotkey (default is F3) to reproduce your actions.

You can also edit, save, load, and export your recorded macros using Pulover's Macro Creator. For more details and examples, please refer to https://www.macrocreator.com/docs/Tutorial.html and https://www.macrocreator.com/help/.
