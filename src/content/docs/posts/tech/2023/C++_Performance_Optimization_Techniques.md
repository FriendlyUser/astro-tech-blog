---
title: "C++ performance optimization: compiler flags, profiling, memory and cache-friendly code"
description: "Practical ways to make C++ faster: optimization flags and PGO, profiling before changing code, avoiding allocations, cache-friendly layouts and parallel algorithms."
imgSrc: "/imgs/2023/DALL·E 2022-12-29 12.27.48 - ball cartoon on grass red white like pokeball.png"
layout: '@/templates/BasePost.astro'
pubDate: '2024-12-19T10:46:03.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
---

Most C++ performance wins come from a short list: let the compiler optimize properly, measure to find the actual hot spots, stop allocating in hot loops, and lay data out so the CPU cache works for you. This post goes through each, roughly in the order you should try them.

## Compiler flags

An unoptimized build (`-O0`, the GCC and Clang default) can easily be several times slower than an optimized one, so check this first.

```bash
g++ -O2 -march=native -flto main.cpp -o main
```

- `-O2` enables nearly all optimizations that don't trade code size for speed. `-O3` adds more aggressive inlining and vectorization; it is often faster, but not always, so measure both. `-Ofast` goes further by enabling `-ffast-math`, which breaks strict IEEE floating-point behaviour; only use it if you know your code tolerates that.
- `-march=native` lets the compiler use every instruction set extension of the build machine (AVX2, for example). The binary may crash with an illegal instruction on older CPUs, so don't use it for software you distribute.
- `-flto` enables link-time optimization, which allows inlining across source files. When you compile and link separately, pass it to both steps.

With MSVC, the rough equivalents are `/O2` and `/GL` (with `/LTCG` at link time).

### Profile-guided optimization

PGO lets the compiler optimize for how the program actually runs: which branches are taken, which functions are hot. With GCC it's a three-step build:

```bash
g++ -O2 -fprofile-generate main.cpp -o main
./main typical-input.txt          # writes .gcda profile files
g++ -O2 -fprofile-use main.cpp -o main
```

The profile is only as good as the workload you train it on, so use realistic input.

## Measure first

Guessing where the time goes is unreliable. Profile before changing code, then benchmark the change.

- **`perf`** (Linux): `perf record -g ./main` followed by `perf report` shows where CPU time is spent, with call stacks. Build with `-g` so it can show function names and source lines.
- **Valgrind's Callgrind**: `valgrind --tool=callgrind ./main` counts instructions precisely, but runs the program many times slower.
- **gprof**: needs a build with `-pg`. It's old and less accurate than `perf`, but works without extra tools.
- **Visual Studio's profiler** or Intel VTune on Windows.

For micro-benchmarks, use [Google Benchmark](https://github.com/google/benchmark) rather than timing a loop by hand; it repeats the measurement until it's stable and helps stop the compiler from optimizing the work away:

```cpp
#include <benchmark/benchmark.h>
#include <vector>

static void BM_PushBack(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> v;
        for (int i = 0; i < state.range(0); ++i)
            v.push_back(i);
        benchmark::DoNotOptimize(v.data());
    }
}
BENCHMARK(BM_PushBack)->Arg(1 << 16);

static void BM_PushBackReserved(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> v;
        v.reserve(state.range(0));
        for (int i = 0; i < state.range(0); ++i)
            v.push_back(i);
        benchmark::DoNotOptimize(v.data());
    }
}
BENCHMARK(BM_PushBackReserved)->Arg(1 << 16);

BENCHMARK_MAIN();
```

Build with `g++ -O2 bench.cpp -lbenchmark -lpthread -o bench`.

## Memory allocation

Heap allocation is slow compared with arithmetic, and it's easy to do a lot of it without noticing.

- **Reserve capacity** when you know the size: `v.reserve(n)` avoids repeated reallocation and copying as a vector grows.
- **Reuse buffers.** Declaring a `std::vector` or `std::string` inside a hot loop allocates on every iteration. Declare it outside the loop and `clear()` it, which keeps the capacity.
- **Pass large objects by `const&`** and return by value; the compiler elides or moves returned objects.
- **Use the stack for small, fixed-size data**, such as `std::array` instead of `std::vector` when the size is known at compile time.
- **Use an arena for many short-lived objects.** C++17's polymorphic allocators make this easy without writing an allocator from scratch:

```cpp
#include <cstddef>
#include <memory_resource>
#include <vector>

int main() {
    std::byte buffer[64 * 1024];
    std::pmr::monotonic_buffer_resource arena(buffer, sizeof(buffer));

    std::pmr::vector<int> v(&arena);  // allocations come from buffer
    for (int i = 0; i < 1000; ++i)
        v.push_back(i);
}   // everything is released at once when arena goes out of scope
```

A `monotonic_buffer_resource` never frees individual allocations, which makes allocation very cheap; when the buffer runs out it falls back to the heap.

## Data layout and the cache

A cache miss that goes all the way to main memory costs on the order of a hundred cycles, so how data sits in memory often matters more than instruction count.

Traverse memory in the order it's laid out. A 2D matrix stored row-major is fast to walk row by row and slow to walk column by column, even though both loops do the same arithmetic:

```cpp
#include <cstddef>
#include <vector>

// m holds an n x n matrix in row-major order: element (i, j) is m[i * n + j]
double sum_by_rows(const std::vector<double>& m, std::size_t n) {
    double s = 0;
    for (std::size_t i = 0; i < n; ++i)
        for (std::size_t j = 0; j < n; ++j)
            s += m[i * n + j];  // consecutive addresses
    return s;
}

double sum_by_columns(const std::vector<double>& m, std::size_t n) {
    double s = 0;
    for (std::size_t j = 0; j < n; ++j)
        for (std::size_t i = 0; i < n; ++i)
            s += m[i * n + j];  // jumps n * 8 bytes each step
    return s;
}
```

For large `n`, benchmark these two and the row-wise version wins by a wide margin. Other layout tips:

- **Prefer contiguous containers.** `std::vector` beats `std::list` and `std::map` for most workloads even when big-O says otherwise, because each list or map node is a separate allocation and following pointers defeats the prefetcher. A sorted `std::vector` with `std::lower_bound` is often faster than `std::map` for lookups.
- **Struct of arrays.** If a hot loop only reads one field of a large struct, storing that field in its own array means each cache line carries only useful data.
- **Watch for false sharing.** Two threads writing different variables that sit on the same 64-byte cache line will slow each other down. Pad or align per-thread data (`alignas(64)`).

## Let the compiler inline and vectorize

At `-O2` and above, the compiler decides what to inline and largely ignores the `inline` keyword for that purpose. What `inline` really does is allow a function to be defined in a header included by several source files. To help the compiler:

- Put small, hot functions where the compiler can see their definition (in headers, or enable LTO).
- Avoid virtual calls in tight loops when the type is known; they generally can't be inlined.
- Use forced inlining (`[[gnu::always_inline]]` on GCC/Clang, `__forceinline` on MSVC) only when a profile shows it helps.

The same goes for loops. Compilers already hoist loop-invariant calculations and unroll loops where it pays, so manual unrolling rarely helps and makes code harder to read. What does help is making loops easy to vectorize: simple counted loops, no function calls the compiler can't see into, and no possible aliasing between input and output pointers. GCC's `-fopt-info-vec-missed` reports loops it couldn't vectorize and why.

## Parallelism

Once single-threaded code is reasonable, use more cores. C++17 added execution policies to many standard algorithms:

```cpp
#include <algorithm>
#include <execution>
#include <vector>

void sort_big(std::vector<double>& v) {
    std::sort(std::execution::par, v.begin(), v.end());
}
```

The algorithms aren't parallel by default; you have to pass a policy such as `std::execution::par`. MSVC supports this out of the box. GCC's libstdc++ implements the parallel policies on top of Intel oneTBB, so install it and link with `-ltbb`. Parallelism only pays off for large inputs; for small ones the thread coordination costs more than it saves.

For your own task-level parallelism, see `std::thread`, `std::jthread` and `std::async`.

## When not to optimize

Optimize code the profiler points at, keep the benchmark that proves the change helped, and stop when it's fast enough. Tricks like manual unrolling or custom allocators make code harder to maintain, so they should be justified by a measurement, not by habit.

## Further reading

- [GCC optimization options](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)
- [Google Benchmark user guide](https://github.com/google/benchmark/blob/main/docs/user_guide.md)
- [Execution policies (cppreference)](https://en.cppreference.com/w/cpp/algorithm/execution_policy_tag_t)
- [Polymorphic memory resources (cppreference)](https://en.cppreference.com/w/cpp/memory/monotonic_buffer_resource)
