---
title: "Monitoring Go HTTP services with Prometheus and Grafana"
pubDate: "2023-11-21T02:20:37.000Z"
lastUpdated: 2026-11-14
description: "Instrument a Go HTTP server with client_golang (request count, latency histogram, in-flight gauge), scrape it with Prometheus and query it in Grafana."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4264430676.webp
---

Prometheus is an open-source monitoring system that periodically scrapes metrics over HTTP and stores them as time series you can query with PromQL. For a Go service you expose a `/metrics` endpoint with the official `client_golang` library, point Prometheus at it, and build dashboards in Grafana.

This post instruments a small HTTP server with three metrics:

1. A counter of HTTP requests, by status code and method
2. A histogram of request latency
3. A gauge of in-flight requests

## Prerequisites

- Go 1.26 or later (the current `client_golang`, v1.25.0, requires it)
- [Prometheus](https://prometheus.io/download/)
- [Grafana](https://grafana.com/grafana/download)

## Instrumenting the server

Create a module:

```sh
mkdir go-prometheus-example
cd go-prometheus-example
go mod init example.com/go-prometheus-example
```

Create `main.go`:

```go
package main

import (
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	requestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests.",
		},
		[]string{"handler", "code", "method"},
	)

	requestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"handler", "code", "method"},
	)

	inFlight = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "http_in_flight_requests",
		Help: "Number of HTTP requests currently being served.",
	})
)

// instrument wraps a handler so every request updates all three metrics.
func instrument(name string, h http.Handler) http.Handler {
	labels := prometheus.Labels{"handler": name}
	return promhttp.InstrumentHandlerInFlight(inFlight,
		promhttp.InstrumentHandlerDuration(requestDuration.MustCurryWith(labels),
			promhttp.InstrumentHandlerCounter(requestsTotal.MustCurryWith(labels), h),
		),
	)
}

func hello(w http.ResponseWriter, r *http.Request) {
	time.Sleep(100 * time.Millisecond) // simulate some work
	w.Write([]byte("Hello, Prometheus!\n"))
}

func main() {
	http.Handle("/", instrument("hello", http.HandlerFunc(hello)))
	http.Handle("/metrics", promhttp.Handler())
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Fetch the dependency and run it:

```sh
go mod tidy
go run .
```

Hit `http://localhost:8080/` a few times, then open `http://localhost:8080/metrics`. You'll see your three metrics alongside the `go_*` and `process_*` metrics that the default registry exports automatically.

A few notes on the code:

- `promauto` registers each metric with the default registry, which `promhttp.Handler()` serves.
- The `promhttp.InstrumentHandler*` middleware fills in the `code` and `method` labels from the real response. Writing that bookkeeping yourself is easy to get wrong. For example, `string(status)` on an `int` produces a Unicode character, not `"200"`. Use `strconv.Itoa` if you ever need to do it by hand.
- Those helpers only accept `code` and `method` as free labels. Anything else, like `handler` here, has to be fixed in advance with `MustCurryWith`, or they panic.
- Label by handler name, not by `r.URL.Path`. Raw paths like `/users/123` create a new time series per ID, and that unbounded cardinality is the most common way to overload Prometheus.

## Configuring Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 10s
  evaluation_interval: 10s

scrape_configs:
  - job_name: "go-prometheus-example"
    static_configs:
      - targets: ["localhost:8080"]
```

Start Prometheus with it:

```sh
prometheus --config.file=prometheus.yml
```

Open `http://localhost:9090/targets` to check that the target is `UP`, then try a few queries in the Prometheus UI:

```text
# Requests per second over the last 5 minutes, by status code
sum by (code) (rate(http_requests_total[5m]))

# 95th percentile latency
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# Requests being served right now
http_in_flight_requests
```

Counters only go up, so always wrap them in `rate()` or `increase()` before graphing. The raw value resets whenever the process restarts.

## Visualizing in Grafana

1. Start Grafana and open `http://localhost:3000` (the default login is `admin` / `admin`; you'll be asked to change it).
2. Go to **Connections → Data sources**, add **Prometheus**, and set the URL to `http://localhost:9090`.
3. Create a dashboard and add a **Time series** panel for each of the queries above. For the latency distribution, a **Heatmap** panel on `sum by (le) (rate(http_request_duration_seconds_bucket[5m]))` shows how the buckets shift over time.

## Next steps

- Pick histogram buckets that match your latency targets. `prometheus.DefBuckets` (5 ms to 10 s) is a generic default.
- Add alerting rules (for example on error rate or p95 latency) and route them through Alertmanager.
- If you already use OpenTelemetry, its Go SDK can export to Prometheus too, which avoids instrumenting twice.

## Further reading

- [client_golang `promhttp` package](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp)
- [Prometheus: instrumenting a Go application](https://prometheus.io/docs/guides/go-application/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Grafana: Prometheus data source](https://grafana.com/docs/grafana/latest/datasources/prometheus/)
