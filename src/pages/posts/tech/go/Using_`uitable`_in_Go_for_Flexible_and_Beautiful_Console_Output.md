---
title: Using `uitable` in Go for Flexible and Beautiful Console Output
pubDate: "2023-05-30T19:37:45.987Z"
description: "In this article, we will explore `uitable`, a powerful Go package that enables developers to produce beautiful, flexible, and customizable console output in the form of tables."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using `uitable` in Go for Flexible and Beautiful Console Output

In this article, we will explore `uitable`, a powerful Go package that enables developers to produce beautiful, flexible, and customizable console output in the form of tables. We will cover the following topics:

1. Introduction to `uitable`
2. Installing `uitable`
3. Creating tables with `uitable`
4. Customizing table output
5. Advanced usage and tips

## 1. Introduction to `uitable`

`uitable` is a Go package that simplifies the creation and formatting of console-based tables. With support for dynamic column widths, alignment options, and custom formatting, `uitable` is a versatile tool for displaying data in an easy-to-read tabular format. You can find the source code and documentation on the [uitable GitHub repository](https://github.com/gosuri/uitable).

## 2. Installing `uitable`

To get started with `uitable`, you'll need to install the package. You can do this by running the following command:

```
go get -u github.com/gosuri/uitable
```

This will install the package and make it available for import in your Go programs.

## 3. Creating tables with `uitable`

Once you've installed `uitable`, you can start using it in your Go programs. First, import the package by adding the following line to your source code:

```go
import "github.com/gosuri/uitable"
```

Next, create a new table using the `New()` function, which returns a pointer to a `uitable.Table` struct:

```go
table := uitable.New()
```

Now you can add rows to your table using the `AddRow()` method. Let's create a simple table with three columns:

```go
table.AddRow("ID", "Name", "Age")
table.AddRow(1, "Alice", 30)
table.AddRow(2, "Bob", 28)
table.AddRow(3, "Charlie", 22)
```

To display the table, simply print it using the `fmt` package:

```go
fmt.Println(table)
```

This will produce the following output:

```
ID   Name     Age
1    Alice    30
2    Bob      28
3    Charlie  22
```

## 4. Customizing table output

`uitable` provides several options for customizing your table's appearance. For example, you can adjust the table's maximum width or set the column alignment.

### 4.1. Setting the maximum width

To set the maximum width of your table, use the `SetMaxWidth()` method:

```go
table.SetMaxWidth(80)
```

### 4.2. Adjusting column alignment

You can align the content of a column to the left, right, or center. To do this, use the `SetAlignFunc()` method:

```go
table.SetAlignFunc(2, uitable.AlignRight) // Align the third column to the right
```

## 5. Advanced usage and tips

### 5.1. Wrapping text

If a cell contains a long text, you can enable text wrapping using the `Wrap` property:

```go
table.Wrap = true
```

### 5.2. Custom formatters

You can create custom formatters to format your data before displaying it. For example, you might want to display floating-point numbers with a specific number of decimal places:

```go
table.AddRow("Value", 3.14159265359)
table.SetFormatter(1, func(value interface{}) string {
  return fmt.Sprintf("%.2f", value)
})
```

This will display the value as "3.14".

With `uitable`, you have a powerful tool at your disposal for creating flexible and beautiful console output in your Go applications. As you've seen, it's easy to get started, and the package offers a range of customization options to fine-tune your table output. Whether you're building a command-line interface or simply need to display data in a readable format, `uitable` is an excellent choice.
