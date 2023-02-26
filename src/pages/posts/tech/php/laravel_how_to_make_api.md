---
tags: ['php', 'laravel']
title: Laravel api that takes parses ip addresses.
description: Explaining how to use laravel to parse ip addresses.
pubDate: Fri, 7 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1899250612.png
---
Laravel is a free, open-source PHP web application framework that follows the Model-View-Controller (MVC) architectural pattern. It is designed to make building web applications easier and faster, with features such as routing, middleware, blade templating engine, Eloquent ORM, and more. It also provides a command-line interface called Artisan for generating boilerplate code, managing migrations, and running other common tasks.


You'll need to make use of the Laravel framework's features for building a web API, routing, and handling requests. Here's an example implementation:

1. Create a new Laravel project and set up the required dependencies


```bash
composer create-project laravel/laravel ip-api
composer require laravel/sanctum guzzlehttp/guzzle`
```
2. Set up the database


```php
php artisan make:model IpAddress -m`
```
3. Edit the migration file to add columns for the IpAddress table


```php
public function up()
{
 Schema::create('ip\_addresses', function (Blueprint $table) {
 $table->id();
 $table->string('ip');
 $table->string('registry');
 $table->string('countrycode');
 $table->string('countryname');
 $table->string('asn\_code');
 $table->string('asn\_name');
 $table->string('asn\_route');
 $table->string('asn\_start');
 $table->string('asn\_end');
 $table->string('asn\_count');
 $table->boolean('spam');
 $table->boolean('tor');
 $table->string('city');
 $table->text('detail')->nullable();
 $table->text('website')->nullable();
 $table->timestamps();
 });
}
```
4. Edit the IpAddress model to define fillable columns


```
php`protected $fillable = [
 'ip', 'registry', 'countrycode', 'countryname', 'asn\_code',
 'asn\_name', 'asn\_route', 'asn\_start', 'asn\_end', 'asn\_count',
 'spam', 'tor', 'city', 'detail', 'website',
];`
```
5. Set up routes


```php
use App\Http\Controllers\IpAddressController;

Route::get('/', function () {
 return 'Hello World!';
});

Route::group(['prefix' => 'ip'], function () {
 Route::get('/', [IpAddressController::class, 'getIpAddress'])->name('GetIpAddress');
 Route::get('/{ip}', [IpAddressController::class, 'getIp'])->name('GetIp');
 Route::get('/info', [IpAddressController::class, 'getServerIpInfo'])->name('GetServerIpInfo');
});`
```
6. Create a controller to handle requests


`FILTER_VALIDATE_IP` is a built-in PHP function that is used to validate an IP address. It takes two parameters: the IP address to validate, and an optional flag that specifies the IP version to validate (IPv4 or IPv6).

This function returns the validated IP address if it is valid according to the specified IP version, or false if the IP address is not valid.

Here's an example of how to use the FILTER_VALIDATE_IP function to validate an IP address:

```php
$ip = "192.168.0.1";
if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
    echo "Valid IPv4 address";
} else {
    echo "Invalid IP address";
}
```

In this example, the filter_var() function is used to validate the IP address $ip using the FILTER_VALIDATE_IP constant and the FILTER_FLAG_IPV4 flag to specify that the IP address should be validated as an IPv4 address. If the IP address is valid, the script will output "Valid IPv4 address". Otherwise, it will output "Invalid IP address".

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\IpAddress;

class IpAddressController extends Controller
{
    public function getIpAddress()
    {
        $response = Http::get('https://jsonip.com');
        $ip = $response->json()['ip'];

        return response()->json(['ip' => $ip]);
    }

    public function getIp($ip)
    {
        $response = Http::get("https://iplist.cc/api/{$ip}");
        $data = $response->json();

        $ipAddress = new IpAddress([
            'ip' => $data['ip'],
            'registry' => $data['registry'],
            'countrycode' => $data['countrycode'],
            'countryname' => $data['countryname'],
            'asn\_code' => $data['asn']['code'],
            'asn\_name' => $data['asn']['name'],
            'asn\_route' => $data['asn']['route'],
            'asn\_start' => $data['asn']['start'],
            'asn\_end' => $data['asn']['end'],
            'asn\_count' => $data['asn']['count'],
            'spam' => $data['spam'],
            'tor' => $data['tor'],
            'city' => $data['city'],
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude']
        ]);
        $ipAddress->save();

        return response()->json($ipAddress);
    }

    public function getIpDetails(Request $request)
    {
        $ip = $request->ip();

        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            $ipAddress = IpAddress::where('ip', $ip)->first();
            if ($ipAddress) {
                return response()->json($ipAddress);
            } else {
                return $this->getIp($ip);
            }
        } else {
            return response()->json(['error' => 'Invalid IP address']);
        }
    }
}
```

In conclusion, working with IP addresses in PHP is a common task that can be easily accomplished with built-in functions and libraries. By understanding the basics of IP address notation and the tools available in PHP, developers can create robust and secure applications that properly handle IP address inputs.

Some key takeaways from this post include:

IP addresses are numerical identifiers used to identify devices on a network.
There are two main versions of IP addresses: IPv4 and IPv6.
PHP has built-in functions for validating and manipulating IP addresses, including filter_var(), inet_pton(), and inet_ntop().
External APIs can be used to gather additional information about an IP address, such as its geographic location and associated Autonomous System Number (ASN).
When working with IP addresses, it is important to properly validate and sanitize user input to prevent security vulnerabilities.
By applying these concepts to your own PHP applications, you can ensure that your code is robust, secure, and capable of handling IP address inputs in a variety of contexts.