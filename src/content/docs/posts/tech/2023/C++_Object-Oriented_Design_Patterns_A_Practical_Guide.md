---
title: "Classic design patterns in modern C++: Singleton, factories, Builder, Adapter, Composite and Decorator"
description: "Compilable C++17 examples of nine Gang of Four creational and structural patterns, using std::unique_ptr for ownership instead of raw new and delete."
imgSrc: /imgs/2023/other
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-17T16:45:07.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
---

Design patterns are named, reusable solutions to recurring design problems. The classic catalogue is the 1994 "Gang of Four" book, *Design Patterns: Elements of Reusable Object-Oriented Software*, which sorts them into three groups:

- **Creational** patterns control how objects are created.
- **Structural** patterns control how classes and objects are composed.
- **Behavioral** patterns control how objects communicate.

This post covers the creational patterns and the most common structural ones, with small C++17 examples that compile as written. They use `std::unique_ptr` and `std::make_unique` so ownership is explicit; the textbook versions that return raw `new`-ed pointers leave the caller to remember `delete`.

## Creational patterns

### Singleton

**Intent:** ensure a class has exactly one instance and provide a global access point to it.

```cpp
class Config {
public:
    static Config& instance() {
        static Config inst;  // created on first call
        return inst;
    }

    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;

private:
    Config() = default;
};
```

Since C++11, initialization of a function-local `static` is thread-safe, so this "Meyers singleton" needs no locks. The downside is that a singleton is global state: it hides dependencies and makes tests share state. Passing the object in as a parameter is often the better design.

### Factory Method

**Intent:** define an interface for creating an object, but let subclasses decide which class to instantiate.

```cpp
#include <iostream>
#include <memory>

class Document {
public:
    virtual ~Document() = default;
    virtual void open() = 0;
};

class TextDocument : public Document {
public:
    void open() override { std::cout << "Opening text document\n"; }
};

class Spreadsheet : public Document {
public:
    void open() override { std::cout << "Opening spreadsheet\n"; }
};

class Application {
public:
    virtual ~Application() = default;

    void newDocument() {
        std::unique_ptr<Document> doc = createDocument();  // subclass decides
        doc->open();
    }

protected:
    virtual std::unique_ptr<Document> createDocument() = 0;
};

class TextEditor : public Application {
protected:
    std::unique_ptr<Document> createDocument() override {
        return std::make_unique<TextDocument>();
    }
};

class SpreadsheetApp : public Application {
protected:
    std::unique_ptr<Document> createDocument() override {
        return std::make_unique<Spreadsheet>();
    }
};

int main() {
    TextEditor editor;
    editor.newDocument();  // Opening text document
}
```

`Application::newDocument` contains the shared logic; only the "which class" decision is deferred to subclasses.

### Abstract Factory

**Intent:** create families of related objects without naming their concrete classes. A typical use is UI themes, where every widget must come from the same theme.

```cpp
#include <iostream>
#include <memory>

class Button {
public:
    virtual ~Button() = default;
    virtual void draw() const = 0;
};

class Checkbox {
public:
    virtual ~Checkbox() = default;
    virtual void draw() const = 0;
};

class DarkButton : public Button {
public:
    void draw() const override { std::cout << "dark button\n"; }
};
class DarkCheckbox : public Checkbox {
public:
    void draw() const override { std::cout << "dark checkbox\n"; }
};
class LightButton : public Button {
public:
    void draw() const override { std::cout << "light button\n"; }
};
class LightCheckbox : public Checkbox {
public:
    void draw() const override { std::cout << "light checkbox\n"; }
};

class WidgetFactory {
public:
    virtual ~WidgetFactory() = default;
    virtual std::unique_ptr<Button> makeButton() const = 0;
    virtual std::unique_ptr<Checkbox> makeCheckbox() const = 0;
};

class DarkTheme : public WidgetFactory {
public:
    std::unique_ptr<Button> makeButton() const override { return std::make_unique<DarkButton>(); }
    std::unique_ptr<Checkbox> makeCheckbox() const override { return std::make_unique<DarkCheckbox>(); }
};

class LightTheme : public WidgetFactory {
public:
    std::unique_ptr<Button> makeButton() const override { return std::make_unique<LightButton>(); }
    std::unique_ptr<Checkbox> makeCheckbox() const override { return std::make_unique<LightCheckbox>(); }
};

// Client code only sees the abstract types
void drawForm(const WidgetFactory& factory) {
    factory.makeButton()->draw();
    factory.makeCheckbox()->draw();
}

int main() {
    drawForm(DarkTheme{});  // dark button, dark checkbox
}
```

### Builder

**Intent:** separate the step-by-step construction of a complex object from its final representation.

The Gang of Four version has a `Director` that calls abstract build steps on a `Builder`. In C++ the more common form is a fluent builder whose setters return `*this`:

```cpp
#include <iostream>
#include <string>
#include <utility>

struct HttpRequest {
    std::string method = "GET";
    std::string url;
    std::string body;
    int timeoutSeconds = 30;
};

class HttpRequestBuilder {
public:
    explicit HttpRequestBuilder(std::string url) { req_.url = std::move(url); }

    HttpRequestBuilder& method(std::string m) { req_.method = std::move(m); return *this; }
    HttpRequestBuilder& body(std::string b) { req_.body = std::move(b); return *this; }
    HttpRequestBuilder& timeout(int seconds) { req_.timeoutSeconds = seconds; return *this; }

    HttpRequest build() const { return req_; }

private:
    HttpRequest req_;
};

int main() {
    HttpRequest req = HttpRequestBuilder("https://example.com/api")
                          .method("POST")
                          .body(R"({"name": "test"})")
                          .timeout(10)
                          .build();
    std::cout << req.method << ' ' << req.url << '\n';  // POST https://example.com/api
}
```

A builder earns its keep when construction needs validation or has many optional parts. For a plain struct like this one, C++20 designated initializers (`HttpRequest{.method = "POST", .url = "..."}`) may be enough.

### Prototype

**Intent:** create new objects by copying an existing instance, without knowing its concrete type.

```cpp
#include <memory>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double r) : radius(r) {}
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
    double radius;
};

class Square : public Shape {
public:
    explicit Square(double s) : side(s) {}
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Square>(*this); }
    double side;
};

// Deep-copy a collection of shapes without knowing their concrete types
std::vector<std::unique_ptr<Shape>> copyAll(const std::vector<std::unique_ptr<Shape>>& shapes) {
    std::vector<std::unique_ptr<Shape>> out;
    out.reserve(shapes.size());
    for (const auto& s : shapes)
        out.push_back(s->clone());
    return out;
}
```

This is the standard fix for the fact that you can't copy a polymorphic object through a base-class pointer. With raw pointers you can use covariant return types (`Circle* clone() const override`); with `std::unique_ptr` you can't, so every override returns `std::unique_ptr<Shape>`.

## Structural patterns

### Adapter

**Intent:** make an existing class usable through an interface it doesn't implement.

```cpp
#include <iostream>
#include <string>

// The interface the rest of the code expects
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

// A class you can't change, e.g. from a third-party library
class LegacyLogger {
public:
    void writeLine(const char* level, const char* text) {
        std::cout << '[' << level << "] " << text << '\n';
    }
};

class LegacyLoggerAdapter : public Logger {
public:
    explicit LegacyLoggerAdapter(LegacyLogger& legacy) : legacy_(legacy) {}
    void log(const std::string& msg) override { legacy_.writeLine("INFO", msg.c_str()); }

private:
    LegacyLogger& legacy_;
};

int main() {
    LegacyLogger legacy;
    LegacyLoggerAdapter logger(legacy);
    logger.log("started");  // [INFO] started
}
```

### Bridge

**Intent:** split an abstraction from its implementation so the two can vary independently. Without it, *n* shapes times *m* rendering back ends means *n × m* subclasses; with it you write *n + m*.

```cpp
#include <iostream>
#include <memory>
#include <utility>

// Implementation side
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void drawCircle(double x, double y, double r) = 0;
};

class SvgRenderer : public Renderer {
public:
    void drawCircle(double x, double y, double r) override {
        std::cout << "<circle cx=\"" << x << "\" cy=\"" << y << "\" r=\"" << r << "\"/>\n";
    }
};

class TextRenderer : public Renderer {
public:
    void drawCircle(double x, double y, double r) override {
        std::cout << "circle at (" << x << ", " << y << ") radius " << r << '\n';
    }
};

// Abstraction side
class Shape {
public:
    explicit Shape(std::shared_ptr<Renderer> renderer) : renderer_(std::move(renderer)) {}
    virtual ~Shape() = default;
    virtual void draw() = 0;

protected:
    std::shared_ptr<Renderer> renderer_;
};

class Circle : public Shape {
public:
    Circle(std::shared_ptr<Renderer> renderer, double x, double y, double r)
        : Shape(std::move(renderer)), x_(x), y_(y), r_(r) {}
    void draw() override { renderer_->drawCircle(x_, y_, r_); }

private:
    double x_, y_, r_;
};

int main() {
    Circle a(std::make_shared<SvgRenderer>(), 1, 2, 3);
    Circle b(std::make_shared<TextRenderer>(), 1, 2, 3);
    a.draw();
    b.draw();
}
```

### Composite

**Intent:** build tree structures where clients treat single objects and groups of objects the same way. A file system is the usual example: a directory's size is the sum of its children's sizes, whether they're files or more directories.

```cpp
#include <iostream>
#include <memory>
#include <utility>
#include <vector>

class Node {
public:
    virtual ~Node() = default;
    virtual long size() const = 0;
};

class File : public Node {
public:
    explicit File(long bytes) : bytes_(bytes) {}
    long size() const override { return bytes_; }

private:
    long bytes_;
};

class Directory : public Node {
public:
    void add(std::unique_ptr<Node> child) { children_.push_back(std::move(child)); }

    long size() const override {
        long total = 0;
        for (const auto& child : children_)
            total += child->size();
        return total;
    }

private:
    std::vector<std::unique_ptr<Node>> children_;
};

int main() {
    auto sub = std::make_unique<Directory>();
    sub->add(std::make_unique<File>(200));

    Directory root;
    root.add(std::make_unique<File>(100));
    root.add(std::move(sub));

    std::cout << root.size() << '\n';  // 300
}
```

Because `Directory` owns its children through `std::unique_ptr`, destroying the root frees the whole tree.

### Decorator

**Intent:** add behaviour to an object at run time by wrapping it in another object with the same interface, instead of creating a subclass for every combination.

```cpp
#include <cctype>
#include <iostream>
#include <memory>
#include <string>
#include <utility>

class Writer {
public:
    virtual ~Writer() = default;
    virtual void write(const std::string& text) = 0;
};

class ConsoleWriter : public Writer {
public:
    void write(const std::string& text) override { std::cout << text << '\n'; }
};

// Base decorator: forwards to the wrapped writer
class WriterDecorator : public Writer {
public:
    explicit WriterDecorator(std::unique_ptr<Writer> inner) : inner_(std::move(inner)) {}
    void write(const std::string& text) override { inner_->write(text); }

private:
    std::unique_ptr<Writer> inner_;
};

class UppercaseWriter : public WriterDecorator {
public:
    using WriterDecorator::WriterDecorator;
    void write(const std::string& text) override {
        std::string upper = text;
        for (char& c : upper)
            c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        WriterDecorator::write(upper);
    }
};

class PrefixWriter : public WriterDecorator {
public:
    using WriterDecorator::WriterDecorator;
    void write(const std::string& text) override { WriterDecorator::write("> " + text); }
};

int main() {
    std::unique_ptr<Writer> w = std::make_unique<PrefixWriter>(
        std::make_unique<UppercaseWriter>(std::make_unique<ConsoleWriter>()));
    w->write("hello");  // > HELLO
}
```

Each decorator only knows about the `Writer` interface, so they can be stacked in any order.

## What's not covered

The remaining structural patterns (Facade, Flyweight, Proxy) and the behavioural ones (Observer, Strategy, Command, State, Visitor and others) are left for another post. Several of them look different in modern C++ than in the 1994 book: Strategy is often just a `std::function` or a template parameter, Iterator is built into the standard library's iterator and range concepts, and Visitor over a closed set of types is often replaced by `std::variant` with `std::visit`.

A pattern is a vocabulary for a design, not a goal. If a plain function or a struct solves the problem, adding a factory or a builder only adds indirection.

## Further reading

- [`std::unique_ptr` (cppreference)](https://en.cppreference.com/w/cpp/memory/unique_ptr)
- [`std::variant` and `std::visit` (cppreference)](https://en.cppreference.com/w/cpp/utility/variant/visit)
