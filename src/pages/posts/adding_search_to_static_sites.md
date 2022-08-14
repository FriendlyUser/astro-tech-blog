---
title: Adding search to static sites with pagefind
description: Searching for content using pagefind, I will cover how I added it to my static site.
alt: my first blog post
tags: ["page-find-ui","astro"]
layout: '@/templates/BasePost.astro'
pubDate: Sunday, 26 July 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/pagefindCorgi.png'
---

In this article I will cover how add pagefind to an astro site. This code is accessible in this github repo for those interested.

For pagefind, you can install it with the following command:

```bash
npm install pagefind
```

Then in your package.json file make sure you generate the search after your static site is built

```json
  {
  "scripts": {
    ...
    "build": "astro build",
    "postbuild": "pagefind --source dist",
  },
  }

```

Then you can run the following command to search for content in your site:

```html
<link href="/_pagefind/pagefind-ui.css" rel="stylesheet" />
<script src="/_pagefind/pagefind-ui.js" type="text/javascript">

</script>
<div id="search" class="ml-3 p-4"></div>
<script>
  window.addEventListener('DOMContentLoaded', (event) => {
    new PagefindUI({ element: '#search' });
  });
</script>
```

As described by the pagefind documentation, you can use the search bar to search for content in your site.

Another thing to keep in mind is that you can choose to not index certain pages.

```html
<body>
  <main>
    Content goes here
  </main>
<div class="bg-slate-900 text-gray-100" data-pagefind-body >
</div>
</body>
```

To index page content, use data-pagefind-body attribute on the page.

```html
<body class="bg-slate-900 text-gray-100" data-pagefind-body >
    <main>
    Content goes here
  </main>
</body>
```

To see this in action, you can look at my personal website repository.

https://github.com/FriendlyUser/astro-tech-blog

### References

* https://pagefind.app/
* https://friendlyuser.github.io