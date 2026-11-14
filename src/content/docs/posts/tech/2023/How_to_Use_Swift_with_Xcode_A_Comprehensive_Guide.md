---
description: Create an iOS app project in Xcode, find your way around the workspace, connect a storyboard button and label to Swift code, then run and debug it.
imgSrc: /imgs/2023/3170249337.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-31T16:56:30.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: Building a first iOS app in Xcode with Swift and storyboards
---

Xcode is Apple's IDE for building Swift apps for iOS, macOS, watchOS, tvOS and visionOS. This walkthrough creates an iOS project, tours the parts of the Xcode window you will use most, wires a button and a label in a storyboard to Swift code, and runs the app in the Simulator.

## Prerequisites

- A Mac that meets the requirements of the current Xcode release. Each Xcode version needs a minimum macOS version; Apple lists them on the [Xcode system requirements](https://developer.apple.com/xcode/system-requirements/) page.
- Xcode, installed from the Mac App Store or the [Apple Developer downloads](https://developer.apple.com/xcode/) page. On first launch it offers to install platform support (the iOS Simulator runtime); accept it.

You don't need a paid developer account to run apps in the Simulator.

## Creating a project

1. Open Xcode and choose **File > New > Project…** (Shift-Cmd-N), or use the new-project button on the welcome window.
2. Select the **iOS** tab and the **App** template, then click **Next**.
3. Fill in the options:
   - **Product Name**: the app's name, e.g. `TapCounter`.
   - **Organization Identifier**: reverse-domain notation such as `com.example`. Xcode combines it with the product name to make the **Bundle Identifier**.
   - **Interface**: SwiftUI is the default. This guide uses **Storyboard**, which gives you a UIKit app with an `AppDelegate`, a `SceneDelegate` and a `ViewController`.
   - **Language**: Swift.
   - Leave the testing and storage options at their defaults for now.
4. Pick a folder and click **Create**.

Older guides mention a separate "Life Cycle" option. Current versions of Xcode removed it: choosing Storyboard gives you the UIKit app delegate lifecycle.

## The Xcode window

- **Navigator** (left, toggle with Cmd-0): the project file list, search, issues and breakpoints.
- **Editor** (centre): code for Swift files, Interface Builder for storyboards.
- **Inspectors** (right, toggle with Cmd-Option-0): attributes, size and connections for whatever is selected.
- **Toolbar** (top): the Run and Stop buttons, plus the scheme and run destination (simulator or device).
- **Debug area** (bottom, toggle with Cmd-Shift-Y): console output, plus variables when paused at a breakpoint.

UI elements no longer live in a panel on the right. Open the **Library** with the **+** button in the toolbar or Cmd-Shift-L.

## Building the UI and connecting it to code

1. Open `Main.storyboard`. From the Library, drag a **Label** and a **Button** onto the view controller's canvas.
2. Open the assistant editor with **Editor > Assistant** (Ctrl-Option-Cmd-Return) so `ViewController.swift` appears next to the storyboard.
3. Control-drag from the label into the class body and create an **Outlet** named `countLabel`.
4. Control-drag from the button and create an **Action** named `buttonTapped`, with type `UIButton`.

Then fill in the code:

```swift
import UIKit

class ViewController: UIViewController {
    @IBOutlet weak var countLabel: UILabel!
    private var count = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        countLabel.text = "Taps: 0"
    }

    @IBAction func buttonTapped(_ sender: UIButton) {
        count += 1
        countLabel.text = "Taps: \(count)"
    }
}
```

## Running and debugging

1. Choose a simulator (for example an iPhone) from the run destination menu in the toolbar.
2. Press **Run** (Cmd-R). Xcode builds the app, boots the Simulator and attaches the debugger. Each tap should update the label.
3. To debug, click a line number in `buttonTapped` to add a breakpoint, tap the button again, and use the step controls in the debug area. Type `po count` at the `(lldb)` prompt to print a value.

## Common problems

- **"this class is not key value coding-compliant for the key …"** at launch means the storyboard still has a connection to an outlet you renamed or deleted in code. Select the view controller, open the Connections inspector and remove the stale connection.
- **Crash on `countLabel` being nil**: the outlet was declared in code but never connected in the storyboard. The filled circle next to `@IBOutlet` in the editor shows a connection exists; an empty circle means it does not.
- **Storyboards vs SwiftUI**: new Xcode templates default to SwiftUI. Storyboards are still supported and common in existing UIKit apps, but for a new app it is worth trying the SwiftUI template too.

## Further reading

- [Xcode documentation](https://developer.apple.com/documentation/xcode)
- [The Swift Programming Language](https://docs.swift.org/swift-book/)
