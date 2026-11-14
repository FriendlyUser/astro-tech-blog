---
description: Use the go_kraken library to read your Kraken account balance, place (or just validate) a limit order, and check an order's status from Go.
imgSrc: /imgs/2023/3847215807.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-11T12:10:48.000Z'
lastUpdated: 2026-11-14
tags: ["go"]
title: Checking balances and placing orders with the Kraken REST API in Go
---

Kraken's REST API exposes public market data (tickers, order books) and private endpoints for your account (balances, orders, trades). Private calls are signed with your API key, so it's easier to use a client library than to build the signing yourself. This post uses [`go_kraken`](https://github.com/aopoltorzhicky/go_kraken) to read the account balance, place a limit order, and check its status. It is a small community library, not an official Kraken SDK, and its last release was in June 2024, so check new endpoints against Kraken's documentation.

## Prerequisites

- A recent [Go](https://go.dev/dl/) toolchain.
- A Kraken account and an API key. When you create the key, grant only what this program needs: querying funds, querying open and closed orders, and creating orders. Never give a script withdrawal permission.

## Setting up the project

```bash
mkdir kraken-go
cd kraken-go
go mod init example.com/kraken-go
go get github.com/aopoltorzhicky/go_kraken@latest
```

The REST client lives in the `rest` subpackage. Keep the credentials out of the source and read them from environment variables:

```bash
export KRAKEN_API_KEY="your-api-key"
export KRAKEN_API_SECRET="your-base64-private-key"
```

## The program

Save this as `main.go`:

```go
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/aopoltorzhicky/go_kraken/rest"
)

func main() {
	client := rest.New(os.Getenv("KRAKEN_API_KEY"), os.Getenv("KRAKEN_API_SECRET"))

	// 1. Account balance: a map of asset code to amount.
	balances, err := client.GetAccountBalances()
	if err != nil {
		log.Fatalf("retrieving balance: %v", err)
	}
	fmt.Println("Account balance:")
	for asset, amount := range balances {
		fmt.Printf("  %s: %s\n", asset, amount.String())
	}

	// 2. Limit order to buy 0.01 BTC at 30,000 USD.
	//    validateOnly=true asks Kraken to check the order without placing it.
	order, err := placeLimitBuy(client, "XBTUSD", "30000", 0.01, true)
	if err != nil {
		log.Fatalf("placing order: %v", err)
	}
	fmt.Println("Order:", order.Description.Info)

	if len(order.TransactionIds) == 0 {
		fmt.Println("Validation only: no order was submitted.")
		return
	}

	// 3. Status of the order we just placed.
	txid := order.TransactionIds[0]
	status, err := orderStatus(client, txid)
	if err != nil {
		log.Fatalf("querying order: %v", err)
	}
	fmt.Printf("Order %s status: %s\n", txid, status)
}

func placeLimitBuy(client *rest.Kraken, pair, price string, volume float64, validateOnly bool) (rest.AddOrderResponse, error) {
	args := map[string]interface{}{"price": price}
	if validateOnly {
		args["validate"] = true
	}
	return client.AddOrder(pair, "buy", "limit", volume, args)
}

func orderStatus(client *rest.Kraken, txid string) (string, error) {
	orders, err := client.QueryOrders(false, "", txid)
	if err != nil {
		return "", err
	}
	info, ok := orders[txid]
	if !ok {
		return "", fmt.Errorf("order %s not found", txid)
	}
	return info.Status, nil
}
```

Run it with `go run .`.

### Balance

`GetAccountBalances` calls the private `Balance` endpoint and returns `map[string]decimal.Decimal` (from `shopspring/decimal`), so amounts aren't rounded through `float64`. Kraken uses its own asset codes: older assets have an `X` or `Z` prefix (`XXBT` for bitcoin, `ZUSD` for US dollars), newer ones don't (`DOT`, `USDT`).

### Placing an order

`AddOrder(pair, side, orderType, volume, args)` maps to Kraken's `AddOrder` endpoint. `pair` accepts either the pair's ID or its alternative name, so `XBTUSD` works. Extra parameters such as `price` go in `args`.

With `validate` set, Kraken checks the order (pair, volume, price, permissions, funds) and returns its description, but nothing reaches the matching engine and no transaction ID comes back. Run it that way first. Pass `false` to `placeLimitBuy` only when you mean to trade, and choose a price and volume that suit your account and the market at the time.

### Checking status

`QueryOrders` takes up to 50 transaction IDs and returns the order details keyed by ID. `Status` is one of `pending`, `open`, `closed`, `canceled` or `expired`.

## Gotchas

- **Nonces**: every private request carries a nonce that must be higher than the last one used with the same API key. The library uses the current time in nanoseconds. If two programs share one key, their requests can arrive out of order and fail with `EAPI:Invalid nonce`. Use a separate key per program, or set a nonce window on the key.
- **Rate limits**: Kraken limits private calls per key with a counter that decays over time. Polling `QueryOrders` in a tight loop gets you rate-limited. For live order updates, the library's `websocket` package is the better fit.
- **Secret format**: the private key is base64. Copy it exactly; a trailing newline or missing `=` gives signature errors.

## Further reading

- [Kraken API documentation](https://docs.kraken.com/api/)
- [go_kraken examples](https://github.com/aopoltorzhicky/go_kraken/tree/master/examples)
