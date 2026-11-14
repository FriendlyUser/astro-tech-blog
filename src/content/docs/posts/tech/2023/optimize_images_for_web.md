---
tags: ['web', 'html']
title: How to make images load faster on a website
description: Practical ways to cut image weight on a web page, covering format choice, compression, srcset and sizes, lazy loading, layout shift and CDNs.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4252050732.webp
---

Images are usually the heaviest part of a page. Large, unoptimized images slow down the first render, hurt Core Web Vitals such as Largest Contentful Paint (LCP), and waste mobile data. Most of the fix comes down to five things: picking the right format, compressing, serving the right size, loading off-screen images later, and serving from somewhere close to the user.

## Choose the right format

- **JPEG**: lossy compression, good for photos. Supported everywhere.
- **PNG**: lossless, supports transparency. Good for screenshots, logos and flat graphics, but photos come out much larger than JPEG.
- **WebP**: supports both lossy and lossless compression plus transparency, and is usually smaller than JPEG or PNG at similar quality. All current major browsers support it.
- **AVIF**: typically compresses photos better than WebP, at the cost of slower encoding. Also supported in all current major browsers, but older Safari versions lack it.
- **SVG**: for icons, logos and illustrations made of shapes. It's text, scales to any size, and compresses well with gzip or Brotli.

To serve a modern format with a fallback, use `<picture>`. The browser takes the first `<source>` it supports and falls back to the `<img>`:

```html
<picture>
  <source srcset="photo.avif" type="image/avif">
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="Example image" width="1024" height="683">
</picture>
```

## Compress images

Lossy compression throws away detail to shrink the file; the more you compress, the more quality you lose, but at moderate settings the difference is hard to see. Lossless compression keeps every pixel and gives smaller savings.

For one-off images, [Squoosh](https://squoosh.app/), [TinyPNG](https://tinypng.com/) and [ImageOptim](https://imageoptim.com/) (macOS) work well. For a build step, use a library or CLI such as [sharp](https://sharp.pixelplumbing.com/) (Node.js), `cwebp` or `avifenc` so every image gets the same treatment. Most static site generators, Astro included, can do this for you at build time.

## Serve the right size with srcset and sizes

Sending a 2000px-wide image to a 375px-wide phone wastes most of the bytes. `srcset` lists the available widths and `sizes` tells the browser how wide the image will be displayed, so it can pick the smallest file that still looks sharp on that screen (taking pixel density into account):

```html
<img src="example-640.jpg"
     srcset="example-320.jpg 320w,
             example-640.jpg 640w,
             example-1024.jpg 1024w"
     sizes="(max-width: 640px) 100vw, 640px"
     alt="Example image"
     width="640" height="427">
```

Here the image fills the viewport on screens up to 640px wide and is 640px wide otherwise. On a 2x phone that's 375px wide, the browser needs about 750 pixels and picks `example-1024.jpg`; on a 1x desktop it picks `example-640.jpg`.

## Set width and height

Always give `<img>` a `width` and `height` (the intrinsic size is fine, CSS can still resize it). The browser uses them to reserve space before the image loads, which stops the page from jumping around (Cumulative Layout Shift). Pair it with `height: auto` in CSS if you set the width there.

## Lazy-load off-screen images

The native `loading="lazy"` attribute defers loading an image until it's close to the viewport. It's supported by all current major browsers, so a JavaScript library like lazysizes is no longer needed for this:

```html
<img src="example.jpg" alt="Example image" width="640" height="427" loading="lazy">
```

Don't lazy-load the image at the top of the page. If it's the largest element on screen, lazy-loading it delays LCP. For that image, do the opposite and tell the browser it's important:

```html
<img src="hero.jpg" alt="Hero image" width="1200" height="600" fetchpriority="high">
```

## Use a CDN

A content delivery network caches your images on servers close to your users, so they travel a shorter distance and your origin server does less work. Cloudflare, Amazon CloudFront and Akamai are common choices. Setup varies: some sit in front of your whole site via DNS, others give you a separate hostname for static assets.

Image CDNs such as Cloudflare Images, Cloudinary or imgix go further and resize and convert images on request (for example, returning AVIF to browsers that accept it), which saves you from generating every size and format yourself.

## Checking your work

Run [PageSpeed Insights](https://pagespeed.web.dev/) or Lighthouse in Chrome DevTools. The image-related findings and the LCP breakdown point at the specific images that are too large, in the wrong format, or lazy-loaded when they shouldn't be.

## Further reading

- [MDN: Responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [MDN: `<img>` loading attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading)
- [web.dev: Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)
