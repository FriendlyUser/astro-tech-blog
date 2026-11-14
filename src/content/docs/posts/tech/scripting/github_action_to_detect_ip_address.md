---
title: A GitHub Action that reports the runner's public IP address and location
description: Building a TypeScript GitHub Action that looks up the runner's public IP with jsonip.com, fetches location details for it, and exposes them as step outputs.
alt: github action to detect ip addresses
tags: ["typescript", "github actions"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 21 July 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/dalle-2023-01-07-13-46-29-banana-spaceship.webp'
---

:::caution
`iplist.cc`, which the action used for IP lookups, is now a parked domain and no longer serves the API, so the published action's lookup step will fail. The `getIpInfo` example below uses [ipinfo.io](https://ipinfo.io/) instead, which has a free, token-less tier with rate limits. The action's `action.yml` also declares `using: node16`, a runtime GitHub Actions no longer provides; a maintained version would need `node24`.
:::

I wanted to know where GitHub-hosted runners are, so I wrote a small action that finds the runner's public IP address and looks up information about it. It calls two free HTTP APIs:

- [jsonip.com](https://jsonip.com) returns the caller's IP address as `{"ip": "..."}`. Depending on the network this can be an IPv4 or IPv6 address.
- An IP lookup API that returns the country, city, and network (ASN) for an address. The original action used `https://iplist.cc/api/{ip}`; the example below uses `https://ipinfo.io/{ip}/json`.

An ipinfo.io response looks like this (abbreviated):

```json
{
  "ip": "8.8.8.8",
  "hostname": "dns.google",
  "city": "Mountain View",
  "region": "California",
  "country": "US",
  "org": "AS15169 Google LLC",
  "timezone": "America/Los_Angeles"
}
```

## Making the requests

Both requests use Node's built-in `https` module wrapped in a promise, so the action has no runtime dependencies besides `@actions/core`. Two details matter for error handling: network errors are emitted on the *request* object returned by `https.get`, not on the response, and `JSON.parse` can throw if the API returns an HTML error page.

```ts
import https from 'https'

export interface IPResponse {
  ip: string
  city?: string
  region?: string
  country?: string
  org?: string
  [key: string]: unknown
}

function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`${url} returned HTTP ${res.statusCode}`))
          return
        }
        res.setEncoding('utf8')
        let body = ''
        res.on('data', chunk => {
          body += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as T)
          } catch (error) {
            reject(error)
          }
        })
      })
      .on('error', reject)
  })
}

export async function getIpAddress(): Promise<string> {
  const json = await getJson<{ip: string}>('https://jsonip.com')
  return json.ip
}

export async function getIpInfo(ip: string): Promise<IPResponse> {
  return getJson<IPResponse>(`https://ipinfo.io/${ip}/json`)
}
```

On Node 18 and later you could replace `getJson` with the built-in `fetch`; the `https` version works on any Node release.

## The action's entry point

The entry point gets the IP, looks it up, and sets one step output per field, plus `ip_raw` with the whole object. `core.setOutput` serialises non-string values to JSON. The `milliseconds` input and `wait` helper are left over from the [TypeScript action template](https://github.com/actions/typescript-action) the project was generated from.

```ts
import * as core from '@actions/core'
import {getIpAddress, getIpInfo} from './ip'
import {wait} from './wait'

async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // only shown when ACTIONS_STEP_DEBUG is true
    await wait(parseInt(ms, 10))

    const ipAddressOfRunner = await getIpAddress()
    core.debug(`ipAddressOfRunner: ${ipAddressOfRunner}`)

    const ipInfo = await getIpInfo(ipAddressOfRunner)
    core.notice(`ipInfo: ${JSON.stringify(ipInfo)}`)
    core.setOutput('ip_raw', ipInfo)
    for (const [key, value] of Object.entries(ipInfo)) {
      core.setOutput(key, value)
    }
    core.notice(`ip: ${ipInfo.ip}`)
    core.notice(`country: ${ipInfo.country}`)
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
```

## Using the action

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: FriendlyUser/ip_address_of_runner@v1.0.0
    id: ip-step
    with:
      milliseconds: 1000
  - run: |
      echo "raw: ${{ steps.ip-step.outputs.ip_raw }}"
      echo "ip: ${{ steps.ip-step.outputs.ip }}"
      echo "country: ${{ steps.ip-step.outputs.countryname }}"
```

Outputs are named after the fields in the lookup response, so with the original iplist.cc API the country was in `countryname`; with ipinfo.io it would be `country`. A run in 2023 printed a US address for the runner:

```text
ip: 104.45.204.209
country: United States of America
```

## Source

- https://github.com/FriendlyUser/ip_address_of_runner
- https://github.com/marketplace/actions/ip_address_of_runner
