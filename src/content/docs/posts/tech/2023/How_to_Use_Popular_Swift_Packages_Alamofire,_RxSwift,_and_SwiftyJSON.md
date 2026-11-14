---
description: How to add Alamofire, RxSwift and SwiftyJSON with Swift Package Manager, with a working example of each and when Apple's built-in APIs are the better choice.
imgSrc: /imgs/2023/559850830.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-20T21:42:07.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: Using Alamofire, RxSwift and SwiftyJSON in a Swift project
---

Alamofire (HTTP networking), RxSwift (reactive streams) and SwiftyJSON (loosely typed JSON access) are three long-lived Swift packages you will still find in many iOS codebases. This post shows how to add each one with Swift Package Manager, a short example that works with the current release, and where Apple's own APIs now cover the same ground.

## Adding the packages

In Xcode, use **File > Add Package Dependencies…** and paste the repository URL. In a `Package.swift` manifest, declare the packages and then add their products to your target:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [.iOS(.v15), .macOS(.v12)],
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.12.2"),
        .package(url: "https://github.com/ReactiveX/RxSwift.git", from: "6.10.2"),
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", from: "5.0.2"),
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                .product(name: "Alamofire", package: "Alamofire"),
                .product(name: "RxSwift", package: "RxSwift"),
                .product(name: "SwiftyJSON", package: "SwiftyJSON"),
            ]
        ),
    ]
)
```

The versions above were the latest releases when this post was updated. `from:` accepts any later version up to the next major one. The `platforms` line matters: Alamofire's manifest for the newest Swift tools version requires iOS 15 / macOS 12, and SwiftPM refuses to build a package whose minimum platform is lower than one of its dependencies.

CocoaPods and Carthage also work, but CocoaPods' central Trunk repository becomes read-only on 2 December 2026, so new pod releases stop after that date. Prefer SwiftPM for new projects.

## Alamofire

Alamofire wraps `URLSession` with a chainable request API, response validation, retry and request adapters. In Alamofire 5 the entry point is `AF`. The older `Alamofire.request(...)` call is from Alamofire 4 and no longer compiles, and `responseJSON` has been deprecated since 5.5 in favour of decoding straight into a `Decodable` type.

```swift
import Alamofire

struct User: Decodable {
    let id: Int
    let name: String
    let email: String
}

AF.request("https://jsonplaceholder.typicode.com/users")
    .validate() // treat non-2xx status codes as failures
    .responseDecodable(of: [User].self) { response in
        switch response.result {
        case .success(let users):
            print("Fetched \(users.count) users")
        case .failure(let error):
            print("Request failed: \(error)")
        }
    }
```

With Swift concurrency, the same request is a single `await`:

```swift
func fetchUsers() async throws -> [User] {
    try await AF.request("https://jsonplaceholder.typicode.com/users")
        .validate()
        .serializingDecodable([User].self)
        .value
}
```

Without `.validate()`, a 404 or 500 with a JSON error body goes to the decoder, and you get a decoding error instead of the HTTP status.

## RxSwift

RxSwift is the Swift implementation of ReactiveX: values arrive over time through an `Observable`, and you transform them with operators such as `map`, `filter` and `debounce`. Each subscription returns a `Disposable`. Add it to a `DisposeBag` so it is released when the bag's owner (usually a view controller) is deallocated.

```swift
import RxSwift

let disposeBag = DisposeBag()

let greetings = Observable<String>.create { observer in
    observer.onNext("Hello")
    observer.onNext("RxSwift")
    observer.onCompleted()
    return Disposables.create()
}

greetings
    .map { $0.uppercased() }
    .subscribe(
        onNext: { print("Received: \($0)") },
        onError: { print("Error: \($0)") },
        onCompleted: { print("Completed") },
        onDisposed: { print("Disposed") }
    )
    .disposed(by: disposeBag)
```

UI bindings (`rx.tap`, `rx.text`, `bind(to:)`) live in the separate `RxCocoa` product of the same package. Apple's Combine framework and `AsyncSequence` now cover much of the same ground, so RxSwift is mostly worth adding when a codebase already uses it.

## SwiftyJSON

SwiftyJSON lets you read JSON with subscripts instead of casting through `[String: Any]`. `JSON(data:)` throws on invalid input, so handle the error rather than using `try!`:

```swift
import Foundation
import SwiftyJSON

let jsonString = """
{
    "name": "John Doe",
    "age": 30,
    "skills": ["Swift", "Go"]
}
"""

do {
    let json = try JSON(data: Data(jsonString.utf8))
    print("Name: \(json["name"].stringValue)")
    print("Age: \(json["age"].intValue)")
    print("First skill: \(json["skills"][0].stringValue)")
    print("Email: \(json["email"].string ?? "missing")")
} catch {
    print("Invalid JSON: \(error)")
}
```

The `...Value` accessors (`stringValue`, `intValue`) return a default (`""`, `0`) when a key is missing or has the wrong type, which can hide bugs. The optional accessors (`string`, `int`) return `nil`, so you can tell the difference.

## When to skip these packages

- For JSON with a known shape, `Codable` and `JSONDecoder` are built in and give compile-time checked models. SwiftyJSON is most useful for loosely structured or exploratory JSON. Its latest release, 5.0.2, dates from March 2024.
- For simple requests, `URLSession.shared.data(from:)` with `async`/`await` needs no dependency. Alamofire earns its place when you need interceptors (auth token refresh, retries), multipart uploads or upload/download progress.
- For new reactive code, try Combine or Swift concurrency before adding RxSwift.

## Further reading

- [Alamofire usage guide](https://github.com/Alamofire/Alamofire/blob/master/Documentation/Usage.md)
- [RxSwift getting started](https://github.com/ReactiveX/RxSwift/blob/main/Documentation/GettingStarted.md)
- [SwiftyJSON README](https://github.com/SwiftyJSON/SwiftyJSON)
