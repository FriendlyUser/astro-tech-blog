---
description: How to call Objective-C from Swift with a bridging header, call Swift from Objective-C through the generated -Swift.h header, and how types bridge.
imgSrc: /imgs/2023/577360463.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-18T16:56:39.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Mixing Swift and Objective-C: bridging headers and the generated Swift header"
---

Plenty of Apple-platform codebases still have Objective-C in them, and new code is usually written in Swift. Xcode lets both languages live in the same target, and the two directions work differently:

- **Objective-C → Swift:** you write a *bridging header* that lists the Objective-C headers Swift should see.
- **Swift → Objective-C:** the compiler *generates* a header named `<ProductModuleName>-Swift.h`. You don't write it; you import it.

The examples below assume an app target. Frameworks work slightly differently, covered at the end.

## Using Objective-C from Swift

### Set up the bridging header

When you add the first Objective-C file to a Swift app target (or the first Swift file to an Objective-C one), Xcode offers to create a bridging header for you. To do it by hand:

1. Add a header file named `<ProjectName>-Bridging-Header.h`. The name is only a convention.
2. Import the Objective-C headers you want Swift to see:

   ```objc
   #import "MyObjectiveCClass.h"
   ```

3. In the target's build settings, set **Objective-C Bridging Header** (`SWIFT_OBJC_BRIDGING_HEADER`) to its path, for example `$(SRCROOT)/MyApp/MyApp-Bridging-Header.h`.

Everything imported there is visible to every Swift file in the target, with no `import` statement needed.

### Call it

Given this Objective-C class:

```objc
// MyObjectiveCClass.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface MyObjectiveCClass : NSObject
- (NSString *)greetingWithName:(NSString *)name;
- (void)printGreeting:(NSString *)greeting;
@end

NS_ASSUME_NONNULL_END
```

Swift sees it with Swift-style names. `greetingWithName:` becomes `greeting(withName:)`:

```swift
let objCObject = MyObjectiveCClass()
let greeting = objCObject.greeting(withName: "John")
print(greeting)                        // a String, not String?
objCObject.printGreeting("Hello")      // String is bridged to NSString
```

The `NS_ASSUME_NONNULL_BEGIN`/`END` block matters. Without nullability annotations, every object pointer is imported as an implicitly unwrapped optional (`String!`), and `let greeting = ...` would infer `String?`. Annotate headers with `nonnull`/`nullable` (or the audited region above) so Swift gets accurate types. If the automatic name is awkward, `NS_SWIFT_NAME` lets you pick the Swift name from the Objective-C side.

## Using Swift from Objective-C

### What gets exposed

Only declarations Objective-C can represent make it into the generated header:

- Classes must inherit from `NSObject` (or another Objective-C class). Swift structs, generic types and most enums can't be exposed; an enum can be if it's `@objc` with an integer raw type.
- Methods and properties need `@objc`, or put `@objcMembers` on the class. Since Swift 4, subclassing `NSObject` no longer exposes members automatically.
- In an app target, `public` and `open` declarations are included, and `internal` ones are too when the target has an Objective-C bridging header.

```swift
import Foundation

class MySwiftClass: NSObject {
    @objc func greeting(withName name: String) -> String {
        "Hello, \(name)!"
    }
}
```

### Import the generated header

In any `.m` file in the same target:

```objc
#import "MyObjectiveCFile.h"
#import "MyApp-Swift.h"   // <ProductModuleName>-Swift.h

@implementation MyObjectiveCFile

- (void)useSwiftClass {
    MySwiftClass *swiftObject = [[MySwiftClass alloc] init];
    NSString *greeting = [swiftObject greetingWithName:@"John"];
    NSLog(@"%@", greeting);
}

@end
```

Characters in the product module name that aren't valid in an identifier are replaced with underscores, so check the **Product Module Name** build setting if the import can't be found. Import the generated header only in `.m` files; in a `.h` file, forward-declare the Swift class with `@class MySwiftClass;` to avoid circular imports.

## Type bridging

Common Foundation types convert automatically when they cross the boundary:

| Swift type | Objective-C type |
|------------|------------------|
| `String` | `NSString` |
| `Array` | `NSArray` |
| `Dictionary` | `NSDictionary` |
| `Set` | `NSSet` |
| `Data` | `NSData` |
| `Date` | `NSDate` |
| `URL` | `NSURL` |
| `Int`, `Double`, `Bool` | `NSNumber` (when passed as an object, e.g. in a collection) |

Collections coming from Objective-C are untyped (`[Any]`) unless the header uses lightweight generics, such as `NSArray<NSString *> *`, which Swift imports as `[String]`.

## Frameworks

A framework target can't have a bridging header. Objective-C headers that Swift should see go in the framework's umbrella header (and must be public), and only `public`/`open` Swift declarations appear in the generated header. Import it with the module path:

```objc
#import <MyFramework/MyFramework-Swift.h>
```

## Tips

- Expose to Objective-C only what it needs. Every `@objc` member adds Objective-C metadata and thunks to the binary, which is why Swift 4 stopped inferring `@objc` ([SE-0160](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0160-objc-inference.md)).
- Migrate incrementally: new features in Swift, old code converted a class at a time, starting with leaf classes that nothing else in Objective-C depends on.
- Add nullability and lightweight generics to Objective-C headers before calling them from Swift. It's cheap and removes most of the optionals and casts.

## Further reading

- [Importing Objective-C into Swift](https://developer.apple.com/documentation/swift/importing-objective-c-into-swift)
- [Importing Swift into Objective-C](https://developer.apple.com/documentation/swift/importing-swift-into-objective-c)
- [Designating nullability in Objective-C APIs](https://developer.apple.com/documentation/swift/designating-nullability-in-objective-c-apis)
