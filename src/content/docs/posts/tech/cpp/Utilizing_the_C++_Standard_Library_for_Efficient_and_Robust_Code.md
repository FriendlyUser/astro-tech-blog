---
title: "C++ Standard Library basics: vector, list, map, algorithms and file I/O"
pubDate: "2023-05-03T14:16:44.621Z"
lastUpdated: 2026-11-14
description: "Short, runnable examples of std::vector, std::list, std::map, std::sort, std::find, std::transform and file streams, plus the gotchas that trip people up."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2575289368.webp
---

The C++ Standard Library gives you containers, algorithms that work on any container through iterators, and stream-based I/O. Reaching for it first usually means less code and fewer bugs than hand-rolled arrays and loops. Each example below is a complete program; the map example uses structured bindings, so compile with `-std=c++17` or later.

Every component lives in a header you include, for example `<vector>` for `std::vector`.

## Containers

### std::vector

`std::vector` is a contiguous, dynamically sized array. It is the default container to pick unless you have a reason not to: elements sit next to each other in memory, which makes iteration cache-friendly, and indexing is constant time.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};

    // at() checks bounds and throws std::out_of_range; [] does not check.
    std::cout << numbers.at(0) << ' ' << numbers[1] << '\n';

    numbers.push_back(6);  // append
    numbers.pop_back();    // remove the last element

    for (int num : numbers) {
        std::cout << num << ' ';
    }
    std::cout << '\n';
}
```

### std::list

`std::list` is a doubly linked list. Inserting or erasing is constant time *once you have an iterator to the position*; getting that iterator is a linear walk. In practice a `std::vector` is often faster even for middle insertions on small to medium data because of memory locality, so measure before switching.

```cpp
#include <iostream>
#include <iterator>
#include <list>

int main() {
    std::list<int> numbers = {1, 2, 3, 4, 5};

    numbers.insert(numbers.begin(), 0);         // insert at the front
    numbers.erase(std::next(numbers.begin()));  // remove the second element

    for (int num : numbers) {
        std::cout << num << ' ';
    }
    std::cout << '\n';  // 0 2 3 4 5
}
```

### std::map

`std::map` stores key-value pairs sorted by key (usually a red-black tree), with logarithmic insert, erase and lookup. If you don't need ordering, `std::unordered_map` gives average constant-time lookups.

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> ages = {{"Alice", 30}, {"Bob", 25}, {"Charlie", 20}};

    // at() throws if the key is missing; [] inserts a default value if it is missing.
    std::cout << ages.at("Alice") << ' ' << ages["Bob"] << '\n';

    ages["David"] = 35;    // insert or overwrite
    ages.erase("Charlie");

    // Structured bindings (C++17). Iteration is in key order.
    for (const auto& [name, age] : ages) {
        std::cout << name << ": " << age << '\n';
    }
}
```

## Algorithms

The functions in `<algorithm>` operate on iterator ranges, so the same `std::sort` or `std::find` works on a vector, an array, or anything else that provides the right kind of iterator.

### std::sort

`std::sort` orders a range using `operator<` by default, or a comparison you pass in. It needs random-access iterators, so it works on `std::vector` but not `std::list` (use the `list.sort()` member function there). It is not stable; use `std::stable_sort` if equal elements must keep their order.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {5, 3, 1, 4, 2};

    std::sort(numbers.begin(), numbers.end());  // 1 2 3 4 5

    // Descending, using a lambda as the comparison.
    std::sort(numbers.begin(), numbers.end(), [](int a, int b) { return a > b; });

    for (int num : numbers) {
        std::cout << num << ' ';
    }
    std::cout << '\n';  // 5 4 3 2 1
}
```

### std::find

`std::find` returns an iterator to the first matching element, or the end iterator if there is no match. It is a linear search; for sorted data use `std::lower_bound` or `std::binary_search`.

```cpp
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};

    auto it = std::find(numbers.begin(), numbers.end(), 3);

    if (it != numbers.end()) {
        std::cout << "Found " << *it << " at position "
                  << std::distance(numbers.begin(), it) << '\n';
    } else {
        std::cout << "Element not found.\n";
    }
}
```

### std::transform

`std::transform` applies a function to each element of an input range and writes the results to an output range. The output must already have room for the results (here the vector is sized up front), or you can pass `std::back_inserter(squared)` to an empty vector instead.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    std::vector<int> squared(numbers.size());

    std::transform(numbers.begin(), numbers.end(), squared.begin(),
                   [](int num) { return num * num; });

    for (int num : squared) {
        std::cout << num << ' ';
    }
    std::cout << '\n';  // 1 4 9 16 25
}
```

## File and string streams

`std::ifstream` reads files, `std::ofstream` writes them, and `std::stringstream` lets you build or parse strings with the same `<<` and `>>` operators.

```cpp
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

int main() {
    // Read a file line by line.
    std::ifstream input_file("input.txt");
    if (input_file) {
        std::string line;
        while (std::getline(input_file, line)) {
            std::cout << line << '\n';
        }
    } else {
        std::cerr << "Unable to open input file.\n";
    }

    // Write to a file.
    std::ofstream output_file("output.txt");
    if (output_file) {
        output_file << "Hello, World!\n";
    } else {
        std::cerr << "Unable to open output file.\n";
    }

    // Build a string with a stream.
    std::stringstream ss;
    ss << "Hello, " << "World!" << '\n';
    std::cout << ss.str();
}
```

Streams close their files in their destructors, so explicit `close()` calls are only needed if you want to close early or check for errors on close.

## Gotchas

- **Iterator invalidation.** `push_back` on a `std::vector` can reallocate and invalidate every iterator, pointer and reference into it. Don't hold iterators across insertions.
- **`map[key]` inserts.** Reading a missing key with `[]` silently adds it. Use `find()`, `contains()` (C++20) or `at()` when you only want to look.
- **Ranges (C++20).** `std::ranges::sort(numbers)` and `std::ranges::find(numbers, 3)` take the container directly instead of a begin/end pair, which removes a class of mismatched-iterator bugs.

## Further reading

- [cppreference: Containers library](https://en.cppreference.com/w/cpp/container)
- [cppreference: Algorithms library](https://en.cppreference.com/w/cpp/algorithm)
- [cppreference: Input/output library](https://en.cppreference.com/w/cpp/io)
