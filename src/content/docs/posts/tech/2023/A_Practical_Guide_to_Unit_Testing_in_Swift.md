---
description: Set up a test target in Xcode, write unit tests with XCTest assertions, run them, and see the same tests written with the newer Swift Testing framework.
imgSrc: /imgs/2023/3170249337.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-04-05T00:16:03.000Z'
lastUpdated: 2026-11-14
tags: ["swift", "testing"]
title: "Unit testing in Swift with XCTest and Swift Testing"
---

A unit test calls one function or type in isolation and checks the result. In Swift you have two frameworks for this, both built into Xcode: **XCTest**, which has been around since Xcode 5, and **Swift Testing**, introduced with Xcode 16 in 2024. This post writes the same tests in both against a small `Calculator` type.

## The code under test

Put this in your app target (here called `MyApp`):

```swift
struct Calculator {
    func add(_ a: Int, _ b: Int) -> Int { a + b }
    func subtract(_ a: Int, _ b: Int) -> Int { a - b }

    func divide(_ a: Int, _ b: Int) throws -> Int {
        guard b != 0 else { throw CalculatorError.divisionByZero }
        return a / b
    }
}

enum CalculatorError: Error {
    case divisionByZero
}
```

## Add a test target

New projects created with "Include Tests" already have one. Otherwise:

1. In Xcode, choose **File > New > Target…**.
2. Pick your platform and the **Unit Testing Bundle** template, then click **Next**.
3. Name it (for example `MyAppTests`), choose the testing system (Swift Testing or XCTest), set the target to be tested, and click **Finish**.

## Writing tests with XCTest

Test classes subclass `XCTestCase`. XCTest discovers test methods by convention: instance methods whose names start with `test`, take no arguments and return nothing. The `@testable` attribute goes on the **import**, not on the methods; it gives the test target access to `internal` declarations in your app module.

```swift
import XCTest
@testable import MyApp

final class CalculatorTests: XCTestCase {
    var calculator: Calculator!

    override func setUp() {
        super.setUp()
        calculator = Calculator()
    }

    func testAddition() {
        XCTAssertEqual(calculator.add(2, 3), 5, "Expected 2 + 3 to equal 5")
    }

    func testSubtraction() {
        XCTAssertEqual(calculator.subtract(7, 3), 4)
    }

    func testDivideByZeroThrows() {
        XCTAssertThrowsError(try calculator.divide(1, 0)) { error in
            XCTAssertEqual(error as? CalculatorError, .divisionByZero)
        }
    }
}
```

`setUp()` runs before each test method, so every test gets a fresh `Calculator`. Use `tearDown()` for cleanup.

### Common assertions

Each assertion takes an optional message as the last positional argument, shown when the assertion fails:

- `XCTAssertEqual(a, b)` / `XCTAssertNotEqual(a, b)`
- `XCTAssertTrue(expr)` / `XCTAssertFalse(expr)`
- `XCTAssertNil(value)` / `XCTAssertNotNil(value)`
- `XCTAssertThrowsError(try expr)` / `XCTAssertNoThrow(try expr)`
- `XCTAssertEqual(a, b, accuracy: 0.001)` for floating-point values
- `XCTUnwrap(optional)`, which fails the test and throws if the value is `nil` (mark the test method `throws`)

## The same tests with Swift Testing

Swift Testing replaces naming conventions with the `@Test` macro and the long list of assertion functions with two macros: `#expect`, which records a failure and keeps going, and `#require`, which stops the test. Because `#expect` takes an ordinary Boolean expression, failure messages show the values on both sides without needing a special `Equal` variant.

```swift
import Testing
@testable import MyApp

struct CalculatorTests {
    let calculator = Calculator()   // a new instance is created for each test

    @Test func addition() {
        #expect(calculator.add(2, 3) == 5)
    }

    @Test func subtraction() {
        #expect(calculator.subtract(7, 3) == 4)
    }

    @Test func divideByZeroThrows() {
        #expect(throws: CalculatorError.divisionByZero) {
            try calculator.divide(1, 0)
        }
    }
}
```

The two frameworks can live in the same test target, so you can add Swift Testing to an existing project and migrate gradually. UI tests (`XCUIApplication`) and performance tests (`measure`) still need XCTest.

## Running tests

- **Product > Test** (⌘U) builds the app and test target and runs every test.
- The Test navigator (⌘6) lists tests by target and class or suite; click the diamond next to one to run it alone. The same diamonds appear in the editor gutter.
- From the command line: `xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 16'` (adjust the simulator name to one you have installed). Swift packages run tests with `swift test`.

When a test fails, Xcode marks the failing line in the editor and shows the message in the Report navigator (⌘9). Set a breakpoint inside the test and rerun just that test to step through it.

## Tips

- Keep tests independent. Don't rely on one test leaving state for the next: Swift Testing runs tests in parallel by default, and XCTest can be configured to randomise execution order.
- `@testable import` only works if the app was built with testability enabled, which is the default for the Debug configuration. Running tests against a Release build fails to compile for this reason.
- Test behaviour you can describe, including edge cases (zero, empty input, errors), rather than mirroring the implementation line by line.

## Further reading

- [XCTest documentation](https://developer.apple.com/documentation/xctest)
- [Swift Testing documentation](https://developer.apple.com/documentation/testing)
- [Migrating a test from XCTest](https://developer.apple.com/documentation/testing/migratingfromxctest)
