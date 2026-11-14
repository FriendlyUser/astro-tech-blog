---
title: "Calling SOAP APIs from Python with Zeep"
pubDate: "2024-04-10T10:00:00.000Z"
lastUpdated: 2026-11-14
description: "How to call a SOAP web service from Python with Zeep: inspect a WSDL, call operations, build complex types, handle faults and log the raw XML."
tags: ["Zeep", "SOAP APIs", "Python", "Web Services", "XML", "Web Development", "Backend Development", "Programming", "Software Development"]
layout: "@/templates/BasePost.astro"
imgSrc: "https://unsplash.com/photos/a-piece-of-soap-sitting-on-top-of-a-black-plate-nEyRQYS2Jp8"
---

SOAP is older and wordier than REST, but plenty of enterprise, government and banking systems still expose SOAP services. If you have to call one from Python, [Zeep](https://docs.python-zeep.org/) is the client to use. It reads the service's WSDL, builds the XML envelopes for you and parses responses back into Python objects.

The examples below were run against Zeep 4.3.3 (which needs Python 3.10 or later) and a public demo calculator service.

## SOAP and WSDL in two paragraphs

A SOAP message is an XML document with an `Envelope` root, an optional `Header` (authentication tokens, transaction IDs and so on) and a `Body` holding the request or response. In practice it almost always travels as an HTTP POST.

The WSDL (Web Services Description Language) file is the service's contract. It lists the operations, the XML types each one accepts and returns, and the endpoint address. Zeep loads the WSDL once and uses it to validate and serialise everything you send.

## Install

```bash
pip install zeep
```

## Inspect the WSDL

Before writing code, see what the service offers. Zeep ships a command-line dump:

```bash
python -m zeep http://www.dneonline.com/calculator.asmx?WSDL
```

The output lists namespace prefixes, types, and every operation with its signature, for example:

```text
ns0:Add(intA: xsd:int, intB: xsd:int)
ns0:AddResponse(AddResult: xsd:int)
```

You can get the same output from code with `client.wsdl.dump()`.

## Call an operation

```python
from zeep import Client

client = Client("http://www.dneonline.com/calculator.asmx?WSDL")

print(client.service.Add(intA=2, intB=3))  # 5
print(client.service.Divide(10, 2))        # positional arguments work too: 5
```

Each operation in the WSDL becomes a method on `client.service`. Simple results come back as plain Python values. Structured results come back as Zeep objects that you can turn into ordinary dicts with `zeep.helpers.serialize_object(result)`.

## Complex types

Real services take nested structures rather than two integers. Zeep accepts a plain dict for a complex parameter, or you can build the type explicitly from the WSDL. Here `UpdateUser` and `ns0:UserInfo` stand in for whatever your WSDL defines (check the names in the `python -m zeep` dump):

```python
UserInfo = client.get_type("ns0:UserInfo")
user = UserInfo(name="John Doe", age=30)

client.service.UpdateUser(userId="abc123", user=user)
# equivalent:
client.service.UpdateUser(userId="abc123", user={"name": "John Doe", "age": 30})
```

Building the type explicitly gives you an early error if a field name is wrong, instead of a server-side fault.

## Timeouts, authentication and headers

Zeep uses `requests` underneath, so you configure HTTP behaviour through a `requests.Session` passed in a `Transport`:

```python
from requests import Session
from requests.auth import HTTPBasicAuth
from zeep import Client
from zeep.transports import Transport

session = Session()
session.auth = HTTPBasicAuth("user", "password")

client = Client(
    "http://www.dneonline.com/calculator.asmx?WSDL",
    transport=Transport(session=session, timeout=10),
)
```

Services that use WS-Security expect the credentials inside the SOAP header instead; pass `wsse=UsernameToken("user", "password")` (from `zeep.wsse.username`) to `Client`. Other SOAP headers go in the `_soapheaders` argument of an operation call. That argument is for SOAP header elements, not HTTP headers.

## Attachments

Zeep can read multipart (MTOM / SwA) responses: it returns a `MessagePack` whose `attachments` you can iterate. Its documentation only covers receiving attachments, not sending them. If a service expects you to upload a file, check the WSDL: many services take the file as a `base64Binary` field, which you pass as `bytes`.

## Handling faults

A SOAP error comes back as a `Fault`. The calculator returns one when you divide by zero:

```python
from zeep.exceptions import Fault

try:
    client.service.Divide(intA=1, intB=0)
except Fault as error:
    print(error.code)     # soap:Server
    print(error.message)  # the server's fault string
```

`zeep.exceptions` also has `TransportError` (non-200 HTTP responses that aren't SOAP faults) and `ValidationError` (your arguments don't match the WSDL).

## Seeing the raw XML

When a call fails and you can't tell why, look at what was actually sent. The `zeep.transports` logger writes full requests and responses at DEBUG level:

```python
import logging

logging.basicConfig(level=logging.INFO)
logging.getLogger("zeep.transports").setLevel(logging.DEBUG)
```

For programmatic access, use `HistoryPlugin`:

```python
from lxml import etree
from zeep import Client
from zeep.plugins import HistoryPlugin

history = HistoryPlugin()
client = Client("http://www.dneonline.com/calculator.asmx?WSDL", plugins=[history])
client.service.Add(intA=1, intB=2)

print(etree.tostring(history.last_sent["envelope"], pretty_print=True).decode())
print(etree.tostring(history.last_received["envelope"], pretty_print=True).decode())
```

## Gotchas

- Loading a large WSDL (and the schemas it imports) on every run is slow. Pass `Transport(cache=SqliteCache())` from `zeep.cache` to cache the downloads.
- Some services have WSDLs that don't quite match what the server sends. `Client(wsdl, settings=Settings(strict=False))` relaxes parsing.
- If the WSDL's endpoint address is wrong (common with internal services behind proxies), use `client.create_service("{http://tempuri.org/}CalculatorSoap", "https://internal-host/calculator.asmx")` to call the same binding (named as `{namespace}BindingName`) at a different URL.

## Further reading

- [Zeep documentation](https://docs.python-zeep.org/)
- [Zeep on PyPI](https://pypi.org/project/zeep/)
