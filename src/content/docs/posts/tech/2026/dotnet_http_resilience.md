---
title: "Resilient HttpClient calls in .NET with Microsoft.Extensions.Http.Resilience"
description: "Add retries, timeouts and circuit breakers to IHttpClientFactory clients with AddStandardResilienceHandler, what its defaults are, and custom Polly v8 pipelines."
tags: [".NET", "C#", "HttpClient", "Polly", "Resilience"]
pubDate: "2026-07-25T16:00:00.000Z"
imgSrc: "/imgs/2026/dotnet_http_resilience.webp"
imgAlt: "Five nested rings labelled rate limiter, total timeout, retry, circuit breaker and attempt timeout around an HTTP request"
---

Every HTTP call to another service fails sometimes: a pod restarts, a load balancer returns 503, a request hangs. `Microsoft.Extensions.Http.Resilience` adds retries, timeouts and a circuit breaker to `HttpClient` instances created by `IHttpClientFactory`, with one method call and defaults that are reasonable out of the box. It is built on Polly v8 and replaces the older `Microsoft.Extensions.Http.Polly` package and its `AddPolicyHandler` API.

This post covers typed clients, what `AddStandardResilienceHandler` actually configures, how to change its options, and how to build your own pipeline when the standard one doesn't fit. Examples use `Microsoft.Extensions.Http.Resilience` 10.7.0 and `Microsoft.Extensions.Hosting` 10.0.9. The package supports .NET 8 and later, and I ran everything on .NET 9.

## Typed clients in one paragraph

`IHttpClientFactory` manages the handlers behind `HttpClient`. It pools and recycles them, so you avoid both socket exhaustion from creating clients per call and stale DNS from one static client. A **typed client** is a class that takes `HttpClient` in its constructor and wraps the calls to one API:

```csharp
public sealed class RatesClient(HttpClient http)
{
    public Task<Rate?> GetAsync(string currency, CancellationToken ct = default) =>
        http.GetFromJsonAsync<Rate>($"/rates/{currency}", ct);
}
```

You register it with `services.AddHttpClient<RatesClient>(...)`. That call returns an `IHttpClientBuilder`, which is where resilience handlers are added. Every `RatesClient` you get from DI then has the handlers in its pipeline.

## What AddStandardResilienceHandler configures

`AddStandardResilienceHandler()` adds five strategies, nested from outermost to innermost:

1. **Rate limiter**: caps concurrent requests through this client.
2. **Total request timeout**: the time budget for the whole operation, including all retries.
3. **Retry**: retries transient failures with backoff.
4. **Circuit breaker**: stops calling a dependency that is failing a lot.
5. **Attempt timeout**: the time limit for each individual attempt.

Rather than trust my memory of the defaults, I printed them from a fresh `HttpStandardResilienceOptions` in version 10.7.0:

```text
RateLimiter: 1000 permits, queue 0
TotalRequestTimeout: 00:00:30
Retry: 3 retries, Exponential, delay 00:00:02, jitter True, maxDelay , ShouldRetryAfterHeader True
CircuitBreaker: ratio 0.1, min throughput 100, sampling 00:00:30, break 00:00:05
AttemptTimeout: 00:00:10
```

In words:

- At most **1,000 concurrent requests**, with no queue, so the 1,001st is rejected immediately.
- **30 seconds** for the whole call, retries included.
- **3 retries** with exponential backoff starting at **2 seconds**, with jitter. If the response has a `Retry-After` header, that delay is used instead.
- The circuit opens when at least **10% of requests fail**, measured over a **30-second** window that has seen at least **100 requests**. It stays open for **5 seconds**, then lets a trial request through.
- **10 seconds** per attempt.

What counts as a failure, for both retry and the circuit breaker: HTTP 5xx, 408 (Request Timeout) and 429 (Too Many Requests) responses, `HttpRequestException`, and `TimeoutRejectedException` from the attempt timeout. A 404 or 400 is a real answer and is returned as-is.

Order matters. Because the attempt timeout is inside the retry, a hung attempt is cut off after 10 seconds and retried. Because the total timeout is outside, the retries can't run past 30 seconds overall.

## A runnable example

This console app uses a fake `HttpMessageHandler` in place of the network, so you can see the retries without running a flaky server. The fake returns 503 twice and then 200.

```bash
dotnet new console -n RatesDemo
cd RatesDemo
dotnet add package Microsoft.Extensions.Http.Resilience --version 10.7.0
dotnet add package Microsoft.Extensions.Hosting --version 10.0.9
```

```csharp
// Program.cs
using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.CircuitBreaker;

var builder = Host.CreateApplicationBuilder(args);
builder.Logging.ClearProviders();

// Standard handler, tuned. FlakyUpstream stands in for the network: 503, 503, then 200.
builder.Services.AddHttpClient<RatesClient>(client =>
    {
        client.BaseAddress = new Uri("https://rates.example.com");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new FlakyUpstream(succeedEvery: 3))
    .AddStandardResilienceHandler(options =>
    {
        options.Retry.MaxRetryAttempts = 4;
        options.Retry.Delay = TimeSpan.FromMilliseconds(200);
        options.Retry.OnRetry = args =>
        {
            Console.WriteLine($"  retry {args.AttemptNumber + 1} in {args.RetryDelay.TotalMilliseconds:F0} ms " +
                              $"(last status {(int?)args.Outcome.Result?.StatusCode})");
            return default;
        };
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(2);
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
    });

// A custom pipeline for a dependency that is down: retry, then a circuit breaker.
builder.Services.AddHttpClient("inventory", client =>
    {
        client.BaseAddress = new Uri("https://inventory.example.com");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new FlakyUpstream(succeedEvery: int.MaxValue))
    .AddResilienceHandler("inventory-pipeline", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 2,
            Delay = TimeSpan.FromMilliseconds(50),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
        });
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            FailureRatio = 0.5,
            MinimumThroughput = 5,
            SamplingDuration = TimeSpan.FromSeconds(10),
            BreakDuration = TimeSpan.FromSeconds(15),
            OnOpened = args =>
            {
                Console.WriteLine($"  circuit opened for {args.BreakDuration.TotalSeconds} s");
                return default;
            },
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });

using var host = builder.Build();

var rates = host.Services.GetRequiredService<RatesClient>();
Console.WriteLine("GET /rates/cad");
Console.WriteLine($"result: {await rates.GetAsync("cad")}");

var inventory = host.Services.GetRequiredService<IHttpClientFactory>().CreateClient("inventory");
for (var i = 1; i <= 3; i++)
{
    try
    {
        using var response = await inventory.GetAsync("/stock/42");
        Console.WriteLine($"inventory call {i}: {(int)response.StatusCode}");
    }
    catch (BrokenCircuitException)
    {
        Console.WriteLine($"inventory call {i}: circuit is open, failing fast");
    }
}

public record Rate(string Currency, decimal Value);

public sealed class RatesClient(HttpClient http)
{
    public Task<Rate?> GetAsync(string currency, CancellationToken ct = default) =>
        http.GetFromJsonAsync<Rate>($"/rates/{currency}", ct);
}

// Fake network: fails with 503 except on every Nth request.
public sealed class FlakyUpstream(int succeedEvery) : HttpMessageHandler
{
    private int _count;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var n = Interlocked.Increment(ref _count);
        Console.WriteLine($"  upstream {request.RequestUri!.Host}: request #{n}");
        var response = n % succeedEvery == 0
            ? new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new Rate("CAD", 1.37m)) }
            : new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
        return Task.FromResult(response);
    }
}
```

`dotnet run`:

```text
GET /rates/cad
  upstream rates.example.com: request #1
  retry 1 in 223 ms (last status 503)
  upstream rates.example.com: request #2
  retry 2 in 252 ms (last status 503)
  upstream rates.example.com: request #3
result: Rate { Currency = CAD, Value = 1.37 }
  upstream inventory.example.com: request #1
  upstream inventory.example.com: request #2
  upstream inventory.example.com: request #3
inventory call 1: 503
  upstream inventory.example.com: request #4
  upstream inventory.example.com: request #5
  circuit opened for 15 s
inventory call 2: circuit is open, failing fast
inventory call 3: circuit is open, failing fast
```

The rates client recovered on its own: the caller saw one successful call, not two 503s. The delays aren't exactly 200 and 400 ms because jitter randomizes them. That spreads retries from many clients over time, so they don't all hit the recovering service at the same moment.

The inventory client shows the circuit breaker. The first call made three attempts and returned the final 503 to the caller (once retries are used up, you get the last response, not an exception). During the second call, the fifth failure met the breaker's thresholds and it opened. The retry's next attempt hit the open circuit and got a `BrokenCircuitException`, which the retry doesn't handle, so it reached the caller. The third call never touched the network. Failing fast is the point: a dependency that is down doesn't need more traffic, and your threads and connections are better spent elsewhere.

## Customising the standard handler

The lambda passed to `AddStandardResilienceHandler` edits the options, as in the example. You can also bind them from configuration:

```csharp
builder.Services.AddHttpClient<RatesClient>(c => c.BaseAddress = new Uri("https://rates.example.com"))
    .AddStandardResilienceHandler()
    .Configure(builder.Configuration.GetSection("Resilience:Rates"));
```

```json
{
  "Resilience": {
    "Rates": {
      "Retry": { "MaxRetryAttempts": 5 },
      "AttemptTimeout": { "Timeout": "00:00:05" }
    }
  }
}
```

The options are validated when the client is first created, and some combinations are rejected. Setting the total timeout below the attempt timeout fails with:

```text
Microsoft.Extensions.Options.OptionsValidationException: Total request timeout resilience strategy must have a greater timeout than the attempt resilience strategy. Total Request Timeout: 1s, Attempt Timeout: 2s
```

Raising the attempt timeout to 20 seconds without touching the circuit breaker also fails, because the breaker's sampling window must be at least twice the attempt timeout:

```text
Microsoft.Extensions.Options.OptionsValidationException: The sampling duration of circuit breaker strategy needs to be at least double of an attempt timeout strategy’s timeout interval, in order to be effective. Sampling Duration: 30s,Attempt Timeout: 20s
```

When you change one timeout, check the others.

Other options worth knowing:

- **`options.Retry.DisableForUnsafeHttpMethods()`** turns off retries for POST, PATCH, PUT, DELETE and CONNECT. By default the standard handler retries every method. That's unsafe for a non-idempotent POST: if the first attempt reached the server and only the response was lost, a retry creates a second order. Disable it, or send an idempotency key the server deduplicates on.
- **`.SelectPipelineByAuthority()`** gives each host (scheme + host + port) its own circuit breaker state. Without it, one client that talks to several hosts shares one breaker, and one bad host can open the circuit for all of them.
- **`builder.Services.ConfigureHttpClientDefaults(http => http.AddStandardResilienceHandler())`** applies the handler to every client from the factory. .NET Aspire's service defaults project does this.
- **`AddStandardHedgingHandler()`** is an alternative to retries: if an attempt is slow, it sends another one in parallel and takes whichever answers first. It suits reads against replicated services where tail latency matters. Don't put it on calls with side effects.

## Building your own pipeline

`AddResilienceHandler(name, configure)` gives you an empty Polly v8 `ResiliencePipelineBuilder<HttpResponseMessage>`, and you add strategies in order, **outermost first**. The inventory client above adds retry, then circuit breaker, then timeout, which is the same nesting as the standard handler minus the rate limiter and total timeout.

The `Http*StrategyOptions` classes (`HttpRetryStrategyOptions`, `HttpCircuitBreakerStrategyOptions`) come preconfigured with the same idea of "transient" as the standard handler. If you use Polly's base `RetryStrategyOptions<HttpResponseMessage>` instead, you must set `ShouldHandle` yourself, or the retry will only handle exceptions and ignore 503 responses.

To change what counts as transient, override `ShouldHandle`:

```csharp
pipeline.AddRetry(new HttpRetryStrategyOptions
{
    MaxRetryAttempts = 3,
    ShouldHandle = args => ValueTask.FromResult(
        args.Outcome.Exception is HttpRequestException ||
        args.Outcome.Result?.StatusCode is HttpStatusCode.ServiceUnavailable or HttpStatusCode.TooManyRequests),
});
```

Polly v8 also works without `HttpClient`. `new ResiliencePipelineBuilder().AddRetry(...).AddTimeout(...).Build()` gives you a pipeline for database calls or anything else, and `pipeline.ExecuteAsync(...)` runs code through it.

## Gotchas

- **Don't stack handlers by accident.** Adding `AddStandardResilienceHandler` to a client that already gets one from `ConfigureHttpClientDefaults` nests two full pipelines, and the retries multiply: 4 attempts at each level means up to 16 requests.
- **`HttpClient.Timeout` still applies.** It defaults to 100 seconds and wraps the whole handler pipeline. If you set it below the total request timeout, it wins, and you get `TaskCanceledException` instead of the pipeline's timeout behaviour. Either leave it alone or raise it above the pipeline's total.
- **Retries need a replayable request body.** `HttpClient` content like `StringContent` or `JsonContent` can be sent again. A stream you read from once can't.
- **Circuit breaker state is per process.** With ten replicas, each has its own breaker and each has to see its own failures before it opens.
- **The defaults suit service-to-service calls.** For a user-facing request with a 2-second budget, a 30-second total timeout and 2-second base delay are far too long. Set them from what the caller can actually wait.

## Further reading

- [Build resilient HTTP apps](https://learn.microsoft.com/dotnet/core/resilience/http-resilience)
- [Introduction to resilient app development](https://learn.microsoft.com/dotnet/core/resilience/)
- [Polly documentation](https://www.pollydocs.org/)
- [IHttpClientFactory with .NET](https://learn.microsoft.com/dotnet/core/extensions/httpclient-factory)
