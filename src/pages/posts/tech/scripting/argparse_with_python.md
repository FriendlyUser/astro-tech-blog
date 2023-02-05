---
title: How to use argparse with python
description: Parsing git commits with golang
alt: git commits with golang
tags: ["python", "argparse"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 21 April 2023 13:00:00 GMT
imgSrc: '/imgs/2023/bear_book_1.png'
---

argparse is a Python module that makes it easy to write command-line interfaces. It allows you to specify the arguments that your program should accept in a clean and organized way, and it takes care of handling the input and output for you.

Here's an example of how to use argparse to parse command-line arguments in a Python script:


```python
argparse is a Python module that makes it easy to write command-line interfaces. It allows you to specify the arguments that your program should accept in a clean and organized way, and it takes care of handling the input and output for you.

Here's an example of how to use argparse to parse command-line arguments in a Python script:
```

This script defines a single command-line argument, --sum, which specifies whether the program should sum or find the maximum of the integers. If the --sum argument is not provided, the default action is to find the maximum.

To run this script, you would type something like python script.py 1 2 3 --sum at the command line. This would cause the script to print 6, which is the sum of the integers 1, 2, and 3.

Here's an example of how you might use argparse to write a command-line interface for a program that keeps track of the books that a bear has read:

```python
import argparse

parser = argparse.ArgumentParser(description='Bear book tracker')

# Add a command to add a book to the bear's reading list
parser.add_argument('--add', dest='book', type=str,
                    help='add a book to the reading list')

# Add a command to list the books that the bear has read
parser.add_argument('--list', action='store_true',
                    help='list the books that the bear has read')

# Parse the arguments
args = parser.parse_args()

# Initialize an empty list to store the bear's books
books = []

# If the --add argument was provided, add the book to the list
if args.book:
    books.append(args.book)

# If the --list argument was provided, print the list of books
if args.list:
    print("Bear's books:")
    for book in books:
        print(book)

```

To use this program, you would type something like python book_tracker.py --add "The Giving Tree" to add a book to the bear's reading list, or python book_tracker.py --list to view the list of books.

I hope this helps give you a basic understanding of how argparse works! Let me know if you have any questions.