---
title: Resume generation in dart
description: Creating a resume programatically in dart
pubDate: Saturday, 27 June 2023 13:00:00 GMT
tags: ["flutter", "resume"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-29 11.41.51 - stars falling on the moon.png'
---

To create a resume in PDF format using Flutter, you can use a library like pdf.dart or pdf_flutter. Both of these libraries allow you to generate PDF documents from within a Flutter app by rendering Flutter widgets and layouts to PDF pages.

Here's an example of how you could use the pdf.dart library to create a simple resume PDF in dart:

1. First, add the pdf.dart library to your dart project by adding the following line to your pubspec.yaml file:

```dart
dependencies:
  pdf: ^1.5.1
```

2. Import the pdf library in your Flutter code:

```dart
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
```

3. Create a function that generates the PDF document. This function should return a PdfDocument object, which represents the PDF document. You can use the pw prefix to access the widgets provided by the pdf library, such as pw.Paragraph, pw.Table, and pw.Column.

```dart
PdfDocument generateResumePdf() {
  final document = PdfDocument();
  final page = pw.Page(
    pageFormat: PdfPageFormat.a4,
    build: (pw.Context context) {
      return pw.Column(
        children: <pw.Widget>[
          ...
        ],
      );
    },
  );
  document.addPage(page);
  return document;
}
```

To create a header for the resume, you can use the pw.Header widget with a pw.Text widget as its child. You can use the level property of the pw.Header widget to control the font size and style of the header text.

To create a horizontal rule, you can use the pw.Divider widget. This will draw a horizontal line across the page.

To display the address information, you can use a pw.Container widget with a pw.Column widget as its child, and add pw.Text widgets for each line of the address. You can use the alignment property of the pw.Container widget to control the alignment of the address information within the container.

```dart
 pw.Container(
          child: pw.Header(
            level: 0,
            child: pw.Text('FriendlyUser Resume'),
          ),
          // width 100%
          // width: double.infinity,
          alignment: pw.Alignment.center,
        ),
        // hr rule
        // address information
        pw.Container(
            alignment: pw.Alignment.center,
            child: pw.Column(children: [
              pw.Text('John Smith 123 Main St USA 12345'),
              pw.Text('(234) 345-4567'),
              pw.Text('jogn_smith@kage.com'),
            ])),
        // hr rule
        pw.Divider(),
```


To create this section, you can use a combination of Flutter's layout widgets and text widgets.

The pw.Container widget is used to contain the header text "Professional Experience", which is created using the pw.Header widget with a level of 1 and a pw.Text widget as its child. The alignment property of the pw.Container widget is used to center the header within the container.

To create the list of professional experience, you can use a pw.Row widget with two pw.Column widgets as its children. Each pw.Column widget contains a list of pw.Text widgets with the job title and company name on the left, and the location and time period on the right. The mainAxisAlignment property of the pw.Row widget is set to pw.MainAxisAlignment.spaceBetween to evenly distribute the space between the two columns. The crossAxisAlignment property of the pw.Column widgets is set to pw.CrossAxisAlignment.start for the left column and pw.CrossAxisAlignment.end for the right column to align the text within the columns.

The pw.SizedBox widget is used to add some vertical space between the professional experience items.

```dart
pw.Container(
  child: pw.Header(
    level: 1,
    child: pw.Text('Professional Experience'),
  ),
  alignment: pw.Alignment.center,
),
// to left job title and company to the right
pw.Row(
  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
  // max width
  mainAxisSize: pw.MainAxisSize.max,
  children: [
    pw.Column(
      // left align

      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text('Dli invest'),
        pw.Text('Software Engineer'),
      ],
    ),
    pw.Column(
      // right align
      crossAxisAlignment: pw.CrossAxisAlignment.end,
      children: [
        pw.Text('Canada, Remote'),
        pw.Text('August 2020 - Current'),
      ],
    ),
  ],
),
pw.SizedBox(height: 10),
```

To create a list of bullet points, you can use the pw.Bullet widget provided by the pdf library. The pw.Bullet widget takes a text property, which is the text of the bullet point. You can add multiple pw.Bullet widgets to a pw.Column widget to create a list of bullet points.

```dart
pw.Column(children: [
  pw.Bullet(text: 'Developed code in python and golang.'),
  pw.Bullet(text: 'Built out cutting edge software.'),
  pw.Bullet(text: 'Backtesting trades.'),
]),
```

To create this section, you can use a similar approach as the one described in the previous answer, using a pw.Row widget with two pw.Column widgets as its children. Each pw.Column widget contains a list of pw.Text widgets with the school name and degree on the left, and the GPA and time period on the right. The mainAxisAlignment property of the pw.Row widget is set to pw.MainAxisAlignment.spaceBetween to evenly distribute the space between the two columns. The crossAxisAlignment property of the pw.Column widgets is set to pw.CrossAxisAlignment.start for the left column and pw.CrossAxisAlignment.end for the right column to align the text within the columns.


```dart
pw.Row(
  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
  // max width
  mainAxisSize: pw.MainAxisSize.max,
  children: [
    pw.Column(
      // left align

      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text('University of Victoria'),
        pw.Text('Bachelor of Computer Engineering (with distinction)'),
      ],
    ),
    pw.Column(
      // right align
      crossAxisAlignment: pw.CrossAxisAlignment.end,
      children: [
        pw.Text("GPA: 6.9/9.0"),
        pw.Text('August 2000 - 2006'),
      ],
    ),
  ],
),
```

You can use the pw.ClipOval widget to create oval-shaped widgets with curved edges, and the pw.Padding widget to add padding around the text. You can also use the color and background properties of the pw.TextStyle widget to customize the appearance of the text.

This will create a list of two oval-shaped widgets with the text "Java" and "C++", respectively.

```dart
pw.Wrap(
  children: [
  pw.SizedBox(width: 10),
  pw.ClipOval(
    // curved edges
    child: pw.Padding(
      padding: pw.EdgeInsets.all(10),
      child: Text('Java',
        style: pw.TextStyle(
            color: PdfColors.cyan,
            background: BoxDecoration(
              color: PdfColors.purple900,
              border: Border.all(
                color: PdfColors.brown50,
                width: 50,
              ),
            )
          )
        )
      ),
  ),
  pw.SizedBox(width: 10),
  pw.ClipOval(
    // curved edges
    child: pw.Padding(
      padding: pw.EdgeInsets.all(10),
      child: Text('C++',
        style: pw.TextStyle(
            // padding
            color: PdfColors.pink,
            background: BoxDecoration(
              color: PdfColors.red900,
              border: Border.all(
                color: PdfColors.black,
                width: 50,
              ),
            )
          )
        )
      ),
    ),
  ]
)
```

## References

* https://github.com/FriendlyUser/flutter_resume