---
description: "Define a service in Thrift IDL, generate Java and Python code, and call a Java Thrift server from a Python client, with notes on protocols and versions."
imgSrc: "/imgs/covers/apache-thrift-a-comprehensive-introduction-to-cross-language-service-development.webp"
layout: '@/templates/BasePost.astro'
pubDate: '2024-11-09T05:19:51.000Z'
lastUpdated: 2026-11-14
tags:
  - java
  - python
title: "Apache Thrift: a Java server and Python client from one IDL file"
---

Apache Thrift is an RPC framework and serialization format. You describe data types and service methods once in an interface definition language (IDL), and the `thrift` compiler generates client and server code for each language you need. Facebook open-sourced it in 2007, and it is now an Apache top-level project. This post builds a small calculator service with a Java server and a Python client.

The examples target Thrift 0.25.0, the current release. The compiler and the runtime libraries should be the same version, because generated code depends on the matching runtime.

## The pieces

- **IDL file (`.thrift`)**: structs, enums, exceptions and services, with numbered fields so the wire format can evolve without breaking older clients.
- **Compiler (`thrift`)**: turns the IDL into types, a client stub and a server-side `Processor` for each target language.
- **Runtime library**: per language (`libthrift` for Java, the `thrift` package for Python). It provides transports, protocols and servers.

A transport moves bytes (sockets, HTTP, memory buffers, with framing or buffering on top). A protocol encodes values: `TBinaryProtocol`, `TCompactProtocol` (smaller on the wire), and `TJSONProtocol`. Both ends must use the same transport and protocol, or calls fail with confusing errors.

## Step 1: define the service

Create `calculator.thrift`:

```thrift
namespace java com.example.calculator
namespace py calculator

service Calculator {
    i32 add(1: i32 num1, 2: i32 num2),
    i32 subtract(1: i32 num1, 2: i32 num2),
}
```

`namespace` sets the Java package and the Python module for the generated code.

## Step 2: generate code

```sh
thrift --gen java calculator.thrift
thrift --gen py calculator.thrift
```

This produces `gen-java/com/example/calculator/Calculator.java` and a `gen-py/calculator/` package.

## Step 3: the Java server

Add the runtime to your build (`org.apache.thrift:libthrift:0.25.0` on Maven Central) and compile the generated sources with your code:

```java
import com.example.calculator.Calculator;
import org.apache.thrift.server.TServer;
import org.apache.thrift.server.TSimpleServer;
import org.apache.thrift.transport.TServerSocket;
import org.apache.thrift.transport.TServerTransport;

public class CalculatorServer {
    public static class CalculatorHandler implements Calculator.Iface {
        @Override
        public int add(int num1, int num2) {
            return num1 + num2;
        }

        @Override
        public int subtract(int num1, int num2) {
            return num1 - num2;
        }
    }

    public static void main(String[] args) throws Exception {
        TServerTransport serverTransport = new TServerSocket(9090);
        Calculator.Processor<CalculatorHandler> processor =
                new Calculator.Processor<>(new CalculatorHandler());
        TServer server = new TSimpleServer(new TServer.Args(serverTransport).processor(processor));

        System.out.println("Starting the calculator server on port 9090...");
        server.serve();
    }
}
```

`TSimpleServer` handles one connection at a time, which is fine for a demo. Use `TThreadPoolServer` or `TThreadedSelectorServer` for real traffic. The defaults here are a plain socket transport and `TBinaryProtocol`.

## Step 4: the Python client

Install the runtime with `pip install thrift==0.25.0`. The generated `gen-py` directory is not installed, so add it to the import path:

```python
import sys

sys.path.append("gen-py")

from thrift.Thrift import TException
from thrift.transport import TSocket, TTransport
from thrift.protocol import TBinaryProtocol

from calculator import Calculator

transport = TTransport.TBufferedTransport(TSocket.TSocket("localhost", 9090))
protocol = TBinaryProtocol.TBinaryProtocol(transport)
client = Calculator.Client(protocol)

try:
    transport.open()
    print(f"10 + 20 = {client.add(10, 20)}")
    print(f"10 - 5 = {client.subtract(10, 5)}")
except TException as tx:
    print(f"Thrift error: {tx}")
finally:
    transport.close()
```

The client matches the server's defaults: buffered socket transport and binary protocol. Start the Java server, then run the script.

## Gotchas

- **Never reuse or renumber field IDs.** The numbers in the IDL (`1: i32 num1`) are what goes on the wire. Add new fields with new IDs and mark them `optional` so old clients keep working.
- **Transports must match.** A server built with `TFramedTransport` (needed by the non-blocking Java servers) will not talk to a client using `TBufferedTransport`.
- **Version drift.** Regenerate code when you upgrade the runtime library.
- **Thrift or gRPC?** Thrift is a good fit if your systems already use it, or if you want a compact format without HTTP/2. gRPC with Protocol Buffers is the more common choice for new services and has more tooling around it (streaming, deadlines, load balancing, gateways).

## Further reading

- [Apache Thrift tutorial](https://thrift.apache.org/tutorial/)
- [Thrift IDL reference](https://thrift.apache.org/docs/idl)
- [Downloads and release notes](https://thrift.apache.org/download)
