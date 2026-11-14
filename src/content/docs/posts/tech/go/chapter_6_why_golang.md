---
tags: ['go']
title: "Object-oriented programming in Go: structs, methods, embedding and interfaces"
description: "How Go covers classic OOP ideas without classes: structs and methods, package-level encapsulation, embedding instead of inheritance, and interfaces."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1452718796.png
---
Go has no classes and no inheritance, but it still covers what most people want from OOP: types that bundle data with behaviour, hidden internals, code reuse, and polymorphism. It does this with structs, methods, embedding and interfaces. This post walks through each one.

## Structs and methods

A struct groups named fields. Methods are functions with a *receiver*, declared outside the struct:

```go
package main

import "fmt"

type Person struct {
	Name string
	Age  int
}

func (p Person) SayHello() {
	fmt.Println("Hello, my name is", p.Name)
}

func main() {
	p := Person{Name: "John", Age: 30}
	fmt.Println(p.Age) // 30
	p.SayHello()       // Hello, my name is John
}
```

Use a pointer receiver (`func (p *Person) ...`) when the method needs to modify the struct or the struct is large enough that copying it matters. If some methods on a type use pointer receivers, it's conventional to make them all pointer receivers.

## Encapsulation

Go's visibility unit is the **package**, not the type. An identifier that starts with an uppercase letter is exported; anything lowercase is visible only inside the package that declares it. Fields are not public by default: `name` is unexported, `Name` is exported. There is no way to hide a field from other code in the same package.

So to encapsulate state, keep the fields lowercase and expose methods (plus a constructor, since other packages can't set unexported fields in a struct literal):

```go
package bank

import "errors"

var (
	ErrLocked            = errors.New("account is locked")
	ErrInsufficientFunds = errors.New("insufficient funds")
)

type BankAccount struct {
	owner    string
	balance  int64 // in cents, to avoid floating-point rounding
	isLocked bool
}

func NewBankAccount(owner string) *BankAccount {
	return &BankAccount{owner: owner}
}

func (b *BankAccount) Deposit(cents int64) error {
	if b.isLocked {
		return ErrLocked
	}
	b.balance += cents
	return nil
}

func (b *BankAccount) Withdraw(cents int64) error {
	if b.isLocked {
		return ErrLocked
	}
	if b.balance < cents {
		return ErrInsufficientFunds
	}
	b.balance -= cents
	return nil
}

func (b *BankAccount) Balance() int64 { return b.balance }
func (b *BankAccount) Lock()          { b.isLocked = true }
func (b *BankAccount) Unlock()        { b.isLocked = false }
```

Code outside `bank` can only change the balance through `Deposit` and `Withdraw`, and the methods return errors instead of silently ignoring a locked account or an overdraft.

## Embedding instead of inheritance

Embedding a struct promotes its fields and methods to the outer type:

```go
package main

import "fmt"

type Animal struct {
	Name string
}

func (a *Animal) Speak() {
	fmt.Println("My name is", a.Name)
}

type Dog struct {
	Animal // embedded
	Breed  string
}

func main() {
	d := Dog{Animal: Animal{Name: "Fido"}, Breed: "Labrador"}
	d.Speak()           // My name is Fido
	fmt.Println(d.Name) // promoted field
	d.Animal.Speak()    // the explicit form of the same call
}
```

This is composition, not inheritance. A `Dog` is not an `Animal`: you can't pass a `Dog` to a function that takes an `Animal`, and if `Dog` defines its own `Speak`, `Animal`'s methods won't call it (there is no virtual dispatch). When you need "any type that can do X", use an interface.

## Interfaces and polymorphism

An interface is a set of method signatures. A type satisfies it implicitly, just by having those methods; there's no `implements` keyword.

```go
package main

import (
	"fmt"
	"math"
)

type Shape interface {
	Area() float64
}

type Rectangle struct {
	Width, Height float64
}

func (r Rectangle) Area() float64 { return r.Width * r.Height }

type Circle struct {
	Radius float64
}

func (c Circle) Area() float64 { return math.Pi * c.Radius * c.Radius }

func main() {
	shapes := []Shape{
		Rectangle{Width: 10, Height: 5},
		Circle{Radius: 1},
	}
	for _, s := range shapes {
		fmt.Printf("%T: %.2f\n", s, s.Area())
	}
}
```

Output:

```text
main.Rectangle: 50.00
main.Circle: 3.14
```

Embedding and interfaces work together: because `Dog` embeds `Animal`, `*Dog` gets the promoted `Speak` method and satisfies an interface like `type Speaker interface{ Speak() }`.

## Gotchas

- Methods with pointer receivers are in the method set of `*T` only. If `Area` had a `*Rectangle` receiver, `var s Shape = Rectangle{}` would not compile; you'd need `&Rectangle{}`.
- Keep interfaces small and define them where they're consumed. The standard library's `io.Reader` and `io.Writer` each have one method.
- An interface holding a nil pointer is not itself nil, so `err != nil` can be true for a typed nil. Return a literal `nil` when there's no error.

## Further reading

- [Effective Go: Embedding](https://go.dev/doc/effective_go#embedding)
- [Effective Go: Interfaces](https://go.dev/doc/effective_go#interfaces)
- [Go FAQ: Is Go an object-oriented language?](https://go.dev/doc/faq#Is_Go_an_object-oriented_language)
