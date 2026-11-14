---
description: Using Apache POI 6 to create, style and read Excel workbooks and to generate Word and PowerPoint files from Java, with runnable examples.
imgSrc: /imgs/2023/1086816529.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-01T14:36:17.000Z'
lastUpdated: 2026-11-14
tags: ["java"]
title: 'Apache POI: reading and writing Excel, Word and PowerPoint files in Java'
---

Apache POI is an Apache Software Foundation library for reading and writing Microsoft Office files from Java without Office installed. It handles both the old binary formats (`.xls`, `.doc`, `.ppt`) and the XML-based Office Open XML formats (`.xlsx`, `.docx`, `.pptx`). The name was originally a joke acronym, "Poor Obfuscation Implementation", about the old binary formats.

## Which classes handle which format

POI splits each file type into a binary module and an OOXML module:

| Format | Binary (97–2003) | OOXML (2007+) |
| --- | --- | --- |
| Excel | HSSF (`.xls`) | XSSF (`.xlsx`) |
| Word | HWPF (`.doc`) | XWPF (`.docx`) |
| PowerPoint | HSLF (`.ppt`) | XSLF (`.pptx`) |

POIFS is the lower-level layer that reads and writes the OLE2 container the binary formats are stored in. For Excel, the `org.apache.poi.ss.usermodel` interfaces (`Workbook`, `Sheet`, `Row`, `Cell`) work with both HSSF and XSSF, so you can write code once for both.

The Excel APIs are the most complete. The Word and PowerPoint modules handle common tasks well, but layout-heavy documents can need low-level XML work.

## Setup

POI 6.0.0 is the current release and needs Java 17 or newer. If you're stuck on Java 8 or 11, use the 5.5.x line. For OOXML support add `poi-ooxml`, which pulls in the core `poi` artifact:

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>6.0.0</version>
</dependency>
```

Gradle:

```groovy
dependencies {
    implementation 'org.apache.poi:poi-ooxml:6.0.0'
}
```

The binary Word and PowerPoint formats (HWPF and HSLF) are in a separate artifact, `poi-scratchpad`.

## Excel: write a workbook

Create a workbook, add a sheet, fill some cells and save it. `Workbook` is `Closeable`, so use try-with-resources.

```java
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileOutputStream;
import java.io.IOException;

public class ExcelWriteExample {
    public static void main(String[] args) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             FileOutputStream out = new FileOutputStream("example.xlsx")) {
            Sheet sheet = workbook.createSheet("Sheet1");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Item");
            header.createCell(1).setCellValue("Price");

            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("Coffee");
            row.createCell(1).setCellValue(3.5);

            Row total = sheet.createRow(2);
            total.createCell(0).setCellValue("Total");
            total.createCell(1).setCellFormula("SUM(B2:B2)");

            // Store the formula result in the file so other readers can see it
            workbook.getCreationHelper().createFormulaEvaluator().evaluateAll();

            workbook.write(out);
        }
    }
}
```

Use `HSSFWorkbook` instead of `XSSFWorkbook` to write `.xls`. For very large sheets, `SXSSFWorkbook` streams rows to a temporary file and keeps only a window of rows in memory.

## Excel: style cells

A `CellStyle` belongs to the workbook. Create each style once and reuse it across cells. Workbooks have a limit on the number of styles (64,000 for `.xlsx`), and creating one per cell in a loop is a common way to hit it.

```java
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileOutputStream;
import java.io.IOException;

public class ExcelFormattingExample {
    public static void main(String[] args) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             FileOutputStream out = new FileOutputStream("formatted_example.xlsx")) {
            Sheet sheet = workbook.createSheet("Sheet1");
            Cell cell = sheet.createRow(0).createCell(0);
            cell.setCellValue("Formatted Cell");

            CellStyle style = workbook.createCellStyle();
            style.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            cell.setCellStyle(style);

            sheet.autoSizeColumn(0);
            workbook.write(out);
        }
    }
}
```

The fill color only shows if you also set a fill pattern. `SOLID_FOREGROUND` with the foreground color is what gives a plain colored background.

## Excel: read a workbook

`WorkbookFactory.create` detects whether a file is `.xls` or `.xlsx` and returns the right implementation. `DataFormatter` turns a cell into the string Excel would display, which avoids switching on cell types yourself.

```java
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import java.io.File;
import java.io.IOException;

public class ExcelReadExample {
    public static void main(String[] args) throws IOException {
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(new File("example.xlsx"))) {
            Sheet sheet = workbook.getSheetAt(0);
            for (Row row : sheet) {
                for (Cell cell : row) {
                    System.out.print(formatter.formatCellValue(cell) + "\t");
                }
                System.out.println();
            }
        }
    }
}
```

For formula cells, POI 6 prints the result cached in the file. POI doesn't calculate formulas just because you set them, which is why the write example calls `evaluateAll()` before saving. Without that, a file written by POI and never opened in Excel has no cached results.

## Word: create a document

`XWPFDocument` handles `.docx`. A document is a list of paragraphs, and each paragraph is a list of runs, where a run is a stretch of text with the same formatting.

```java
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;

import java.io.FileOutputStream;
import java.io.IOException;

public class WordExample {
    public static void main(String[] args) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
             FileOutputStream out = new FileOutputStream("example.docx")) {
            XWPFParagraph paragraph = document.createParagraph();

            XWPFRun bold = paragraph.createRun();
            bold.setBold(true);
            bold.setText("Hello, ");

            XWPFRun plain = paragraph.createRun();
            plain.setText("Apache POI!");

            document.write(out);
        }
    }
}
```

## PowerPoint: create a slide

`XMLSlideShow` handles `.pptx`. A new presentation comes with a default slide master whose layouts you can use to create slides with placeholders.

```java
import org.apache.poi.xslf.usermodel.SlideLayout;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFSlideLayout;
import org.apache.poi.xslf.usermodel.XSLFSlideMaster;
import org.apache.poi.xslf.usermodel.XSLFTextShape;

import java.io.FileOutputStream;
import java.io.IOException;

public class PowerPointExample {
    public static void main(String[] args) throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow();
             FileOutputStream out = new FileOutputStream("example.pptx")) {
            XSLFSlideMaster master = ppt.getSlideMasters().get(0);
            XSLFSlideLayout titleLayout = master.getLayout(SlideLayout.TITLE);
            XSLFSlide slide = ppt.createSlide(titleLayout);

            XSLFTextShape title = slide.getPlaceholder(0);
            title.setText("Hello, Apache POI!");

            ppt.write(out);
        }
    }
}
```

## Gotchas

- **Memory.** `XSSFWorkbook` loads the whole file into memory, and large `.xlsx` files can take far more heap than their size on disk. Use `SXSSFWorkbook` for writing large files, and the event-based `XSSFReader` API for reading them.
- **Upgrading from 5.x to 6.0.** Besides the Java 17 requirement, 6.0 removed some deprecated methods, and `DataFormatter` now uses cached values for formula cells by default. Check the [changelog](https://poi.apache.org/changes.html) if output changes after upgrading.
- **Don't mix POI versions.** `poi`, `poi-ooxml` and `poi-scratchpad` must all be the same version, or you'll get `NoSuchMethodError`s at runtime.

## Further reading

- [Apache POI documentation](https://poi.apache.org/components/)
- [Busy Developers' Guide to HSSF and XSSF features](https://poi.apache.org/components/spreadsheet/quick-guide.html)
