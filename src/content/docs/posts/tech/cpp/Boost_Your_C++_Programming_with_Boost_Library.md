---
title: "Getting started with Boost in C++: installing, linking and a first example"
pubDate: "2023-05-05T16:16:44.676Z"
lastUpdated: 2026-11-14
description: "How to install Boost, which libraries are header-only and which need linking, a tour of Asio, Regex, Filesystem, Spirit and Graph, and a Tokenizer example."
tags: ["cpp", "boost"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1931041591.webp
---

Boost is a collection of peer-reviewed, portable C++ libraries distributed under the Boost
Software License. Several standard library features started there (`shared_ptr`, `optional`,
`variant`, `filesystem`), and it still fills gaps the standard doesn't cover, such as
networking, parsing and graph algorithms.

## Installing Boost

The easiest route is a package manager:

```bash
sudo apt install libboost-all-dev   # Debian/Ubuntu
brew install boost                  # macOS
vcpkg install boost                 # Windows/cross-platform (or install individual ports)
```

You can also download a release from [boost.org](https://www.boost.org/users/download/) and
follow the [getting started guide](https://www.boost.org/doc/libs/latest/more/getting_started/).

## Header-only vs compiled libraries

Most Boost libraries are header-only: include the header and you're done.

```cpp
#include <boost/regex.hpp>
```

Some need a compiled library at link time, for example Boost.Filesystem, Boost.Thread,
Boost.ProgramOptions, Boost.Serialization, Boost.Log and Boost.Locale. With GCC or Clang that
means adding the library to the link line, e.g. `-lboost_filesystem`; with CMake, use
`find_package(Boost REQUIRED COMPONENTS filesystem)` and link `Boost::filesystem`.

Boost.Regex was in the compiled group for a long time but has been header-only (in C++11 and
later) since Boost 1.76, so older instructions telling you to link `boost_regex` are out of date.

## A few libraries worth knowing

### Boost.Asio

Asynchronous I/O for networking (TCP, UDP, SSL), timers, and signal handling, built around
an `io_context` event loop. It works with callbacks, futures or C++20 coroutines. Asio is
header-only; on Linux you also link the system threads library (`-pthread`). It is also
available without the rest of Boost as standalone Asio.

### Boost.Regex

Regular expressions with Perl syntax by default, plus POSIX and other syntax options, and
Unicode support through ICU. C++11's `std::regex` was based on it; Boost.Regex still offers
more, such as Perl-style extensions and ICU-based Unicode matching.

### Boost.Filesystem

Portable paths, directory iteration, and copying, renaming and removing files. If you're on
C++17, `std::filesystem` (which was based on it) covers most of the same ground without the
extra dependency.

### Boost.Spirit

A parser framework where you write EBNF-like grammars directly in C++ using operator
overloading. Spirit X3 is the current version; Spirit Qi is the older one. Useful for
small domain-specific languages and custom data formats, at the cost of long compile times and
dense error messages.

### Boost.Graph

The Boost Graph Library (BGL) provides graph containers (`adjacency_list`,
`adjacency_matrix`, `compressed_sparse_row_graph`) and generic algorithms such as breadth-first
and depth-first search, Dijkstra's shortest paths, and Kruskal's and Prim's minimum spanning
trees. It's header-only except for the GraphViz/GraphML parsers.

## Example: splitting a string with Boost.Tokenizer

Boost.Tokenizer splits a string into tokens without you writing the loop by hand:

```cpp
#include <iostream>
#include <string>
#include <boost/tokenizer.hpp>

int main() {
    std::string input_str = "Boost, C++, Library, Example";
    boost::char_separator<char> sep(", ");
    boost::tokenizer<boost::char_separator<char>> tokens(input_str, sep);

    for (const auto& token : tokens) {
        std::cout << token << '\n';
    }
}
```

`char_separator` treats each character in `", "` as a separator, so both commas and spaces
split the string, and empty tokens are dropped by default. The output is:

```text
Boost
C++
Library
Example
```

Tokenizer is header-only, so this builds with no extra link flags:

```bash
g++ -std=c++17 main.cpp -o tokenize
```

If Boost isn't in a standard include path (e.g. a manual download), add
`-I/path/to/boost_root`.

## Things to know before adding Boost

- Check the standard library first. Since C++11/17/20 a lot of what people used to pull Boost
  in for (smart pointers, `optional`, `variant`, `any`, `filesystem`, `thread`) is in `std::`.
- Boost libraries depend on each other, so a single include can pull in a lot of headers and
  slow compiles. Package managers like vcpkg let you install individual libraries rather than
  all of Boost.
- Each library has its own documentation and maintainers; start from the
  [library list](https://www.boost.org/doc/libs/) and read the docs for the one you need.
