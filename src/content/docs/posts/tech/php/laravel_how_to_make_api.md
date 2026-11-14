---
tags: ['php', 'laravel']
title: An IP address lookup API in Laravel
description: A small Laravel JSON API that validates IP addresses, looks them up through an external service with the HTTP client, and caches the results with Eloquent.
pubDate: Fri, 7 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1899250612.png
---

:::caution
The lookup service used below, `iplist.cc`, no longer responds: as of November 2026 the domain shows a parked page. The routing, validation and caching code still applies, but you'll need to swap `lookup()` to another IP information service and adjust the columns to match its response.
:::

This post builds a small JSON API in Laravel with three endpoints:

- `GET /api/ip` returns the public IP of the server running the app (via [jsonip.com](https://jsonip.com)).
- `GET /api/ip/{ip}` returns registry, country and ASN details for an IP address, and stores the result so repeat lookups don't hit the external service.
- `GET /api/ip/info` does the same for the caller's IP address.

The steps below are for Laravel 11 and later, where API routes are opt-in.

## 1. Create the project

```bash
composer create-project laravel/laravel ip-api
cd ip-api
php artisan install:api
php artisan make:model IpAddress -m
php artisan make:controller IpAddressController
```

`install:api` creates `routes/api.php` and installs Sanctum. Routes in that file are stateless and get the `/api` prefix automatically. Laravel's HTTP client is built on Guzzle, which a new project already includes, so there's nothing else to install.

## 2. Migration

Edit the generated migration in `database/migrations/`:

```php
public function up(): void
{
    Schema::create('ip_addresses', function (Blueprint $table) {
        $table->id();
        $table->string('ip')->unique();
        $table->string('registry')->nullable();
        $table->string('countrycode')->nullable();
        $table->string('countryname')->nullable();
        $table->string('asn_code')->nullable();
        $table->string('asn_name')->nullable();
        $table->string('asn_route')->nullable();
        $table->string('asn_start')->nullable();
        $table->string('asn_end')->nullable();
        $table->string('asn_count')->nullable();
        $table->boolean('spam')->default(false);
        $table->boolean('tor')->default(false);
        $table->string('city')->nullable();
        $table->text('detail')->nullable();
        $table->json('website')->nullable();
        $table->timestamps();
    });
}
```

Most columns are nullable because lookup services often leave fields out (no ASN for a private address, no city for many ranges). `website` was an array in the API response, so it's stored as JSON. Then run `php artisan migrate`.

## 3. Model

`app/Models/IpAddress.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IpAddress extends Model
{
    protected $fillable = [
        'ip', 'registry', 'countrycode', 'countryname',
        'asn_code', 'asn_name', 'asn_route', 'asn_start', 'asn_end', 'asn_count',
        'spam', 'tor', 'city', 'detail', 'website',
    ];

    protected function casts(): array
    {
        return [
            'spam' => 'boolean',
            'tor' => 'boolean',
            'website' => 'array',
        ];
    }
}
```

## 4. Routes

`routes/api.php`:

```php
<?php

use App\Http\Controllers\IpAddressController;
use Illuminate\Support\Facades\Route;

Route::prefix('ip')->group(function () {
    Route::get('/', [IpAddressController::class, 'getIpAddress'])->name('GetIpAddress');
    // Must be registered before /{ip}, or "info" is captured as an IP
    Route::get('/info', [IpAddressController::class, 'getIpDetails'])->name('GetCallerIpInfo');
    Route::get('/{ip}', [IpAddressController::class, 'getIp'])->name('GetIp');
});
```

Laravel matches routes in the order they're registered. The earlier version of this post registered `/{ip}` first, so `/ip/info` was treated as a lookup for the "IP address" `info`. It also pointed `/info` at a controller method that didn't exist.

## 5. Validating IP addresses

`FILTER_VALIDATE_IP` isn't a function. It's a filter ID you pass to `filter_var()`, which returns the address if it's valid and `false` if not. Flags narrow what counts as valid:

```php
$ip = '192.168.0.1';

var_dump(filter_var($ip, FILTER_VALIDATE_IP));                          // string(11) "192.168.0.1"
var_dump(filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));        // bool(false)
var_dump(filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE)); // bool(false), private range
```

`FILTER_FLAG_NO_PRIV_RANGE` and `FILTER_FLAG_NO_RES_RANGE` are useful here: private and reserved addresses have no public registry data, so there's no point sending them to a lookup service.

## 6. Controller

`app/Http/Controllers/IpAddressController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\IpAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class IpAddressController extends Controller
{
    // Public IP of the server running this app
    public function getIpAddress(): JsonResponse
    {
        $ip = Http::get('https://jsonip.com')->throw()->json('ip');

        return response()->json(['ip' => $ip]);
    }

    // Details for any public IP, cached in the database
    public function getIp(string $ip): JsonResponse
    {
        $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
        if (filter_var($ip, FILTER_VALIDATE_IP, $flags) === false) {
            return response()->json(['error' => 'Not a public IP address'], 422);
        }

        $ipAddress = IpAddress::firstWhere('ip', $ip) ?? $this->lookup($ip);

        return response()->json($ipAddress);
    }

    // Details for the caller's IP
    public function getIpDetails(Request $request): JsonResponse
    {
        $ip = $request->ip();
        if ($ip === null) {
            return response()->json(['error' => 'Could not determine your IP address'], 400);
        }

        return $this->getIp($ip);
    }

    private function lookup(string $ip): IpAddress
    {
        // throw() turns 4xx/5xx responses into an exception instead of saving garbage
        $data = Http::get("https://iplist.cc/api/{$ip}")->throw()->json();

        return IpAddress::create([
            'ip' => $ip,
            'registry' => data_get($data, 'registry'),
            'countrycode' => data_get($data, 'countrycode'),
            'countryname' => data_get($data, 'countryname'),
            'asn_code' => data_get($data, 'asn.code'),
            'asn_name' => data_get($data, 'asn.name'),
            'asn_route' => data_get($data, 'asn.route'),
            'asn_start' => data_get($data, 'asn.start'),
            'asn_end' => data_get($data, 'asn.end'),
            'asn_count' => data_get($data, 'asn.count'),
            'spam' => data_get($data, 'spam', false),
            'tor' => data_get($data, 'tor', false),
            'city' => data_get($data, 'city'),
            'detail' => data_get($data, 'detail'),
            'website' => data_get($data, 'website'),
        ]);
    }
}
```

Changes from the first version of this post:

- The lookup result is only fetched and saved when the IP isn't already in the table. Before, `getIp` called the external API and inserted a new row on every request.
- `data_get` returns `null` for missing keys instead of raising "Undefined array key" warnings when the service leaves a field out.
- The old code also passed `latitude` and `longitude`, which weren't columns or fillable attributes, so Eloquent silently dropped them.

Run `php artisan serve` and try `http://127.0.0.1:8000/api/ip/8.8.8.8`.

## Behind a proxy

`$request->ip()` returns the address of whoever opened the connection. Behind a load balancer or reverse proxy, that's the proxy. Tell Laravel which proxies to trust in `bootstrap/app.php` with `$middleware->trustProxies(at: [...])`, and it will read `X-Forwarded-For` from those proxies only. Trusting every proxy (`'*'`) lets any client spoof its IP. See [Configuring trusted proxies](https://laravel.com/docs/requests#configuring-trusted-proxies).

## Further reading

- [Laravel HTTP client](https://laravel.com/docs/http-client)
- [Laravel routing](https://laravel.com/docs/routing)
- [PHP validate filters](https://www.php.net/manual/en/filter.constants.php)
