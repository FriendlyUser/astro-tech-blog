---
title: Understanding Access Control in Swift
pubDate: "2025-03-28T21:42:20.000Z"
description: "In this article, we'll explore the different access control levels provided in Swift and how to use them effectively"
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Understanding Access Control in Swift

Swift's access control mechanism is designed to provide a way to restrict access to parts of your code from other parts of your code, as well as from external codebases. This ensures that internal implementation details remain hidden, creating a clean public API and promoting modularity and encapsulation. In this article, we'll explore the different access control levels provided in Swift and how to use them effectively.

## Access Control Levels

Swift has five access control levels, listed below from the most restrictive to the least restrictive:

1. `private`
2. `fileprivate`
3. `internal`
4. `public`
5. `open`

### Private

`private` access restricts the accessibility of an entity to the enclosing declaration, and to extensions of that declaration within the same file. This access level is the most restrictive, and it is intended for use when an entity should only be available within a specific context.

```swift
class MyClass {
    private var privateVar = "This variable is accessible only within MyClass"

    func accessPrivateVar() {
        print(privateVar) // This is OK because we're inside MyClass
    }
}

extension MyClass {
    func anotherAccessToPrivateVar() {
        print(privateVar) // This is OK because we're in an extension of MyClass within the same file
    }
}

let myInstance = MyClass()
myInstance.accessPrivateVar() // This will print the value of privateVar
myInstance.privateVar // This will cause a compile-time error because privateVar is not accessible outside of MyClass
```

### Fileprivate

`fileprivate` access restricts the accessibility of an entity to its defining source file. This access level is useful when you want to make an entity available to other types defined within the same file but prevent access from other files.

```swift
class MyClass {
    fileprivate var fileprivateVar = "This variable is accessible only within the same file"
}

class AnotherClassInSameFile {
    func accessFileprivateVar() {
        let myInstance = MyClass()
        print(myInstance.fileprivateVar) // This is OK because we're inside the same file
    }
}

let anotherInstance = AnotherClassInSameFile()
anotherInstance.accessFileprivateVar() // This will print the value of fileprivateVar
```

### Internal

`internal` access allows an entity to be accessed within the entire module that includes the definition of the entity. This access level is the default if you do not explicitly specify an access level.

```swift
// In ModuleA
class MyClass {
    internal var internalVar = "This variable is accessible within the same module"
}

let myInstance = MyClass()
print(myInstance.internalVar) // This is OK because we're inside the same module (ModuleA)

// In ModuleB, which imports ModuleA
import ModuleA

let anotherInstance = MyClass()
print(anotherInstance.internalVar) // This will cause a compile-time error because internalVar is not accessible outside of ModuleA
```

### Public

`public` access allows an entity to be accessed from any source file within the module that includes the definition of the entity, as well as from any external module that imports the module containing the entity. However, subclasses and overrides of `public` entities can only be created within the defining module.

```swift
// In ModuleA
public class MyClass {
    public var publicVar = "This variable is accessible from any module that imports ModuleA"
}

// In ModuleB, which imports ModuleA
import ModuleA

let myInstance = MyClass()
print(myInstance.publicVar) // This is OK because publicVar is accessible from any module that imports ModuleA
```

### Open

`open` access is the least restrictive access level, allowing an entity to be accessed from any source file within the module that includes the definition of the entity, as well as from any external module that imports the module containing the entity. Unlike `public` access, `open` access allows subclasses and overrides of the entity to be created in any module that imports the defining module.

```swift
// In ModuleA
open class MyBaseClass {
    open var openVar = "This variable is accessible from any module that imports ModuleA and can be subclassed and overridden"
}

// In ModuleB, which imports ModuleA
import ModuleA

class MyDerivedClass: MyBaseClass {
    override var openVar: String {
        didSet {
            print("The value of openVar has changed")
        }
    }
}

let myInstance = MyDerivedClass()
myInstance.openVar = "New value" // This is OK because openVar is accessible from any module that imports ModuleA and can be subclassed and overridden
```

## Conclusion

Swift's access control mechanism allows developers to manage the visibility of their code, ensuring that internal implementation details remain hidden and promoting modularity and encapsulation. By understanding the different access control levels and how they interact, you can create more robust and maintainable Swift applications.
