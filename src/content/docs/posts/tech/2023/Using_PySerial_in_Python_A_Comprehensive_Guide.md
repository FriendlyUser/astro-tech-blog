---
description: Open a serial port with PySerial, read and write bytes, set timeouts and line settings, handle incoming lines on a background thread, and read sensor data from an Arduino.
imgSrc: /imgs/2023/818001379.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-24T22:56:56.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: Talking to serial devices from Python with PySerial
---

PySerial gives Python access to serial ports (COM ports on Windows, `/dev/tty*` devices on Linux and macOS) through one API. It's the usual way to talk to an Arduino, a GPS module, a USB-to-UART adapter or lab equipment from a Python script. The examples below were checked against PySerial 3.5, which is still the current release on PyPI (November 2020).

PySerial handles UART-style serial ports only. SPI and I2C are also "serial" buses, but a PC doesn't expose them as serial ports, so you need different hardware and libraries for those.

## Installing PySerial

```bash
pip install pyserial
```

The package is installed as `pyserial` but imported as `serial`. Don't install the unrelated `serial` package from PyPI by mistake; it shadows the import and gives confusing errors.

To see which ports exist on your machine:

```bash
python -m serial.tools.list_ports
```

## Opening and closing a port

Passing a port name to `serial.Serial` opens it immediately:

```python
import serial

ser = serial.Serial("COM3", 9600)  # port name, baud rate
# ... use the port ...
ser.close()
```

On Windows, ports are named `COM1`, `COM3` and so on. On Linux, USB adapters usually appear as `/dev/ttyUSB0` or `/dev/ttyACM0`; on macOS, as `/dev/cu.usbserial-*` or `/dev/cu.usbmodem*`. On Linux your user typically needs to be in the `dialout` group (or your distro's equivalent) to open them.

`Serial` also works as a context manager, which closes the port even if your code raises:

```python
import serial

with serial.Serial("COM3", 9600, timeout=1) as ser:
    ser.write(b"ping\n")
```

## Reading and writing

PySerial reads and writes `bytes`, not `str`, so encode on the way out and decode on the way in:

```python
ser.write("Hello, world!\n".encode("ascii"))

line = ser.readline().decode("ascii", errors="replace")
print(line)
```

- `read(n)` reads up to `n` bytes.
- `readline()` reads until `\n`.
- `in_waiting` tells you how many bytes are already buffered.

`errors="replace"` stops a single corrupted byte, which is common right after a device resets, from raising `UnicodeDecodeError`.

## Timeouts and line settings

Without a timeout, `read()` and `readline()` block until they get what they asked for, which can be forever. Set `timeout` (in seconds) when you open the port:

```python
ser = serial.Serial("COM3", 9600, timeout=1)
```

With a timeout, `readline()` returns whatever arrived before the timeout, which may be a partial line or `b""`. Check for that before parsing.

The defaults are 8 data bits, no parity and 1 stop bit ("8N1"), which most devices use. If yours needs something else, set it explicitly:

```python
import serial

ser = serial.Serial(
    "COM3",
    9600,
    timeout=1,
    bytesize=serial.EIGHTBITS,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
)
```

These are line settings, not buffer sizes. PySerial only lets you change the OS buffer sizes on Windows, through `ser.set_buffer_size(rx_size=..., tx_size=...)`.

## Handling incoming lines on a background thread

If your program has other work to do, the `serial.threaded` module can read on a background thread and call you back. `LineReader` buffers the input and calls `handle_line()` once per line. It splits on `\r\n` by default, which matches Arduino's `Serial.println()`, and decodes as UTF-8:

```python
import time

import serial
import serial.threaded


class PrintLines(serial.threaded.LineReader):
    def handle_line(self, line):
        print(f"received: {line}")

    def connection_lost(self, exc):
        super().connection_lost(exc)
        print("port closed")


ser = serial.Serial("COM3", 9600, timeout=1)
with serial.threaded.ReaderThread(ser, PrintLines) as protocol:
    protocol.write_line("hello")  # sends "hello\r\n"
    time.sleep(10)  # do other work here; lines are handled in the background
```

`ReaderThread` takes the class (a protocol factory), not an instance. Leaving the `with` block stops the thread and closes the port. If your device ends lines with a bare `\n`, subclass `LineReader` and set `TERMINATOR = b"\n"`.

## Example: reading sensor data from an Arduino

Suppose the Arduino sends one reading per line in the form `name:value`, using `Serial.println()`:

```python
import time

import serial

with serial.Serial("COM3", 9600, timeout=1) as ser:
    time.sleep(2)  # most Arduino boards reset when the port opens
    ser.reset_input_buffer()

    while True:
        line = ser.readline().decode("ascii", errors="replace").strip()
        if not line:
            continue  # timed out with nothing to read
        name, sep, value = line.partition(":")
        if not sep:
            print(f"skipping malformed line: {line!r}")
            continue
        print(f"{name}: {value}")
```

Stop it with Ctrl+C. A few things this handles that a naive loop doesn't:

- Opening the port toggles DTR, which resets boards such as the Uno. The sketch then spends a moment in the bootloader, so wait before reading and throw away anything already buffered.
- An empty or partial line after a timeout is skipped instead of crashing on unpacking.
- The baud rate must match the `Serial.begin()` call in the sketch. A mismatch shows up as garbage characters rather than as an error.

## Further reading

- [PySerial short introduction](https://pyserial.readthedocs.io/en/latest/shortintro.html)
- [PySerial API reference](https://pyserial.readthedocs.io/en/latest/pyserial_api.html)
