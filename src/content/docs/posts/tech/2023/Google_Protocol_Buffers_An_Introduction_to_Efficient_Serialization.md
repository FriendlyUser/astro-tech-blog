---
description: "How Protocol Buffers work: define a .proto schema, generate Python code with protoc, serialize and parse messages, and evolve the schema safely."
imgSrc: /imgs/2023/1879869613.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-02T13:08:12.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: 'Protocol Buffers in Python: schemas, code generation and schema evolution'
---

Protocol Buffers (protobuf) is Google's language-neutral format for serializing structured data. You describe your messages in a `.proto` file, run the `protoc` compiler to generate classes for your language, and those classes read and write a compact binary encoding. Google started it internally in 2001 and later open-sourced it. It is the default message format for gRPC, and official code generators exist for C++, Java, Kotlin, Python, Go, C#, Objective-C, Dart, Ruby and PHP, among others.

Use it when you control both ends of a channel (services, queues, storage) and want a typed contract that can change over time. Plain JSON is still easier when humans need to read the payload or when the consumer is a browser you don't control.

## Define a schema

`person.proto`:

```protobuf
syntax = "proto3";

message Person {
  string name = 1;
  int32 age = 2;
  string email = 3;
}
```

The numbers are **field numbers**, not default values. They identify each field in the binary encoding, so the field *names* never go over the wire. Numbers 1–15 take one byte to encode, so give those to your most frequently set fields.

## Generate Python code

Install the runtime and a compiler. You can download `protoc` from the [protobuf releases page](https://github.com/protocolbuffers/protobuf/releases), or use the copy bundled with `grpcio-tools`:

```bash
pip install protobuf grpcio-tools
python -m grpc_tools.protoc -I. --python_out=. person.proto
```

(With a standalone `protoc` on your `PATH`, the equivalent is `protoc -I. --python_out=. person.proto`.)

This writes `person_pb2.py`. Add `--pyi_out=.` if you want type stubs for your editor. Generated Python code checks the installed `protobuf` runtime version at import time, so keep the runtime at least as new as the compiler that generated the code.

## Serialize and parse

```python
import person_pb2

person = person_pb2.Person(name="John Doe", age=30, email="john.doe@example.com")

data = person.SerializeToString()  # bytes, despite the name
print(len(data))  # 34

person2 = person_pb2.Person()
person2.ParseFromString(data)
print(person2.name)  # John Doe
```

The same message as compact JSON is 59 bytes. Most of the saving comes from not repeating field names and from varint-encoding small integers. Strings still cost their full length, so don't expect large savings for text-heavy messages.

When you need JSON (for logs, debugging, or a REST API), `google.protobuf.json_format` converts both ways:

```python
from google.protobuf import json_format

print(json_format.MessageToJson(person))
same = json_format.Parse('{"name": "Jane", "age": 41}', person_pb2.Person())
```

## Changing the schema without breaking readers

Protobuf is designed so old and new code can read each other's messages, as long as you follow a few rules:

- **Adding a field is safe.** Old readers skip field numbers they don't know (Python keeps them as unknown fields and writes them back out if the message is re-serialized). New readers see the default value (`""`, `0`, `false`, empty list) when an old message lacks the field.
- **Never change a field's number**, and never reuse a number. The number *is* the field on the wire. Reusing one means old data is decoded as the wrong field.
- **When you delete a field, reserve its number and name** so nobody reuses them later:

```protobuf
syntax = "proto3";

message Person {
  reserved 3;
  reserved "email";

  string name = 1;
  int32 age = 2;
  repeated string emails = 4;
}
```

- Renaming a field is safe for the binary format, but it breaks the JSON format, which uses names.

One proto3 gotcha: scalar fields have no "unset" state by default. An `age` of `0` and a missing `age` look the same. Mark the field `optional int32 age = 2;` if you need to tell them apart, and then check `person.HasField("age")`.

## Further reading

- [Protocol Buffers documentation](https://protobuf.dev/)
- [Language guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [Python tutorial](https://protobuf.dev/getting-started/pythontutorial/)
- [Encoding details](https://protobuf.dev/programming-guides/encoding/)
