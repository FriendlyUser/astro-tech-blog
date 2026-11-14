---
title: "What programming is and why it's worth learning"
pubDate: "2024-10-23T17:32:43.000Z"
lastUpdated: 2026-11-14
description: "A short explanation of what programming is, and the practical reasons to learn it: automating work, problem solving, careers and understanding the software you use."
tags: ["programming"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4042044064.webp
---

Programming is writing precise instructions, called code, that a computer can run. A program reads some input, transforms it, and produces output: a web page, a report, a moved robot arm, a sent email. Everything from spreadsheets to phone apps to the software in a car is built this way.

Here's a complete program in Python that reads a list of expenses and prints the total by category:

```python
from collections import defaultdict

expenses = [
    ("groceries", 54.20),
    ("transit", 3.35),
    ("groceries", 18.75),
    ("rent", 1450.00),
]

totals = defaultdict(float)
for category, amount in expenses:
    totals[category] += amount

for category, total in sorted(totals.items()):
    print(f"{category}: {total:.2f}")
```

Ten-odd lines replace a task you'd otherwise do by hand every month, and they give the same answer every time.

## Why it's worth learning

### You can automate your own work

The most immediate payoff isn't a job title. Renaming hundreds of files, cleaning up a spreadsheet, pulling data from a website or sending a weekly summary are all small programs. Someone who can write them saves hours on work that would otherwise be repetitive and error-prone.

### It trains a useful way of thinking

To get a program working you have to break a problem into steps small enough to state exactly, think about edge cases (what if the list is empty?), and test your assumptions against what actually happens. Those habits carry over to problems that have nothing to do with computers.

### It opens up careers

Software development is the obvious one, but programming is also a core skill in data analysis, scientific research, finance, design tooling, game development and security. In many fields that aren't "tech", knowing enough to write a script or query a database sets people apart.

### You understand the software around you

Knowing roughly how programs work makes it easier to judge what a tool can and can't do, to spot when an app is collecting more data than it needs, and to talk to engineers when you need something built.

### You can build things and share them

A laptop and free tools are enough to make a website, a game or a utility and put it in front of other people. Open-source projects let you read, learn from and contribute to code written by people anywhere in the world.

## Where to start

Pick one general-purpose language with lots of beginner material, such as Python or JavaScript, and use it to solve a problem you actually have. A small finished program teaches more than a long course you don't apply. Free starting points:

- [The official Python tutorial](https://docs.python.org/3/tutorial/)
- [MDN's JavaScript guide](https://developer.mozilla.org/docs/Web/JavaScript/Guide)
- [CS50](https://cs50.harvard.edu/x/), Harvard's free introductory computer science course
