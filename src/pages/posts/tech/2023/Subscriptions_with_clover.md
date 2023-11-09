---
title: "Integrating Recurring Payments with Clover API"
pubDate: "2024-12-31T00:03:37.000Z"
description: "Learn how to use Clover API to tokenize credit card information, create customer profiles, look up tax rates, and manage subscriptions for recurring payments in your applications."
tags: ["Clover API", "Payment Integration", "Recurring Payments", "Web Development"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/clover_api.png"
---


# Introduction

Clover offers a suite of APIs that allow developers to integrate Clover functionality into their own applications. One useful feature is the ability to subscribe customers to recurring payment plans. This allows collecting automatic recurring payments from customers on a schedule. 

This article will explain how to use the Clover APIs to:

- Tokenize credit card information to create a payment source
- Create a customer profile 
- Lookup tax rates
- Create a subscription plan under an existing recurring payment plan
- Charge the customer's card automatically based on the subscription

# Prerequisites

To follow along with the examples, you will need:

- A Clover developer account and merchant ID
- API keys for the Token, Connector, and Commerce APIs 
- The OAuth token for making API requests
- The ID of the recurring plan you want to subscribe customers to

For testing, you can use the Clover sandbox environment with test API keys and merchant accounts.

# Tokenize the Credit Card

The first step is to collect the customer's credit card information on your site or app. Then tokenize the card data by making a request to the Token API:

```
$creditCard = [
  'number' => $cardNumber,
  'exp_month' => $expiryMonth, 
  'exp_year' => $expiryYear,
  'cvv' => $cvv,
  'name' => $nameOnCard
  // other address fields  
];

$url = "https://sandbox.dev.clover.com/v1/tokens";

// Call API to create token
$response = apiRequest($url, $creditCard); 

// Extract token id 
$cardToken = $response['id'];
```

This will return a token that represents the credit card, which we can use for payments without passing sensitive card data to our server.

# Create the Customer Profile

Next we need to create a customer profile that is attached to the card token:

```
$customer = [
  'email' => $email,
  'firstName' => $firstName,
  'lastName' => $lastName,
  'phone' => $phone,
  'source' => $cardToken
];

$url = "https://scl-sandbox.dev.clover.com/v1/customers";

// Call API to create customer
$response = apiRequest($url, $customer);
  
// Extract customer id
$customerId = $response['id'];
```

This customer record will allow us to charge the tokenized card.

# Lookup Tax Rates

If charging taxes, we need to lookup the tax rates configured in the merchant's Clover account:

```
$url = "https://sandbox.dev.clover.com/v3/merchants/{merchantId}/tax_rates";

// Call API 
$response = apiRequest($url);

// Find first non-zero tax rate 
foreach ($response['elements'] as $tax) {
  if ($tax['rate'] > 0) {
     $taxId = $tax['id'];
     break;
  } 
}
```

This will give us the tax rate ID to include when creating the subscription.

# Create the Subscription 

Now we can create the subscription plan under the recurring payment plan:

```
// Existing plan ID
$planId = "existing-plan-uuid"; 

// Subscription details
$subscription = [
  'customerId' => $customerId,
  'startDate' => '2023-02-01T00:00:00Z', 
  'collectionMethod' => 'CHARGE_AUTOMATICALLY',
  'amount' => $amount * 100 // In cents
];

// API endpoint 
$url = "https://sandbox.dev.clover.com/recurring/v1/plans/$planId/subscriptions";

// Call API to create subscription
$response = apiRequest($url, $subscription);

// Check response
if ($response['status'] == 200) {
  // Subscription created successfully
} else {
  // Handle error
}
```

This allows creating a subscription attached to a particular recurring payment plan. The customer will then be billed according to the plan schedule

The customer is now enrolled in the recurring payment plan!

# Conclusion

The Clover APIs provide a way to easily integrate recurring billing into your application. By tokenizing cards, creating customer records, and setting up a subscription, you can support automatic recurring payments from customers.

The same approach works for one-time payments as well. Overall, the Clover APIs give developers flexible options for managing payments in their software.