---
title: "C++ debugging and profiling tools: GDB, LLDB, sanitizers, Valgrind, perf and VTune"
pubDate: "2023-09-16T19:17:25.000Z"
lastUpdated: 2026-11-14
description: "Which C++ debuggers and profilers to reach for on Linux, macOS and Windows, what each is good at, and the commands to get started with them."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/14447351.webp
---

Debuggers answer "why is this value wrong?" and profilers answer "where is the time going?". Which tools you can use depends mostly on your platform and compiler, so this post groups them that way and shows the commands to get started with each.

All the examples use this small program with an off-by-one bug:

```cpp
// overflow.cpp
#include <vector>

int main() {
    std::vector<int> v(10);
    for (int i = 0; i <= 10; ++i)  // off by one: writes v[10]
        v[i] = i;
    return v[0];
}
```

## Debuggers

All three debuggers below do the basics: breakpoints, stepping, inspecting and changing variables, watchpoints, and walking the call stack. Build with `-g` (or `/Zi` on MSVC) and, while debugging, `-O0` so variables aren't optimised away.

### GDB

[GDB](https://www.gnu.org/software/gdb/) is the standard debugger on Linux and works with both GCC and Clang output. It also runs on Windows through MinGW. On macOS it only works on Intel Macs and needs code-signing first; it doesn't support Apple Silicon, so use LLDB there.

```bash
g++ -g -O0 overflow.cpp -o overflow
gdb ./overflow
(gdb) break main
(gdb) run
(gdb) next
(gdb) print v        # libstdc++ pretty-printers show the vector's contents
(gdb) backtrace
```

Most people use GDB through an editor (VS Code, CLion, Eclipse CDT) rather than the bare CLI, but the CLI is handy over SSH and in CI.

### LLDB

[LLDB](https://lldb.llvm.org/) is the LLVM project's debugger. It is the default on macOS (Xcode uses it) and also runs on Linux and Windows. It reuses Clang's parser to evaluate C++ expressions, so it tends to cope well with templates in Clang-built code. Commands differ from GDB's but map closely; the [GDB to LLDB command map](https://lldb.llvm.org/use/map.html) is worth bookmarking.

```bash
clang++ -g -O0 overflow.cpp -o overflow
lldb ./overflow
(lldb) breakpoint set --name main
(lldb) run
(lldb) frame variable v
(lldb) thread backtrace
```

### Visual Studio debugger

On Windows with MSVC, the [Visual Studio debugger](https://learn.microsoft.com/en-us/visualstudio/debugger/) is the default choice. It reads PDB symbols, supports native and mixed native/.NET debugging, and has data breakpoints, conditional breakpoints and a memory view. VS Code uses the same engine via the C/C++ extension's `cppvsdbg` configuration.

## Sanitizers: catch memory bugs at the point they happen

A debugger only helps once you know where to look. Sanitizers instrument the binary at compile time and stop with a report on the first invalid access. AddressSanitizer (ASan) is supported by GCC, Clang and MSVC (`/fsanitize=address`), and its typical slowdown is about 2x, which is cheap enough to leave on for test builds.

```bash
g++ -g -O1 -fsanitize=address overflow.cpp -o overflow
./overflow
# ERROR: AddressSanitizer: heap-buffer-overflow ... WRITE of size 4
#     #0 0x... in main overflow.cpp:7
```

UndefinedBehaviorSanitizer (`-fsanitize=undefined`) catches signed overflow, misaligned access and similar, and ThreadSanitizer (`-fsanitize=thread`) finds data races. TSan can't be combined with ASan in the same build.

## Profilers and memory checkers

### Valgrind

[Valgrind](https://valgrind.org/) runs your unmodified binary on a synthetic CPU, so no recompiling is needed beyond `-g` for line numbers. It's a toolkit:

- **Memcheck** (default): invalid reads/writes, use of uninitialised memory, double frees and leaks.
- **Cachegrind**: simulates the cache hierarchy; add `--branch-sim=yes` for branch prediction.
- **Callgrind**: call-graph profile, viewable in KCachegrind.
- **Helgrind** and **DRD**: thread errors; **Massif**: heap usage over time.

```bash
valgrind --leak-check=full ./overflow
valgrind --tool=callgrind ./overflow
callgrind_annotate callgrind.out.<pid>
```

Expect Memcheck to run your program 20 to 30 times slower. Valgrind is mainly a Linux tool: upstream supports macOS only up to 13 (Ventura) on Intel, and there is no Windows port. On those platforms, use ASan instead.

### gprof

[gprof](https://sourceware.org/binutils/docs/gprof/) is part of GNU Binutils. You compile with `-pg`, run the program to produce `gmon.out`, and gprof turns that into a flat profile (time per function), a call graph, and with `-A` an annotated source listing.

```bash
g++ -O2 -g -pg app.cpp -o app
./app
gprof ./app gmon.out > profile.txt
```

It's simple but dated: it doesn't profile shared libraries, handles multithreaded programs poorly, and isn't usable with Apple's toolchain. On Linux, `perf` has largely replaced it.

### perf

[perf](https://perf.wiki.kernel.org/) is a sampling profiler that lives in the Linux kernel source tree (`tools/perf`) and ships as `linux-tools` or `linux-perf` on most distros. It reads hardware performance counters (cycles, cache misses, branch mispredictions) and can profile one process or the whole system without recompiling.

```bash
perf stat ./app            # counters: cycles, instructions, branch-misses...
perf record -g ./app       # sample with call stacks
perf report                # interactive breakdown by function
```

Build with `-fno-omit-frame-pointer` (or use `perf record --call-graph dwarf`) to get usable call stacks. Pipe the output into [FlameGraph](https://github.com/brendangregg/FlameGraph) scripts for flame graphs. perf is Linux-only.

### Intel VTune Profiler

[Intel VTune Profiler](https://www.intel.com/content/www/us/en/developer/tools/oneapi/vtune-profiler.html) is a proprietary but free profiler, available standalone or as part of the oneAPI Base Toolkit. It runs on Linux and Windows and covers hotspots, threading and lock contention, memory-access patterns and GPU offload, with a GUI and Visual Studio integration. Basic hotspot analysis works on AMD CPUs too, but the hardware event-based sampling analyses need an Intel processor.

## Which to pick

- **Linux:** GDB, ASan/UBSan in test builds, perf for CPU time, Valgrind when you can't recompile or want Cachegrind/Massif.
- **macOS:** LLDB, sanitizers, and Xcode's Instruments for profiling.
- **Windows:** the Visual Studio debugger and profiler, MSVC's ASan, and VTune if you need hardware counters.

Profile an optimised build (`-O2 -g`), not a debug build. Debug builds spend their time in places that disappear once the optimiser runs, so the profile points you at the wrong code.
