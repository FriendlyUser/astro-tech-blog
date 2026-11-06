---
title: Github action to detect ip addresses
description: Leveraging free apis to detect ip addresses
alt: github action to detect ip addresses
tags: ["typescript", "github actions"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 21 July 2023 13:00:00 GMT
imgSrc: '/imgs/2023/DALL·E 2023-01-07 13.46.29 - banana spaceship.png'
---

In this article we will use jsonip and https://iplist.cc in order to gather data the requester's ip address

https://jsonip.com is a simple JSON-based API that returns the client's IP address in a JSON object. It is useful for getting the client's IP address in a web application.

Here is an example response from https://jsonip.com:
```js
{
  "ip": "123.456.789.012"
}
```

You can send a GET request to https://jsonip.com to retrieve the client's IP address. The response will be a JSON object with a single field, "ip", which contains the client's IP address as a string.


https://iplist.cc is a website that provides an API for retrieving information about an IP address. The API is a simple JSON-based API that returns a variety of information about the specified IP address, such as the country, region, city, time zone, latitude and longitude, and ASN (Autonomous System Number) information.

You can send a GET request to https://iplist.cc/api/{ip}, where {ip} is the IP address you want to look up, to retrieve information about the IP address. The response will be a JSON object containing the information about the IP address.

Here is an example response from https://iplist.cc/api/123.456.789.012:
```
{
  "ip": "123.456.789.012",
  "registry": "ARIN",
  "countrycode": "US",
  "countryname": "United States",
  "asn": {
    "code": "AS7922",
    "name": "Comcast Cable Communications, Inc.",
    "route": "123.456.0.0/16",
    "start": "123.456.0.0",
    "end": "123.456.255.255",
    "count": "65536"
  },
  "spam": false,
  "tor": false,
  "city": "Chicago",
  "detail": "Illinois, United States",
  "website": [
    "comcast.com"
  ]
}
```

## Implementing action

First we will implement the requests using https (built-in node module).

By wrapping the request in a promise, we can still use async functions in javascript and handle errors accordingly.

In the future, we can build a wrapper around the promise to handle timeouts.

```ts
import {IPResponse} from './types'
import https from 'https'

export async function getIpAddress(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get('https://jsonip.com', res => {
      res.setEncoding('utf8')
      let body = ''
      res.on('data', data => {
        body += data
      })
      res.on('end', () => {
        const json = JSON.parse(body)
        resolve(json.ip)
      })
      res.on('error', error => {
        reject(error)
      })
    })
  })
}

export const getIpInfo = async (ip: string): Promise<IPResponse> => {
  return new Promise((resolve, reject) => {
    https.get(`https://iplist.cc/api/${ip}`, res => {
      res.setEncoding('utf8')
      let body = ''
      res.on('data', data => {
        body += data
      })
      res.on('end', () => {
        const json = JSON.parse(body)
        resolve(json)
      })
      res.on('error', error => {
        reject(error)
      })
    })
  })
}
```

This code defines two functions: getIpAddress and getIpInfo.

getIpAddress makes an HTTPS GET request to the https://jsonip.com endpoint and returns the ip field from the response in JSON format as a string.

getIpInfo makes an HTTPS GET request to the https://iplist.cc/api/[ip] endpoint, where [ip] is the value passed as an argument to the function. It returns the entire response from the endpoint in JSON format.

Both functions use the https module from Node.js to make the HTTP request and return a promise that resolves with the desired data or rejects with an error.


Importing these functions into the main github action logic we get:

```ts
import * as core from '@actions/core'
import {getIpAddress, getIpInfo} from './ip'
import {wait} from './wait'

async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true

    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())
    // getIpAddress
    // get ip
    const ipAddressOfRunner = await getIpAddress()
    core.debug(`ipAddressOfRunner: ${ipAddressOfRunner}`)

    // get ip info
    const ipInfo = await getIpInfo(ipAddressOfRunner)
    // output ip info
    core.notice(`ipInfo: ${JSON.stringify(ipInfo)}`)
    core.setOutput('ip_raw', ipInfo)
    // for each property in ipInfo, set output
    for (const [key, value] of Object.entries(ipInfo)) {
      core.setOutput(key, value)
    }
    core.notice(`ip: ${ipInfo.ip}`)
    core.notice(`country: ${ipInfo.countryname}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
```

It imports the core object from the @actions/core package, as well as the getIpAddress and getIpInfo functions from another module and the wait function from another.

The code defines an async function called run that does the following:

1. Reads the input milliseconds from the core object and logs a debug message.
2. Logs the current time in a debug message.
3. Waits for the number of milliseconds specified by the milliseconds input using the wait function.
4. Logs the current time in a debug message.
5. Calls the getIpAddress function and stores the result in a variable called ipAddressOfRunner.
Logs the ipAddressOfRunner in a debug message.
6. Calls the getIpInfo function with the ipAddressOfRunner as an argument and stores the result in a variable called ipInfo.
7. Sets the output ip_raw to the value of ipInfo.
8. Iterates over the properties of ipInfo and sets an output for each property using the core.setOutput method.
9. Logs a notice message with the ip and countryname properties of ipInfo.
10. If an error occurs at any point, the catch block logs the error message using the core.setFailed method. Finally, the run function is called.

### Using action

```bash
steps:
  - uses: actions/checkout@v2
  - uses: FriendlyUser/ip_address_of_runner@v1.0.0
    id: ip-step
    with:
      milliseconds: 1000
  # script output contents of ip from the step
  - run: |
      echo "ip: ${{ steps.ip-step.outputs.ip_raw }}"
      echo "ip: ${{ steps.ip-step.outputs.ip }}"
      echo "ip: ${{ steps.ip-step.outputs.countryname }}"
```

This is a GitHub Actions workflow. It looks like this workflow is checking out the code repository and running a step called "ip_address_of_runner" from an action called "FriendlyUser/ip_address_of_runner@v1.0.0". This step is given an id of "ip-step" and is passed an input called "milliseconds" with a value of "1000".

After the step has run, the workflow echoes the contents of the "ip_raw", "ip", and "countryname" outputs from the "ip-step". These outputs are likely provided by the "FriendlyUser/ip_address_of_runner@v1.0.0" action.

The output is

```bash
ip: 104.45.204.209
ip: United States of America
```

To view the full github action please visit

* https://github.com/FriendlyUser/ip_address_of_runner
* https://github.com/marketplace/actions/ip_address_of_runner