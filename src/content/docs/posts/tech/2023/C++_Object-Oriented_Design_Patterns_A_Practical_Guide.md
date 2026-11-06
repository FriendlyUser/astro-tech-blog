---
description: This article will introduce you to some of the most common design patterns
  used in C++ OOP, and provide code examples to illustrate their usage.
imgSrc: /imgs/2023/other
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-17T16:45:07.000Z'
tags: []
title: C++ Object-Oriented Design Patterns A Practical Guide
---

# C++ Object-Oriented Design Patterns: A Practical Guide

Design patterns are reusable solutions to common problems that occur in software design. In the realm of object-oriented programming (OOP), these patterns provide proven solutions and techniques to help developers create flexible and maintainable software. This article will introduce you to some of the most common design patterns used in C++ OOP, and provide code examples to illustrate their usage.

## Table of Contents

1. Introduction to Design Patterns
2. Creational Patterns
   - Singleton
   - Factory Method
   - Abstract Factory
   - Builder
   - Prototype
3. Structural Patterns
   - Adapter
   - Bridge
   - Composite
   - Decorator
   - Facade
   - Flyweight
   - Proxy
4. Behavioral Patterns
   - Chain of Responsibility
   - Command
   - Interpreter
   - Iterator
   - Mediator
   - Memento
   - Observer
   - State
   - Strategy
   - Template Method
   - Visitor

## 1. Introduction to Design Patterns

Design patterns can be classified into three main categories: creational, structural, and behavioral. Creational patterns deal with the process of object creation, structural patterns deal with the composition of classes and objects, and behavioral patterns define the ways in which objects interact and communicate.

## 2. Creational Patterns

### 2.1 Singleton

**Intent**: Ensure a class has only one instance and provide a global point of access to it.

**Code Example**:

```cpp
class Singleton {
public:
    static Singleton& getInstance() {
        static Singleton instance;
        return instance;
    }

    // Delete copy and assignment constructors
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;

private:
    Singleton() {}
};
```

### 2.2 Factory Method

**Intent**: Define an interface for creating an object, but let subclasses decide which class to instantiate.

**Code Example**:

```cpp
class Product {
public:
    virtual ~Product() {}
    virtual void doSomething() = 0;
};

class ConcreteProductA : public Product {
public:
    void doSomething() override {
        // ...
    }
};

class ConcreteProductB : public Product {
public:
    void doSomething() override {
        // ...
    }
};

class Creator {
public:
    virtual ~Creator() {}
    virtual Product* createProduct() = 0;
};

class ConcreteCreatorA : public Creator {
public:
    Product* createProduct() override {
        return new ConcreteProductA();
    }
};

class ConcreteCreatorB : public Creator {
public:
    Product* createProduct() override {
        return new ConcreteProductB();
    }
};
```

### 2.3 Abstract Factory

**Intent**: Provide an interface for creating families of related or dependent objects without specifying their concrete classes.

**Code Example**:

```cpp
class AbstractProductA {
public:
    virtual ~AbstractProductA() {}
};

class AbstractProductB {
public:
    virtual ~AbstractProductB() {}
};

class ConcreteProductA1 : public AbstractProductA {
};

class ConcreteProductA2 : public AbstractProductA {
};

class ConcreteProductB1 : public AbstractProductB {
};

class ConcreteProductB2 : public AbstractProductB {
};

class AbstractFactory {
public:
    virtual ~AbstractFactory() {}
    virtual AbstractProductA* createProductA() = 0;
    virtual AbstractProductB* createProductB() = 0;
};

class ConcreteFactory1 : public AbstractFactory {
public:
    AbstractProductA* createProductA() override {
        return new ConcreteProductA1();
    }

    AbstractProductB* createProductB() override {
        return new ConcreteProductB1();
    }
};

class ConcreteFactory2 : public AbstractFactory {
public:
    AbstractProductA* createProductA() override {
        return new ConcreteProductA2();
    }

    AbstractProductB* createProductB() override {
        return new ConcreteProductB2();
    }
};
```

### 2.4 Builder

**Intent**: Separate the construction of a complex object from its representation so that the same construction process can create different representations.

**Code Example**:

```cpp
class Product {
public:
    void setPartA(int value) { partA = value; }
    void setPartB(double value) { partB = value; }
    void setPartC(const std::string& value) { partC = value; }

private:
    int partA;
    double partB;
    std::string partC;
};

class Builder {
public:
    virtual ~Builder() {}
    virtual void buildPartA() = 0;
    virtual void buildPartB() = 0;
    virtual void buildPartC() = 0;

    Product* getProduct() {
        return product;
    }

protected:
    Product* product;
};

class ConcreteBuilderA : public Builder {
public:
    void buildPartA() override {
        product->setPartA(1);
    }

    void buildPartB() override {
        product->setPartB(1.1);
    }

    void buildPartC() override {
        product->setPartC("A");
    }
};

class ConcreteBuilderB : public Builder {
public:
    void buildPartA() override {
        product->setPartA(2);
    }

    void buildPartB() override {
        product->setPartB(2.2);
    }

    void buildPartC() override {
        product->setPartC("B");
    }
};

class Director {
public:
    void setBuilder(Builder* builder) {
        this->builder = builder;
    }

    void construct() {
        builder->buildPartA();
        builder->buildPartB();
        builder->buildPartC();
    }

private:
    Builder* builder;
};
```

### 2.5 Prototype

**Intent**: Specify the kinds of objects to create using a prototypical instance, and create new objects by copying this prototype.

**Code Example**:

```cpp
class Prototype {
public:
    virtual ~Prototype() {}
    virtual Prototype* clone() const = 0;
};

class ConcretePrototypeA : public Prototype {
public:
    Prototype* clone() const override {
        return new ConcretePrototypeA(*this);
    }
};

class ConcretePrototypeB : public Prototype {
public:
    Prototype* clone() const override {
        return new ConcretePrototypeB(*this);
    }
};
```

## 3. Structural Patterns

### 3.1 Adapter

**Intent**: Convert the interface of a class into another interface clients expect. Adapter lets classes work together that couldn't otherwise because of incompatible interfaces.

**Code Example**:

```cpp
class Target {
public:
    virtual ~Target() {}
    virtual void request() = 0;
};

class Adaptee {
public:
    void specificRequest() {
        // ...
    }
};

class Adapter : public Target {
public:
    Adapter(Adaptee* adaptee) : adaptee(adaptee) {}

    void request() override {
        adaptee->specificRequest();
    }

private:
    Adaptee* adaptee;
};
```

### 3.2 Bridge

**Intent**: Decouple an abstraction from its implementation so that the two can vary independently.

**Code Example**:

```cpp
class Implementor {
public:
    virtual ~Implementor() {}
    virtual void operationImpl() = 0;
};

class ConcreteImplementorA : public Implementor {
public:
    void operationImpl() override {
        // ...
    }
};

class ConcreteImplementorB : public Implementor {
public:
    void operationImpl() override {
        // ...
    }
};

class Abstraction {
public:
    Abstraction(Implementor* implementor) : implementor(implementor) {}
    virtual ~Abstraction() {}

    virtual void operation() {
        implementor->operationImpl();
    }

protected:
    Implementor* implementor;
};

class RefinedAbstraction : public Abstraction {
public:
    RefinedAbstraction(Implementor* implementor) : Abstraction(implementor) {}

    void operation() override {
        // ...
        Abstraction::operation();
        // ...
    }
};
```

### 3.3 Composite

**Intent**: Compose objects into tree structures to represent part-whole hierarchies. Composite lets clients treat individual objects and compositions of objects uniformly.

**Code Example**:

```cpp
class Component {
public:
    virtual ~Component() {}
    virtual void operation() = 0;
};

class Leaf : public Component {
public:
    void operation() override {
        // ...
    }
};

class Composite : public Component {
public:
    void add(Component* component) {
        children.push_back(component);
    }

    void remove(Component* component) {
        children.erase(std::remove(children.begin(), children.end(), component), children.end());
    }

    void operation() override {
        for (Component* child : children) {
            child->operation();
        }
    }

private:
    std::vector<Component*> children;
};
```

### 3.4 Decorator

**Intent**: Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.

**Code Example**:

```cpp
class Component {
public:
    virtual ~Component() {}
    virtual void operation() = 0;
};

class ConcreteComponent : public Component {
public:
    void operation() override {
        // ...
    }
};

class Decorator : public Component {
public:
    Decorator(Component* component) : component(component) {}

    void operation() override {
        component->operation();
    }

protected:
    Component* component;
};

class ConcreteDecoratorA : public Decorator {
public:
    ConcreteDecoratorA(Component* component) : Decorator(component) {}

    void operation() override {
        // ...
        Decorator::operation();
        // ...
    }
};

class ConcreteDecoratorB