---
description: In this article, we will explore the PySerial library and its various
  functions, as well as how to use it effectively in Python
imgSrc: /imgs/2023/818001379.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-24T22:56:56.000Z'
tags: []
title: Using PySerial in Python A Comprehensive Guide
---

# Using PySerial in Python: A Comprehensive Guide

PySerial is a Python library that provides access to the serial ports on a variety of operating systems. It is widely used for communication between microcontrollers and computers, enabling the exchange of data over serial communication protocols. In this article, we will explore the PySerial library and its various functions, as well as how to use it effectively in Python.

## Table of Contents

1. [Introduction to Serial Communication](#introduction-to-serial-communication)
2. [Installing PySerial](#installing-pyserial)
3. [Opening and Closing a Serial Port](#opening-and-closing-a-serial-port)
4. [Reading and Writing Data](#reading-and-writing-data)
5. [Setting Timeout and Buffer Sizes](#setting-timeout-and-buffer-sizes)
6. [Working with Serial Events](#working-with-serial-events)
7. [Example: Reading Sensor Data from Arduino](#example-reading-sensor-data-from-arduino)
8. [Conclusion](#conclusion)

### Introduction to Serial Communication

Serial communication is a way of transmitting data between two devices using a serial interface. It involves sending data one bit at a time, sequentially, over a single communication channel. Some popular serial communication protocols include UART (Universal Asynchronous Receiver/Transmitter), SPI (Serial Peripheral Interface), and I2C (Inter-Integrated Circuit).

PySerial makes it easy to work with serial devices in Python, abstracting away the underlying hardware and providing a consistent, easy-to-use interface regardless of the platform you are using.

### Installing PySerial

To install PySerial, use the following pip command:

```bash
pip install pyserial
```

This will download and install the latest version of PySerial from the Python Package Index (PyPI).

### Opening and Closing a Serial Port

To start using PySerial, you'll need to open a serial port. This is usually done by specifying the port name and the baud rate. The baud rate is the speed at which the data is transmitted over the serial connection, measured in bits per second (bps).

Here's an example of opening a serial port:

```python
import serial

ser = serial.Serial('COM3', 9600)  ## Open serial port with the name 'COM3' and baud rate of 9600
```

Make sure to replace `'COM3'` with the appropriate port name for your system. On Windows, port names are usually in the format `'COMx'`, while on Linux and macOS, they are in the format `'/dev/ttyUSBx'` or `'/dev/ttyACMx'`.

Once you've finished using the serial port, it's important to close it to free up system resources:

```python
ser.close()
```

### Reading and Writing Data

To read data from the serial port, you can use the `read()` or `readline()` methods. The `read()` method reads a specified number of bytes from the serial port, while the `readline()` method reads a line of data terminated by a newline character (`\n`).

Here's an example of reading a line of data:

```python
data = ser.readline().decode('ascii')  ## Read a line of data and decode it as an ASCII string
print(data)
```

To write data to the serial port, use the `write()` method:

```python
data = "Hello, world!\n"
ser.write(data.encode('ascii'))  ## Encode the string as ASCII and write it to the serial port
```

### Setting Timeout and Buffer Sizes

PySerial allows you to set a timeout for read operations, which is useful when you don't want your program to block indefinitely while waiting for data. To set a timeout, simply pass the `timeout` parameter when opening the serial port:

```python
ser = serial.Serial('COM3', 9600, timeout=1)  ## Set a timeout of 1 second
```

In addition to setting a timeout, you can also control the size of the input and output buffers:

```python
ser = serial.Serial('COM3', 9600, timeout=1, bytesize=8, parity='N', stopbits=1)
```

This example sets the byte size to 8 bits, no parity, and one stop bit. These parameters are common for most serial devices, but you may need to adjust them based on the device you are communicating with.

### Working with Serial Events

In some cases, you may want to perform specific actions when certain events occur, such as when new data is received. PySerial provides support for event-driven programming through the `serial.threaded` sub-module.

Here's an example of using a `serial.threaded.ReaderThread` to handle incoming data:

```python
import serial
import serial.threaded

class SerialReader(serial.threaded.Protocol):
    def __init__(self):
        self.buffer = bytearray()

    def data_received(self, data):
       self.buffer.extend(data)
        if b'\n' in self.buffer:
            lines = self.buffer.split(b'\n')
            self.buffer = bytearray()
            for line in lines[:-1]:
                print(line.decode('ascii'))

ser = serial.Serial('COM3', 9600, timeout=1)
with serial.threaded.ReaderThread(ser, SerialReader) as protocol:
    ## The ReaderThread will automatically call the data_received method when data is received
    ## You can perform other tasks here while the ReaderThread handles incoming data
    time.sleep(10)  ## Example: wait for 10 seconds before exiting
```

This example defines a `SerialReader` class that inherits from `serial.threaded.Protocol`. The `data_received()` method is automatically called whenever new data is received, making it easy to handle incoming data in an event-driven manner.

### Example: Reading Sensor Data from Arduino

In this example, we'll use PySerial to read sensor data from an Arduino. Assume that the Arduino is programmed to send sensor data as a string in the format `"<sensor_name>:<value>\n"` over the serial port.

```python
import serial

## Open the serial port
ser = serial.Serial('COM3', 9600, timeout=1)

def read_sensor_data():
    data = ser.readline().decode('ascii').strip()
    if data:
        sensor_name, value = data.split(':')
        print(f"{sensor_name}: {value}")

## Read sensor data in a loop
while True:
    read_sensor_data()
```

This simple script continuously reads and prints sensor data from the Arduino. Make sure to adapt the port name (`'COM3'` in this example) to match your system.

### Conclusion

PySerial is a powerful and easy-to-use Python library for working with serial communication. It provides a consistent interface across various platforms and simplifies the process of opening, closing, reading from, and writing to serial ports. By leveraging PySerial's capabilities and following best practices, you can create robust applications that communicate with a wide range of serial devices, such as microcontrollers and sensors.

In this article, we've covered the basics of PySerial, including installation, opening and closing serial ports, reading and writing data, setting timeouts and buffer sizes, working with serial events, and an example of reading sensor data from an Arduino. With this knowledge, you're well-equipped to start using PySerial in your own Python projects.
To get started with Pascal, you'll need to set up the development environment. One of the most popular Pascal compilers is Free Pascal, and an IDE (Integrated Development Environment) that works well with it is Lazarus. This tutorial will guide you through the process of setting up the Free Pascal Compiler (FPC) and Lazarus IDE on Windows, macOS, and Linux.

### Windows

1. **Download the installer:**
   Visit the [Free Pascal official download page](https://www.freepascal.org/download.var) and download the latest version of the installer for Windows.

2. **Install Free Pascal:**
   Run the installer and follow the instructions to install Free Pascal on your system.

3. **Download Lazarus:**
   Visit the [Lazarus official download page](https://www.lazarus-ide.org/index.php?page=downloads) and download the latest version of the installer for Windows.

4. **Install Lazarus:**
   Run the installer and follow the instructions to install Lazarus on your system. During the installation process, it may ask you for the path to the Free Pascal Compiler. Provide the path where you installed the FPC.

### macOS

1. **Download the installer:**
   Visit the [Free Pascal official download page](https://www.freepascal.org/download.var) and download the latest version of the installer for macOS.

2. **Install Free Pascal:**
   Open the downloaded disk image file and run the installer package. Follow the instructions to install Free Pascal on your system.

3. **Download Lazarus:**
   Visit the [Lazarus official download page](https://www.lazarus-ide.org/index.php?page=downloads) and download the latest version of the installer for macOS.

4. **Install Lazarus:**
   Open the downloaded disk image file and run the installer package. Follow the instructions to install Lazarus on your system.

### Linux

1. **Install Free Pascal:**
   Most Linux distributions have the Free Pascal Compiler available in their package repositories. Open a terminal and enter the following command to install FPC:

   - On Debian-based systems (including Ubuntu and Linux Mint):
     ```
     sudo apt-get install fpc
     ```
   - On Red Hat-based systems (including Fedora and CentOS):
     ```
     sudo dnf install fpc
     ```

2. **Install Lazarus:**
   Likewise, Lazarus is available in the package repositories of most Linux distributions. Enter the following command in the terminal to install Lazarus:

   - On Debian-based systems:
     ```
     sudo apt-get install lazarus
     ```
   - On Red Hat-based systems:
     ```
     sudo dnf install lazarus
     ```

After completing the installation process, you can start Lazarus and begin writing Pascal programs. To create a new project, select "File" > "New" > "Project" > "Application" from the main menu, and then save the project. You'll see a default form and a source code editor. You can add components to the form, write code, and compile your program by selecting "Run" > "Build" or by pressing the F9 key.