---
title: "Scheduling recurring jobs in Go with gocron"
pubDate: "2023-05-30T19:37:46.343Z"
lastUpdated: 2026-11-14
description: "Run Go functions on an interval, at a time of day or on a cron schedule with gocron v2, plus how it maps to the old jasonlvhit/gocron API."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

:::caution
This post originally used `github.com/jasonlvhit/gocron`. That package is unmaintained (its last tagged version is v0.0.1 from April 2020), and its README points to the maintained fork, [`github.com/go-co-op/gocron`](https://github.com/go-co-op/gocron). The examples below use the fork's v2 API. The original code is kept at the end for reference.
:::

gocron is an in-process job scheduler for Go: you register functions with a schedule (every N seconds, daily at 10:30, a cron expression) and a scheduler goroutine runs them. It is a good fit for periodic work inside a long-running service, such as cache refreshes or cleanup tasks. It is not a distributed job queue: if the process stops, the schedule stops with it.

## Install

In a module directory:

```bash
mkdir gocron-example && cd gocron-example
go mod init example.com/gocron-example
go get github.com/go-co-op/gocron/v2
```

The examples were checked against v2.23.1.

## Two jobs on an interval

This program prints "Hello, World!" every second and the current time every 10 seconds, then shuts the scheduler down after 30 seconds.

```go
package main

import (
	"fmt"
	"log"
	"time"

	"github.com/go-co-op/gocron/v2"
)

func printHello() {
	fmt.Println("Hello, World!")
}

func printCurrentTime() {
	fmt.Printf("Current time: %s\n", time.Now().Format("15:04:05"))
}

func main() {
	s, err := gocron.NewScheduler()
	if err != nil {
		log.Fatal(err)
	}

	if _, err := s.NewJob(
		gocron.DurationJob(time.Second),
		gocron.NewTask(printHello),
	); err != nil {
		log.Fatal(err)
	}

	if _, err := s.NewJob(
		gocron.DurationJob(10*time.Second),
		gocron.NewTask(printCurrentTime),
	); err != nil {
		log.Fatal(err)
	}

	s.Start() // non-blocking: jobs run in the background

	time.Sleep(30 * time.Second)

	if err := s.Shutdown(); err != nil {
		log.Fatal(err)
	}
}
```

Run it with `go run .`.

A job is a *definition* (when to run) plus a *task* (what to run). `NewTask` takes the function and, optionally, its arguments: `gocron.NewTask(sendReport, "daily", 42)` calls `sendReport("daily", 42)`.

`Start` returns immediately. In a real service you would block on something else (an HTTP server, a signal channel) and call `Shutdown` on exit so running jobs can finish.

## Other schedules

Each of these is a `JobDefinition` you pass as the first argument to `NewJob`:

```go
// Every day at 10:30:00 local time
gocron.DailyJob(1, gocron.NewAtTimes(gocron.NewAtTime(10, 30, 0)))

// Standard 5-field cron expression: 09:00 on weekdays
gocron.CronJob("0 9 * * 1-5", false)

// 6-field cron expression with seconds: every 15 seconds
gocron.CronJob("*/15 * * * * *", true)

// Once, five minutes from now
gocron.OneTimeJob(gocron.OneTimeJobStartDateTime(time.Now().Add(5 * time.Minute)))
```

Job options go after the task. For example, `gocron.WithLimitedRuns(3)` stops a job after three runs, and `gocron.WithSingletonMode(gocron.LimitModeReschedule)` skips a run if the previous one is still going. To remove a job, keep the `Job` returned by `NewJob` and call `s.RemoveJob(job.ID())`.

## Gotchas

- Jobs run in their own goroutines. If a job can take longer than its interval, use singleton mode or you will get overlapping runs.
- The scheduler uses the local time zone by default. Pass `gocron.WithLocation(time.UTC)` to `NewScheduler` if your servers and your schedule should agree on UTC.
- Running the same binary on several machines runs every job on every machine. gocron has elector and locker options for this, but a cron-style job in your orchestrator (Kubernetes CronJob, systemd timer) is often simpler.

## The original jasonlvhit/gocron version

For reference, this is the code the post first used. It still compiles against `github.com/jasonlvhit/gocron` v0.0.1, but that package gets no fixes.

```go
package main

import (
	"fmt"
	"time"

	"github.com/jasonlvhit/gocron"
)

func printHello() {
	fmt.Println("Hello, World!")
}

func printCurrentTime() {
	fmt.Printf("Current time: %s\n", time.Now().Format("15:04:05"))
}

func main() {
	gocron.Every(1).Second().Do(printHello)
	gocron.Every(10).Seconds().Do(printCurrentTime)

	// Start returns a channel; receiving from it blocks forever.
	<-gocron.Start()
}
```

## Further reading

- [gocron v2 on pkg.go.dev](https://pkg.go.dev/github.com/go-co-op/gocron/v2)
- [gocron examples](https://pkg.go.dev/github.com/go-co-op/gocron/v2#pkg-examples)
