---
title: "Subscribing a customer to a Clover recurring plan with PHP"
pubDate: "2024-12-31T00:03:37.000Z"
lastUpdated: 2026-11-14
description: "Use Clover's sandbox APIs from PHP to tokenize a card, create a customer with a card on file, look up a tax rate, and subscribe them to a recurring plan."
tags: ["Clover API", "Payment Integration", "Recurring Payments", "Web Development", "php"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/clover-api.webp"
---

Clover's Recurring Payments API charges a saved card on a schedule defined by a *plan*. To put a customer on a plan you need four calls: tokenize the card, create a customer with that card on file, optionally look up a tax rate, and create a subscription under the plan. Once the subscription exists, Clover charges the card automatically; there is no separate "charge" call.

All examples below use the sandbox hosts and PHP with the `curl` extension.

## Prerequisites

- A Clover sandbox developer account with a test merchant and its merchant ID (`mId`).
- An API token for that merchant (a test API token, or an OAuth `access_token` for multi-merchant apps). Reading tax rates needs inventory read permission.
- An Ecommerce public API key (PAKMS key), used only for tokenizing cards.
- The ID of an existing recurring plan.

:::caution
Posting raw card numbers from your own server puts that server in PCI DSS scope. Clover's docs recommend sending an `encrypted_pan` instead of `number`, and Clover's iframe tokenizes the card in the browser so that only the `clv_...` token reaches your backend. Use the raw-number request below for sandbox testing with test cards only.
:::

## A small request helper

Each Clover API uses a different host and auth header, so the helper takes the full URL and headers and throws on any HTTP error:

```php
<?php

function cloverRequest(string $method, string $url, array $headers = [], ?array $body = null): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(
            ['Accept: application/json', 'Content-Type: application/json'],
            $headers
        ),
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    if ($raw === false) {
        throw new RuntimeException('Request failed: ' . curl_error($ch));
    }

    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($status >= 400) {
        throw new RuntimeException("Clover API returned $status: $raw");
    }

    return json_decode($raw, true) ?? [];
}

$merchantId = getenv('CLOVER_MERCHANT_ID');
$apiToken   = getenv('CLOVER_API_TOKEN');
$pakmsKey   = getenv('CLOVER_PAKMS_KEY');
$planId     = getenv('CLOVER_PLAN_ID');

$auth = ["Authorization: Bearer $apiToken"];
```

## 1. Tokenize the card

The token endpoint authenticates with the PAKMS key in an `apikey` header, and the card fields go inside a `card` object:

```php
$token = cloverRequest('POST', 'https://token-sandbox.dev.clover.com/v1/tokens', ["apikey: $pakmsKey"], [
    'card' => [
        'number'    => $cardNumber, // a Clover sandbox test card
        'exp_month' => $expiryMonth, // e.g. "12"
        'exp_year'  => $expiryYear,  // e.g. "2030"
        'cvv'       => $cvv,
    ],
]);

$cardToken = $token['id']; // starts with "clv_"
```

## 2. Create the customer with the card on file

Passing the token as `source` when creating the customer saves the card on file, which the subscription will charge:

```php
$customer = cloverRequest('POST', 'https://scl-sandbox.dev.clover.com/v1/customers', $auth, [
    'email'     => $email,
    'firstName' => $firstName,
    'lastName'  => $lastName,
    'source'    => $cardToken,
]);

$customerId = $customer['id'];
```

Card network rules require the cardholder's explicit consent before you store their card, so collect that in your checkout flow.

## 3. Look up a tax rate (optional)

Tax rates are configured per merchant and returned by the platform REST API:

```php
$taxRates = cloverRequest(
    'GET',
    "https://apisandbox.dev.clover.com/v3/merchants/$merchantId/tax_rates",
    $auth
);

$taxId = null;
foreach ($taxRates['elements'] ?? [] as $tax) {
    if ($tax['rate'] > 0) {
        $taxId = $tax['id'];
        break;
    }
}
```

Picking the first non-zero rate is fine for a demo. In a real integration, choose the rate the merchant intends for this product.

## 4. Create the subscription

The subscription is created under the plan, and the request needs the merchant ID in an `X-Clover-Merchant-Id` header:

```php
$startDate = (new DateTimeImmutable('tomorrow', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');

$subscription = [
    'customerId'       => $customerId,
    'collectionMethod' => 'CHARGE_AUTOMATICALLY',
    'startDate'        => $startDate,
];
if ($taxId !== null) {
    $subscription['taxRateUuids'] = [$taxId];
}

$result = cloverRequest(
    'POST',
    "https://apisandbox.dev.clover.com/recurring/v1/plans/$planId/subscriptions",
    array_merge($auth, ["X-Clover-Merchant-Id: $merchantId"]),
    $subscription
);

echo "Created subscription {$result['id']}\n";
```

`CHARGE_AUTOMATICALLY` is currently the only allowed `collectionMethod`. The plan defines the amount and schedule. You can override the amount per subscription with `amount` (and add `tipAmount` or `endDate`), but the docs don't spell out the unit, so check it in the sandbox before sending real values. Clover's Ecommerce APIs generally use cents.

Errors are reported with HTTP status codes, which the helper turns into exceptions. Check the HTTP status, not a `status` field in the JSON body.

## Gotchas

- **Several hosts.** Tokens, Ecommerce (`scl-`) and platform/recurring APIs each have their own sandbox host, and production uses different ones again. Keep them in config rather than hard-coding them.
- **401 on tax rates.** This usually means the token lacks inventory read permission.
- **One-time payments** use the same card token or customer as the `source` of a charge on the Ecommerce API (`/v1/charges`), with no plan involved.

## Further reading

- [Clover: Create a card token](https://docs.clover.com/dev/docs/create-a-card-token)
- [Clover: Save a card for future transactions](https://docs.clover.com/dev/docs/save-a-card-for-future-transactions)
- [Clover: Recurring payments plans](https://docs.clover.com/dev/docs/working-with-recurring-payments-and-subscriptions)
- [Clover: Recurring payments subscriptions](https://docs.clover.com/dev/docs/recurring-apis-subscriptions)
