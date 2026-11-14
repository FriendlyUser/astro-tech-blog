---
tags: ['python', 'qt']
title: Building a PyQt6 app to edit a YAML file
description: A small PyQt6 window that loads a YAML post config, lets you edit its title, tags, description and sections, and saves it back to disk.
pubDate: Fri, 21 July 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2890612218.png
---

Qt is a C++ framework for building desktop GUIs, and PyQt6 is its Python binding. I wanted a small form for editing the YAML files I use to generate blog posts, so I didn't have to hand-edit them. Each file looks like this:

```yaml
imageArgs:
  prompt: "a robot writing a blog post"
frontMatter:
  title: "My post"
  description: "What the post is about"
  tags: [python, qt]
sections:
  - Introduction
  - Setup
```

The app shows the prompt, title, tags and description as text fields, the sections as a list you can add to and remove from, and has **Save** and **Load** buttons.

## Install

```bash
pip install PyQt6 pyyaml
```

PyQt6 is licensed under the GPL (or a commercial licence). If that doesn't suit your project, PySide6 is the LGPL-licensed binding from The Qt Company; the code below works there with mostly import changes.

## The full script

```python
import os
import sys

import yaml
from PyQt6.QtWidgets import (
    QApplication,
    QFileDialog,
    QGridLayout,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QLineEdit,
    QListWidget,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

DEFAULT_DATA = {
    "imageArgs": {"prompt": ""},
    "frontMatter": {"tags": [], "title": "", "description": ""},
}


class YamlEditor(QMainWindow):
    def __init__(self, yaml_file):
        super().__init__()
        self.setWindowTitle("YAML editor")
        self.yaml_file = yaml_file
        self.yaml_data = self.load_yaml()

        # Widgets
        self.prompt_edit = QLineEdit()
        self.tags_edit = QLineEdit()
        self.title_edit = QLineEdit()
        self.description_edit = QTextEdit()
        self.sections_list = QListWidget()
        self.add_section_button = QPushButton("Add Section")
        self.remove_section_button = QPushButton("Remove Section")
        self.save_button = QPushButton("Save")
        self.load_button = QPushButton("Load")

        # Signals
        self.add_section_button.clicked.connect(self.add_section)
        self.remove_section_button.clicked.connect(self.remove_section)
        self.save_button.clicked.connect(self.save_yaml)
        self.load_button.clicked.connect(self.external_yaml)

        # Layout
        grid_layout = QGridLayout()
        grid_layout.addWidget(QLabel("Prompt:"), 0, 0)
        grid_layout.addWidget(self.prompt_edit, 0, 1)
        grid_layout.addWidget(QLabel("Tags:"), 1, 0)
        grid_layout.addWidget(self.tags_edit, 1, 1)
        grid_layout.addWidget(QLabel("Title:"), 2, 0)
        grid_layout.addWidget(self.title_edit, 2, 1)
        grid_layout.addWidget(QLabel("Description:"), 3, 0)
        grid_layout.addWidget(self.description_edit, 3, 1)

        section_buttons = QHBoxLayout()
        section_buttons.addWidget(self.add_section_button)
        section_buttons.addWidget(self.remove_section_button)

        bottom_buttons = QHBoxLayout()
        bottom_buttons.addWidget(self.save_button)
        bottom_buttons.addWidget(self.load_button)

        main_layout = QVBoxLayout()
        main_layout.addLayout(grid_layout)
        main_layout.addWidget(QLabel("Sections:"))
        main_layout.addWidget(self.sections_list)
        main_layout.addLayout(section_buttons)
        main_layout.addLayout(bottom_buttons)

        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

        self.set_values_from_yaml()

    def load_yaml(self):
        try:
            with open(self.yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
        except FileNotFoundError:
            data = {}
        # Fill in any missing keys so the widgets always have something to show
        data.setdefault("imageArgs", {}).setdefault("prompt", "")
        front = data.setdefault("frontMatter", {})
        for key, value in DEFAULT_DATA["frontMatter"].items():
            front.setdefault(key, value)
        return data

    def set_values_from_yaml(self):
        front = self.yaml_data["frontMatter"]
        self.prompt_edit.setText(self.yaml_data["imageArgs"]["prompt"])
        self.tags_edit.setText(", ".join(front["tags"]))
        self.title_edit.setText(front["title"])
        self.description_edit.setPlainText(front["description"])
        self.sections_list.clear()
        self.sections_list.addItems(self.yaml_data.get("sections", []))

    def external_yaml(self):
        filename, _ = QFileDialog.getOpenFileName(
            self,
            "Select a file",
            os.getcwd(),
            "YAML files (*.yaml *.yml)",
        )
        if not filename:  # user cancelled
            return
        self.yaml_file = filename
        self.yaml_data = self.load_yaml()
        self.set_values_from_yaml()

    def add_section(self):
        section, ok = QInputDialog.getText(self, "Add Section", "Enter section title:")
        if ok and section:
            self.sections_list.addItem(section)

    def remove_section(self):
        current_row = self.sections_list.currentRow()
        if current_row != -1:
            self.sections_list.takeItem(current_row)

    def save_yaml(self):
        front = self.yaml_data["frontMatter"]
        self.yaml_data["imageArgs"]["prompt"] = self.prompt_edit.text()
        front["tags"] = [t.strip() for t in self.tags_edit.text().split(",") if t.strip()]
        front["title"] = self.title_edit.text()
        front["description"] = self.description_edit.toPlainText()
        sections = [self.sections_list.item(i).text() for i in range(self.sections_list.count())]
        if sections:
            self.yaml_data["sections"] = sections
        else:
            self.yaml_data.pop("sections", None)

        with open(self.yaml_file, "w", encoding="utf-8") as f:
            yaml.safe_dump(self.yaml_data, f, sort_keys=False, allow_unicode=True)

        QMessageBox.information(self, "Saved", f"Saved to {self.yaml_file}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    editor = YamlEditor("posts/chatgpt_chrome_extension.yml")
    editor.show()
    sys.exit(app.exec())
```

Run it with `python yaml_editor.py`. If the starting file doesn't exist, the form opens empty and **Save** creates it.

## How it fits together

- **`__init__`** loads the YAML first, builds the widgets, connects each button's `clicked` signal to a method, and lays everything out. A `QMainWindow` needs a central widget, so the layout goes on a plain `QWidget` passed to `setCentralWidget`.
- **`load_yaml`** uses `yaml.safe_load` and fills in missing keys, so a half-written file or a missing one doesn't crash the form.
- **`set_values_from_yaml`** copies the data into the widgets. It runs at startup and again after **Load**, otherwise loading a new file would change `self.yaml_data` without updating what's on screen.
- **`external_yaml`** opens a file picker. `QFileDialog.getOpenFileName` returns a `(filename, selected_filter)` tuple, and the filename is an empty string if the user cancels.
- **`save_yaml`** reads the widgets back into the dict and writes it to the file that was loaded. `sort_keys=False` keeps the keys in their original order, which keeps diffs small.

## Gotchas

- PyQt6 uses `app.exec()`. The old `exec_()` name from PyQt5 is gone.
- `yaml.safe_dump` drops comments and may change quoting. If you need to preserve the file's formatting, use `ruamel.yaml` instead of PyYAML.
- Splitting tags on commas means a tag can't contain a comma. For this file format that's fine.

## Further reading

- [PyQt6 documentation](https://www.riverbankcomputing.com/static/Docs/PyQt6/)
- [Qt widgets reference](https://doc.qt.io/qt-6/qtwidgets-index.html)
- [PyYAML documentation](https://pyyaml.org/wiki/PyYAMLDocumentation)
