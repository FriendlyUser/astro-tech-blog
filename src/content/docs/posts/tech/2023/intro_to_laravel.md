---
tags: ['laravel', 'php']
title: What Laravel is and how to start a project with it
description: A short introduction to Laravel, the PHP web framework, covering what it includes, how to create a new app, and how routes work.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.webp
---

Laravel is a free, open-source web framework for PHP, created by Taylor Otwell in 2011. It follows the Model-View-Controller (MVC) pattern and bundles most of what a typical web app needs: routing, an ORM (Eloquent), database migrations, the Blade templating language, validation, queues, caching and a command-line tool called Artisan. If you're writing a server-rendered site or a JSON API in PHP, it saves you from wiring those pieces together yourself.

PHP itself is a server-side language that runs on almost every shared host, which is a large part of why it's still widely used. WordPress, Drupal and Joomla are all written in PHP.

## Versions

Laravel ships one major release a year. At the time of this update the current release is Laravel 13 (released March 17, 2026), which requires PHP 8.3 or newer. Each major version gets 18 months of bug fixes and two years of security fixes, so check the [support policy](https://laravel.com/docs/releases#support-policy) before starting on an older version.

## Creating a project

You need PHP, [Composer](https://getcomposer.org) (PHP's package manager) and Node.js or Bun for the frontend assets. Install the Laravel installer through Composer, then create an app:

```bash
composer global require laravel/installer
laravel new example-app
```

The installer asks which testing framework, database and starter kit you want. New apps default to SQLite, and the installer creates the database file and runs the initial migrations for you.

Start the dev server, queue worker and Vite together with the `dev` Composer script:

```bash
cd example-app
npm install && npm run build
composer run dev
```

The app is then served at `http://localhost:8000`.

## Routes

Routes for browser-facing pages live in `routes/web.php`. A route maps a URL to a closure or a controller method:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::get('/greeting', function () {
    return 'Hello World';
});

Route::get('/users/{id}', function (string $id) {
    return ['id' => $id];
});
```

Returning a string sends it as the response body. Returning an array makes Laravel encode it as JSON, which is handy for small API endpoints. As an app grows you'd move this logic into controllers (`php artisan make:controller UserController`) and query the database through Eloquent models instead of returning hard-coded values.

## What people build with it

Laravel is a general-purpose web framework, so the answer is "most things a web backend does": CRUD apps and admin panels, REST or JSON:API backends for a single-page or mobile app, e-commerce sites, and custom CMSs. The official starter kits add login, registration and password reset so you don't have to build authentication from scratch.

It's a less natural fit if you don't want a PHP runtime on the server, or if you only need a few endpoints and a micro-framework would do.

## Further reading

- [Laravel installation docs](https://laravel.com/docs/installation)
- [Routing](https://laravel.com/docs/routing)
- [Eloquent ORM](https://laravel.com/docs/eloquent)
- [Starter kits](https://laravel.com/docs/starter-kits)
