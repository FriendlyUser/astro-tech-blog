---
title: Using UIProgress in GoLang A Step-by-Step Guide
pubDate: "2023-05-26T15:32:49.062Z"
description: " In this article, we will walk you through the process of using UIProgress in your GoLang projects."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1411559119.png
---
# Using UIProgress in GoLang: A Step-by-Step Guide

UIProgress is a popular Go package that provides functionality for creating progress bars in console applications. This library allows developers to create visually appealing progress bars with ease, making it an excellent choice for displaying progress in command-line programs. In this article, we will walk you through the process of using UIProgress in your GoLang projects.

## Prerequisites

Before diving into the implementation, ensure you have the following tools installed on your system:

1. GoLang: [Download and install](https://golang.org/dl/) the latest version of Go for your platform.
2. Git: Install [Git](https://git-scm.com/downloads) to manage your project's version control.

## Installing UIProgress

To begin, you will need to install the `uiprogress` library in your GoLang project. You can do this using the `go get` command as follows:

```sh
go get -u github.com/gosuri/uiprogress
```

This will download the library and add it to your `GOPATH`. Now, you're ready to start using UIProgress in your Go programs.

## Creating a Basic Progress Bar

Let's start by creating a simple progress bar that increments over time. First, create a new Go file called `main.. Then, import the `uiprogress` library and create a new progress bar as shown below:

```go
package main

import (
	"fmt"
	"time"

	"github.com/gosuri/uiprogress"
)

func main() {
	// Create a new progress bar
	uiprogress.Start() // initialize progress bars
	bar := uiprogress.AddBar(100)

	// Set the bar width and format
	bar.Width = 50
	bar.Format("Progress: " + uiprogress.Prefix("%d", "%%"))

	// Increment the progress bar over time
	go func() {
		for bar.Incr() {
			time.Sleep(time.Millisecond * 20)
		}
	}()

	// Wait for the progress bar to complete
	uiprogress.Stop()
}
```

When you run this program, you should see a progress bar that starts at 0% and increments until it reaches 100%.

## Customizing the Progress Bar

UIProgress offers various options to customize the appearance and behavior of your progress bars. Here are some examples:

### Changing the Progress Bar Characters

You can change the characters used to represent the progress bar by modifying the `Fill` and `Empty` properties:

```go
bar.Fill = '+'
bar.Empty = '-'
```

### Adding a Custom Progress Bar Formatter

You can create a custom progress bar formatter by implementing the `uiprogress.FormatterFunc` interface. For example, this formatter adds a custom prefix and suffix to the progress bar:

```go
bar.Formatter = func(b *uiprogress.Bar) string {
	return fmt.Sprintf("[My Progress] %s [%d%%] [Complete]", b.String(), b.Percent())
}
```

### Creating Multiple Progress Bars

UIProgress supports creating multiple progress bars simultaneously. To create additional progress bars, simply call the `uiprogress.AddBar()` function again:

```go
bar2 := uiprogress.AddBar(100)
```

## Conclusion

UIProgress is a powerful and easy-to-use library for adding progress bars to your GoLang console applications. With its flexible customization options and support for multiple progress bars, UIProgress is a valuable addition to any Go developer's toolkit.

In this article, we covered the basics of using UIProgress in your Go projects, from installation to customizing the appearance and behavior of progress bars. With this knowledge, you can now create visually appealing progress bars that enhance the user experience of your command-line programs.
