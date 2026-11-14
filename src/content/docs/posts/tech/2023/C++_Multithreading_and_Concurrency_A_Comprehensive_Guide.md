---
title: "C++ multithreading basics: std::thread, mutexes, condition variables and std::async"
description: "Starting threads in standard C++, protecting shared data with mutexes and atomics, a working producer-consumer queue, and std::async and std::jthread."
imgSrc: /imgs/2023/4181036141.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-09-17T19:14:17.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
---

Since C++11 the standard library has had portable threads, mutexes, condition variables, atomics and futures, so you no longer need pthreads or the Win32 API for the basics. This post walks through those pieces with examples that compile as written. Build them with something like `g++ -std=c++20 -pthread main.cpp` (the `std::jthread` example needs C++20; the rest work with C++17).

## Concurrency vs. parallelism

The two terms get used interchangeably but mean different things:

- **Concurrency** is about structure: a program has several tasks in progress at once, which may be interleaved on a single core.
- **Parallelism** is about execution: tasks actually run at the same time on multiple cores.

Threads give you concurrency; whether you also get parallelism depends on the hardware and the scheduler.

## Where things live

The threading library is spread over several headers:

- `<thread>`: `std::thread`, `std::jthread` (C++20), `std::this_thread`
- `<mutex>`: `std::mutex`, `std::lock_guard`, `std::unique_lock`, `std::scoped_lock` (C++17)
- `<condition_variable>`: `std::condition_variable`
- `<atomic>`: `std::atomic`
- `<future>`: `std::async`, `std::future`, `std::promise`

Thread-local storage isn't a header at all: it's the `thread_local` keyword.

## Starting threads

`std::thread` takes a callable plus its arguments and starts running it immediately:

```cpp
#include <iostream>
#include <thread>

void print_number(int number) {
    std::cout << "Number: " << number << '\n';
}

int main() {
    std::thread t(print_number, 42);
    t.join();  // wait for the thread to finish
    std::cout << "Hello from main\n";
}
```

Arguments are copied into the thread. To pass a reference, wrap it in `std::ref` (from `<functional>`), and make sure the referenced object outlives the thread.

Before a `std::thread` object is destroyed you must call either `join()` or `detach()`. Destroying a thread that is still joinable calls `std::terminate`. A detached thread keeps running on its own and you can no longer wait for it, so it must not touch anything that might be destroyed first, including `main`'s locals and, at program exit, globals.

C++20's `std::jthread` removes the most common mistake: its destructor joins automatically. It also supports cooperative cancellation through a `std::stop_token`:

```cpp
#include <chrono>
#include <iostream>
#include <stop_token>
#include <thread>

int main() {
    std::jthread worker([](std::stop_token st) {
        while (!st.stop_requested()) {
            std::cout << "working\n";
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    });

    std::this_thread::sleep_for(std::chrono::milliseconds(350));
}   // ~jthread calls request_stop() and then join()
```

## Protecting shared data

Two threads writing the same variable without synchronization is a data race, which is undefined behaviour, not just a wrong answer.

### Mutexes and lock guards

A `std::mutex` lets one thread at a time into a critical section. Don't call `lock()` and `unlock()` by hand: if the code in between throws or returns early, the mutex stays locked. Use an RAII wrapper instead:

```cpp
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

std::mutex mtx;
long counter = 0;

void increment(int times) {
    for (int i = 0; i < times; ++i) {
        std::lock_guard<std::mutex> lock(mtx);  // unlocked at end of scope
        ++counter;
    }
}

int main() {
    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i)
        threads.emplace_back(increment, 100000);
    for (auto& t : threads)
        t.join();
    std::cout << counter << '\n';  // always 400000
}
```

If you need to lock two mutexes at once, use `std::scoped_lock lock(m1, m2);` (C++17). It acquires both without deadlocking even if another thread locks them in the opposite order.

### Atomics

For a single counter or flag, a mutex is overkill. `std::atomic` makes individual reads, writes and read-modify-write operations indivisible:

```cpp
#include <atomic>

std::atomic<long> counter{0};

void increment(int times) {
    for (int i = 0; i < times; ++i)
        ++counter;  // atomic fetch_add
}
```

Atomics only protect one variable at a time. If an invariant spans several variables, use a mutex.

### Condition variables: a producer-consumer queue

`std::condition_variable` lets a thread sleep until another thread signals that something changed. It always works with a `std::unique_lock` and a predicate, because wake-ups can be spurious. The consumer below stops when it sees the sentinel value `-1`:

```cpp
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <queue>
#include <thread>

std::mutex mtx;
std::condition_variable cv;
std::queue<int> data_queue;

void push(int value) {
    {
        std::lock_guard<std::mutex> lock(mtx);
        data_queue.push(value);
    }
    cv.notify_one();  // notify after unlocking so the consumer can grab the lock
}

void producer() {
    for (int i = 0; i < 10; ++i)
        push(i);
    push(-1);  // sentinel: tells the consumer to stop
}

void consumer() {
    while (true) {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [] { return !data_queue.empty(); });

        int data = data_queue.front();
        data_queue.pop();
        lock.unlock();  // don't hold the lock while doing the work

        if (data == -1)
            break;
        std::cout << "Consumed: " << data << '\n';
    }
}

int main() {
    std::thread c(consumer);
    std::thread p(producer);
    p.join();
    c.join();
}
```

## Tasks with `std::async`

When you just want a result computed on another thread, `std::async` returns a `std::future` and handles the thread for you. Exceptions thrown in the task are rethrown from `get()`:

```cpp
#include <future>
#include <iostream>

int slow_square(int x) { return x * x; }

int main() {
    std::future<int> f = std::async(std::launch::async, slow_square, 7);
    // ... do other work ...
    std::cout << f.get() << '\n';  // 49
}
```

Pass `std::launch::async` explicitly. With the default policy the implementation may defer the call and run it lazily on the thread that calls `get()`. Also note that the destructor of a future returned by `std::async` blocks until the task finishes, so a discarded `std::async(...)` call runs synchronously.

## Practical advice

- **Share as little as possible.** Pass data into threads by value, return results through futures, and use queues to hand work between threads. Every piece of shared mutable state needs a lock or an atomic.
- **Keep critical sections short.** Copy what you need under the lock, then release it before doing slow work like I/O.
- **Lock in a consistent order**, or use `std::scoped_lock` for multiple mutexes, to avoid deadlocks.
- **Use ThreadSanitizer.** Build tests with `-fsanitize=thread` (GCC and Clang) to catch data races that rarely show up in normal runs.
- **Don't create a thread per tiny task.** Starting a thread costs far more than a function call. For many small tasks, use a thread pool or a library such as oneTBB.

## Further reading

- [Concurrency support library (cppreference)](https://en.cppreference.com/w/cpp/thread)
- [`std::condition_variable` (cppreference)](https://en.cppreference.com/w/cpp/thread/condition_variable)
- [ThreadSanitizer (Clang docs)](https://clang.llvm.org/docs/ThreadSanitizer.html)
