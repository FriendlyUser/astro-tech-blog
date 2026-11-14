---
title: Generating a PDF resume in Dart with the pdf package
description: Build a one-page resume PDF from Dart code with the pdf package, covering a centred header, two-column job and education rows, bullet points and skill tags.
pubDate: Saturday, 27 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["flutter", "resume", "dart"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-29 11.41.51 - stars falling on the moon.png'
---

The [pdf](https://pub.dev/packages/pdf) package creates PDF files from Dart code. It ships its own widget library (`package:pdf/widgets.dart`, usually imported as `pw`) that mirrors Flutter's layout widgets (`Column`, `Row`, `Container`, `Wrap` and so on). It doesn't render real Flutter widgets, though, and it runs in plain Dart as well as inside a Flutter app. This post builds a simple resume with it. The full project is in [flutter_resume](https://github.com/FriendlyUser/flutter_resume).

## Setup

Add the package to `pubspec.yaml`. This post was checked against version 3.13.1:

```yaml
dependencies:
  pdf: ^3.13.1
```

## Creating the document

A `pw.Document` holds the pages. Each `pw.Page` has a `build` callback that returns the page's widget tree, and `save()` returns the PDF bytes:

```dart
import 'dart:io';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

Future<void> main() async {
  final pdf = pw.Document();
  pdf.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      build: (pw.Context context) => pw.Column(
        children: [
          ...buildHeader(),
          ...buildExperience(),
          ...buildEducation(),
          buildSkills(),
        ],
      ),
    ),
  );
  await File('resume.pdf').writeAsBytes(await pdf.save());
}
```

Writing to a file works for a command-line script. In a Flutter app, the [printing](https://pub.dev/packages/printing) package (from the same author) can preview, print or share the bytes instead.

The sections below are the functions `main` calls. Put them in the same file and run it with `dart run`.

## Header and contact details

`pw.Header` draws a heading. `level` runs from 0 to 5, level 0 is the largest, and levels 0 and 1 are underlined. A centred `Container` holds the contact lines, and `pw.Divider` draws a horizontal rule under them:

```dart
List<pw.Widget> buildHeader() => [
      pw.Container(
        alignment: pw.Alignment.center,
        child: pw.Header(level: 0, child: pw.Text('FriendlyUser Resume')),
      ),
      pw.Container(
        alignment: pw.Alignment.center,
        child: pw.Column(children: [
          pw.Text('John Smith 123 Main St USA 12345'),
          pw.Text('(234) 345-4567'),
          pw.Text('john_smith@example.com'),
        ]),
      ),
      pw.Divider(),
    ];
```

## Experience and education rows

Both sections use the same layout: two lines on the left (company and title, or school and degree) and two on the right (location and dates). A `Row` with `MainAxisAlignment.spaceBetween` pushes the two columns to the edges, and each column's `crossAxisAlignment` aligns its text to its own edge. A helper keeps that layout in one place:

```dart
pw.Widget twoColumnRow(
  String topLeft,
  String bottomLeft,
  String topRight,
  String bottomRight,
) =>
    pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [pw.Text(topLeft), pw.Text(bottomLeft)],
        ),
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [pw.Text(topRight), pw.Text(bottomRight)],
        ),
      ],
    );
```

`pw.Bullet` renders a bulleted line, so a `Column` of them makes a list:

```dart
List<pw.Widget> buildExperience() => [
      pw.Container(
        alignment: pw.Alignment.center,
        child: pw.Header(level: 1, child: pw.Text('Professional Experience')),
      ),
      twoColumnRow(
        'Dli invest',
        'Software Engineer',
        'Canada, Remote',
        'August 2020 - Current',
      ),
      pw.SizedBox(height: 10),
      pw.Column(children: [
        pw.Bullet(text: 'Developed code in python and golang.'),
        pw.Bullet(text: 'Built out cutting edge software.'),
        pw.Bullet(text: 'Backtesting trades.'),
      ]),
    ];

List<pw.Widget> buildEducation() => [
      pw.Container(
        alignment: pw.Alignment.center,
        child: pw.Header(level: 1, child: pw.Text('Education')),
      ),
      twoColumnRow(
        'University of Victoria',
        'Bachelor of Computer Engineering (with distinction)',
        'GPA: 6.9/9.0',
        'August 2000 - 2006',
      ),
      pw.SizedBox(height: 10),
    ];
```

## Skill tags

The original version of this section used `pw.ClipOval` with Flutter's `Text`, `BoxDecoration` and `Border` classes, which aren't available under the `pw` prefix and wouldn't compile. A `Container` with a rounded `BoxDecoration` gives the same pill-shaped tag, and `Wrap` moves tags onto a new line when they run out of room:

```dart
pw.Widget skillTag(String label, PdfColor background, PdfColor textColor) =>
    pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: pw.BoxDecoration(
        color: background,
        borderRadius: pw.BorderRadius.circular(12),
      ),
      child: pw.Text(label, style: pw.TextStyle(color: textColor)),
    );

pw.Widget buildSkills() => pw.Wrap(
      spacing: 10,
      runSpacing: 6,
      children: [
        skillTag('Java', PdfColors.purple900, PdfColors.cyan),
        skillTag('C++', PdfColors.red900, PdfColors.pink),
      ],
    );
```

## Gotchas

- `pw.Page` lays out a single page. Once a resume grows past one page, switch to `pw.MultiPage`, whose `build` returns a `List<pw.Widget>` and which splits the content across pages.
- The default font is the PDF built-in Helvetica, which covers only a small Western character set. For other scripts, emoji or symbols, load a TTF with `pw.Font.ttf(...)` and pass it to the document as `theme: pw.ThemeData.withFont(base: font)`.
- Mixing up `package:flutter/material.dart` and `package:pdf/widgets.dart` is the most common mistake. Both define `Text`, `Row` and the rest, so keep the `pw` prefix on everything that goes into the PDF.

## Further reading

- [pdf package on pub.dev](https://pub.dev/packages/pdf)
- [flutter_resume repository](https://github.com/FriendlyUser/flutter_resume)
