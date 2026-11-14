---
tags: ['gui', 'java']
title: Building a simple Swing GUI in Java with a button click handler
description: Create a Java Swing window with a label and a button, start it on the event dispatch thread, and handle clicks with an ActionListener.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2785394646.png
---

Swing is the desktop GUI toolkit that ships with the JDK (the `javax.swing` package, in the `java.desktop` module). It gives you components such as buttons, labels, text fields, tables and trees, layout managers to arrange them, and an event model for reacting to user input. You don't need any extra dependency to use it.

Swing is still supported but receives few new features. If you're starting a larger desktop app, also look at [JavaFX](https://openjfx.io/), which was unbundled from the JDK in Java 11 and is now distributed separately as OpenJFX.

## A window with a label and a button

```java
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;

public class MyGUI {
    private static void createAndShowGui() {
        JFrame frame = new JFrame("My GUI");

        JLabel label = new JLabel("Hello, Swing!", JLabel.CENTER);
        JButton button = new JButton("Click me!");
        button.addActionListener(e ->
                JOptionPane.showMessageDialog(frame, "Button clicked!"));

        JPanel panel = new JPanel(new BorderLayout());
        panel.add(label, BorderLayout.CENTER);
        panel.add(button, BorderLayout.SOUTH);

        frame.add(panel);
        frame.setSize(300, 200);
        frame.setLocationRelativeTo(null);   // centre on screen
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(MyGUI::createAndShowGui);
    }
}
```

Save it as `MyGUI.java` and run it directly with `java MyGUI.java` (Java 11+), or compile with `javac MyGUI.java` and run `java MyGUI`.

What's going on:

- `JFrame` is the top-level window. `setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE)` makes closing the window end the program; the default only hides it.
- `JPanel` with a `BorderLayout` places the label in the centre and the button along the bottom. A plain `JPanel` uses `FlowLayout`, which lays components out left to right.
- `setLocationRelativeTo(null)` centres the window. Call `setVisible(true)` last, after the components are added.

## Handling the button click

Swing reports a button click as an `ActionEvent` to every `ActionListener` registered on the button. `ActionListener` has a single method, `actionPerformed`, so a lambda is enough:

```java
button.addActionListener(e ->
        JOptionPane.showMessageDialog(frame, "Button clicked!"));
```

`JOptionPane.showMessageDialog` opens a modal dialog centred on `frame`.

You'll also see the older style where the frame class itself implements the listener:

```java
public class MyGUI extends JFrame implements ActionListener {
    @Override
    public void actionPerformed(ActionEvent e) {
        JOptionPane.showMessageDialog(this, "Button clicked!");
    }
}
```

That works (it needs `import java.awt.event.ActionEvent;` and `import java.awt.event.ActionListener;`), but one `actionPerformed` then has to handle every button, usually by checking `e.getSource()`. A lambda per button keeps each handler next to the component it belongs to.

## Gotchas

- **Use the event dispatch thread.** Swing isn't thread-safe. Create and update components on the event dispatch thread (EDT), which is why `main` calls `SwingUtilities.invokeLater` instead of building the window directly.
- **Don't block the EDT.** Listeners run on the EDT, so a slow network call or file read inside `actionPerformed` freezes the whole window. Move long work to a `SwingWorker` and update the UI when it finishes.
- **Look and feel.** By default Swing uses its own cross-platform "Metal" look, so it won't match native apps. Call `UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName())` before creating components if you want the platform style.

## Further reading

- [The Swing tutorial (Oracle)](https://docs.oracle.com/javase/tutorial/uiswing/)
- [Concurrency in Swing](https://docs.oracle.com/javase/tutorial/uiswing/concurrency/)
- [How to write an ActionListener](https://docs.oracle.com/javase/tutorial/uiswing/events/actionlistener.html)
