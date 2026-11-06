---
title: Using Dictionary in GoLang with Maps
pubDate: "2023-05-30T19:37:46.314Z"
description: "In GoLang, dictionaries are implemented using the built-in data structure called `maps`. A map is a collection of key-value pairs, where each key is unique and maps to a single value."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using Dictionary in GoLang with Maps

In GoLang, dictionaries are implemented using the built-in data structure called `maps`. A map is a collection of key-value pairs, where each key is unique and maps to a single value. This article will guide you through the basics of using dictionaries in GoLang with the help of maps, including creation, modification, and deletion of key-value pairs.

## Creating a Map

To create a map in GoLang, use the `make` function with the `map` keyword, followed by the types of both the key and the value enclosed in square brackets. Here's an example that demonstrates how to create a map with string keys and integer values:

```go
package main

import "fmt"

func main() {
    // Create a map with string keys and integer values
    myDict := make(map[string]int)

    // Print the map
    fmt.Println(myDict)
}
```

## Adding Key-Value Pairs to the Map

To add a key-value pair to the map, use the assignment operator (`=`) after specifying the key in square brackets. For example:

```go
package main

import "fmt"

func main() {
    myDict := make(map[string]int)

    // Add key-value pairs to the map
    myDict["apple"] = 5
    myDict["banana"] = 8
    myDict["orange"] = 12

    // Print the map
    fmt.Println(myDict)
}
```

## Retrieving Values from the Map

To retrieve a value from the map, use the key in square brackets. If the key is not present in the map, it will return the zero value for the value type. Here's an example:

```go
package main

import "fmt"

func main() {
    myDict := make(map[string]int)
    myDict["apple"] = 5
    myDict["banana"] = 8

    // Retrieve the value for the key "apple"
    value := myDict["apple"]
    fmt.Println("Value for apple:", value)

    // Retrieve the value for a non-existent key
    value = myDict["orange"]
    fmt.Println("Value for orange:", value)
}
```

To check if a key exists in the map, use the `, ok` syntax in the assignment:

```go
package main

import "fmt"

func main() {
    myDict := make(map[string]int)
    myDict["apple"] = 5

    // Check if the key "apple" exists in the map
    value, ok := myDict["apple"]
    if ok {
        fmt.Println("Value for apple:", value)
    } else {
        fmt.Println("Key 'apple' not found")
    }

    // Check if the key "orange" exists in the map
    value, ok = myDict["orange"]
    if ok {
        fmt.Println("Value for orange:", value)
    } else {
        fmt.Println("Key 'orange' not found")
    }
}
```

## Deleting Key-Value Pairs from the Map

To remove a key-value pair from the map, use the `delete` built-in function with the map and the key as arguments:

```go
package main

import "fmt"

func main() {
    myDict := make(map[string]int)
    myDict["apple"] = 5
    myDict["banana"] = 8

    // Delete the key-value pair with the key "apple"
    delete(myDict, "apple")

    // Print the map
    fmt.Println(myDict)
}
```

## Iterating Over a Map

To iterate over a map, use the `range` keyword in a `for` loop. The `range` keyword returns both the key and value for each entry in the map:

```go
package main

import "fmt"

func main() {
    myDict := make(map[string]int)
    myDict["apple"] = 5
    myDict["banana"] = 8
    myDict["orange"] = 12

    // Iterate over the map and print each key-value pair
    for key, value := range myDict {
        fmt.Printf("Key: %s, Value: %d\n", key, value)
    }
}
```

In conclusion, maps in GoLang provide a convenient and efficient way to implement dictionaries. By using the built-in `make`, `delete`, and `range` functions along with the assignment and retrieval operations, you can easily create, modify, and iterate over dictionaries in GoLang.
