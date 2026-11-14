---
description: "An overview of the C++ standard containers and when to pick each, plus a runnable example using std::sort, binary search, std::erase_if and std::unordered_map."
imgSrc: /imgs/2023/4046799380-scrapping-oil-off-a-painting.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-17T14:56:26.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ standard library containers and algorithms: an overview with examples"
---

The C++ standard library separates *where data lives* (containers) from *what you do with it* (algorithms). Algorithms work on iterator ranges, so `std::sort` or `std::find` work with any container whose iterators meet their requirements. Knowing both halves saves you from writing your own loops for searching, sorting and counting.

## Containers

**Sequence containers** keep elements in the order you insert them:

- `std::vector`: contiguous, dynamically sized array. O(1) random access, amortised O(1) `push_back`. The default choice.
- `std::array`: fixed-size array with a size known at compile time.
- `std::deque`: O(1) insertion at both ends, random access, not contiguous.
- `std::list` / `std::forward_list`: doubly and singly linked lists. O(1) insert and erase at a known position, but no random access and poor cache locality.

**Ordered associative containers** (`std::set`, `std::map`, `std::multiset`, `std::multimap`) keep elements sorted by key, with O(log n) lookup, insertion and removal. Implementations typically use red-black trees.

**Unordered associative containers** (`std::unordered_set`, `std::unordered_map` and their `multi` variants) are hash tables: O(1) lookup on average, O(n) in the worst case, and no ordering.

**Container adaptors** wrap another container to give it a restricted interface: `std::stack`, `std::queue` and `std::priority_queue`. C++23 adds `std::flat_map` and `std::flat_set`, which store sorted keys in contiguous storage; library support varies, so check your compiler.

The containers don't share one identical interface. Most have `size()`, `empty()`, `begin()` and `end()`, but `std::forward_list` has no `size()`, `std::array` can't `insert()` or `erase()`, and the adaptors expose `push()`/`pop()` and no iterators at all.

## Algorithms

Most algorithms live in `<algorithm>`; numeric ones such as `std::accumulate` and `std::reduce` are in `<numeric>`. The main groups:

- Non-modifying: `std::find`, `std::count`, `std::mismatch`, `std::equal`
- Modifying: `std::copy`, `std::move`, `std::transform`, `std::replace`, `std::remove`
- Sorting and partitioning: `std::sort`, `std::stable_sort`, `std::partial_sort`, `std::nth_element`
- Binary search on sorted ranges: `std::lower_bound`, `std::upper_bound`, `std::equal_range`, `std::binary_search`
- Heap: `std::make_heap`, `std::push_heap`, `std::pop_heap`, `std::sort_heap`
- Min/max: `std::min`, `std::max`, `std::min_element`, `std::max_element`, `std::minmax_element`

Since C++20, most of these also have a `std::ranges::` version that takes the container directly, for example `std::ranges::sort(numbers)`.

## A worked example

This program finds the minimum and maximum in one pass, sorts and searches a vector, removes elements, and counts words with a hash map. Compile with `-std=c++20` (needed for `std::erase_if`).

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<int> numbers = {4, 2, 9, 5, 1, 8, 7, 6, 3};

    // Smallest and largest in a single pass
    auto [min_it, max_it] = std::minmax_element(numbers.begin(), numbers.end());
    std::cout << "min " << *min_it << ", max " << *max_it << '\n';

    // Binary search only works on a sorted range
    std::sort(numbers.begin(), numbers.end());
    bool has_seven = std::binary_search(numbers.begin(), numbers.end(), 7);
    auto first_ge_5 = std::lower_bound(numbers.begin(), numbers.end(), 5);
    std::cout << "has 7: " << std::boolalpha << has_seven
              << ", first >= 5 at index " << (first_ge_5 - numbers.begin()) << '\n';

    // Remove the even numbers (C++20)
    std::erase_if(numbers, [](int n) { return n % 2 == 0; });
    std::cout << "odd:";
    for (int n : numbers) std::cout << ' ' << n;
    std::cout << '\n';

    // Count occurrences with a hash map
    std::vector<std::string> words = {"apple", "pear", "apple", "fig", "pear", "apple"};
    std::unordered_map<std::string, int> counts;
    for (const auto& w : words) ++counts[w];
    std::cout << "apple appears " << counts["apple"] << " times\n";
}
```

Output:

```text
min 1, max 9
has 7: true, first >= 5 at index 4
odd: 1 3 5 7 9
apple appears 3 times
```

## Gotchas

- **`std::remove` doesn't shrink the container.** It moves the kept elements forward and returns the new logical end; you still have to call `erase`. Before C++20 that was the erase-remove idiom, `v.erase(std::remove(v.begin(), v.end(), x), v.end())`; now `std::erase` and `std::erase_if` do it in one call.
- **Iterator invalidation.** A `std::vector` that reallocates (for example on `push_back` past its capacity) invalidates every iterator, pointer and reference into it.
- **`map::operator[]` inserts.** Reading `counts["missing"]` adds a default-constructed entry. Use `find`, `contains` (C++20) or `at` when you only want to look.
- **Binary search needs sorted input.** `std::lower_bound` on an unsorted range returns a meaningless result rather than an error.
- **`std::sort` needs random-access iterators**, so it won't compile for `std::list`. Use the member function `list.sort()` instead.

## Further reading

- [Containers library on cppreference](https://en.cppreference.com/w/cpp/container)
- [Algorithms library on cppreference](https://en.cppreference.com/w/cpp/algorithm)
