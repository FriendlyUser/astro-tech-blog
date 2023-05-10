---
title: Monitoring Golang Applications with Prometheus
pubDate: "2023-11-21T02:20:37.000Z"
description: "In this article, we'll explore how to instrument a Golang application using Prometheus, and visualize the metrics in Grafana"
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Monitoring Golang Applications with Prometheus

Prometheus is a powerful open-source monitoring system and time-series database that can collect and process metrics from various sources. In this article, we'll explore how to instrument a Golang application using Prometheus, and visualize the metrics in Grafana.

## Prerequisites

Ensure that you have the following installed and configured on your system:

1. Golang (version 1.16 or later)
2. Prometheus
3. Grafana

## Overview

Our goal is to instrument a simple Golang application with Prometheus to collect and expose the following metrics:

1. Counter for the total number of HTTP requests
2. Histogram for the response latency of HTTP requests
3. Gauge for the number of in-flight requests

## Instrumenting the Golang Application

First, create a new directory for the project and initialize it as a Go module:

```sh
$ mkdir go-prometheus-example
$ cd go-prometheus-example
$ go mod init example.com/go-prometheus-example
```

Next, install the `prometheus/client_ package:

```sh
$ go get github.com/prometheus/client_golang
```

Now, create a new file called `main. and add the following code:

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
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	responseLatency = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_latency_seconds",
			Help:    "Response latency of HTTP requests",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	inFlightRequests = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "http_in_flight_requests",
		Help: "Number of in-flight HTTP requests",
	})
)

func main() {
	http.Handle("/metrics", promhttp.Handler())

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		inFlightRequests.Inc()

		status := http.StatusOK
		defer func() {
			duration := time.Since(start).Seconds()
			httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, string(status)).Inc()
			responseLatency.WithLabelValues(r.Method, r.URL.Path, string(status)).Observe(duration)
			inFlightRequests.Dec()
		}()

		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(status)
		w.Write([]byte("Hello, Prometheus!"))
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

This code sets up a simple HTTP server that listens on port 8080 and exposes the `/metrics` endpoint for Prometheus to scrape. The server responds to all other requests with a "Hello, Prometheus!" message.

The `httpRequestsTotal`, `responseLatency`, and `inFlightRequests` variables define our metrics using the Prometheus client. These metrics are automatically registered with the global Prometheus registry, thanks to the `promauto` package.

## Configuring Prometheus

Next, create a new file named `prometheus.yml` in the project directory with the following configuration:

```yaml
global:
  scrape_interval: 10s
  evaluation_interval: 10s

scrape_configs:
  - job_name: 'go-prometheus-example'
    static_configs:
      - targets: ['localhost:8080']
```

This configuration tells Prometheus to scrape metrics from our Golang application at `localhost:8080` every 10 seconds.

To start Prometheus with this configuration, run:

```sh
$ prometheus --config.file=prometheus.yml
```

## Visualizing Metrics with Grafana

Now that our Golang application is instrumented and Prometheus is scraping the metrics, we can visualize them using Grafana.

1. Start Grafana and log in with your credentials.
2. Add a new data source, selecting Prometheus as the type and providing the URL of your Prometheus server (e.g., `http://localhost:9090`).
3. Create a new dashboard and add panels to visualize the metrics collected from the Golang application.

For example, you can create a graph panel to visualize the `http_requests_total` counter and a heatmap panel to visualize the `http_response_latency_seconds` histogram.

## Conclusion

In this article, we've seen how to instrument a Golang application with Prometheus to monitor key performance indicators like request count, latency, and in-flight requests. We've also configured Prometheus to scrape our application's metrics and visualized them in Grafana.

Monitoring andcollecting metrics from your applications is critical for understanding their behavior, identifying potential issues, and optimizing performance. By integrating Prometheus and Grafana into your Golang projects, you can create powerful, customizable, and scalable monitoring solutions to help ensure the reliability and performance of your applications.
