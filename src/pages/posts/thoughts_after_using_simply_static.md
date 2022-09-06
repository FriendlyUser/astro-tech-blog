---
title: What I learned about using the simply static wordpress plugin
description: What I learned about using the simply static wordpress plugin
alt: Simply static wordpress plugin
tags: ["wordpress", "simply static"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-07-16 19.02.16 - corgi riding a skateboard through the rain, digital art.png'
pubDate: Mon, 11 Dec 2020 13:00:00 GMT
---

# Summary

Although simply static has not been recently used, it still is an excellent package for converting a wordpress site to a static website.

The installation of simply static was fairly straightforward and the UI is intuitive, I would prefer to have a cli interface, but its not a deal breaker. I would prefer to build the project inside a CI/CD pipeline. 

One disadvantage of simply static settings, is it does not take glob arguments, this could be because I was using `php7.3` which has some minor bugs with simply static, but gets the job done. With simply static deploy, you can easily deploy your generated simply static site to s3. This requires you to have an updated configuration in `wp-config.php`. I attempted to use environment variables in `wp-config.php`, but that did not work so well, so I hardcoded it and in my CI/CD pipeline, I replaced the contents of the values in my pipeline.

Overall, simply static deploy with simply static is an excellent way to quickly deploy static sites with wordpress. Even with a pagebuilder - elementor pro, it works quite well. Again I had to include a number of hardcoded paths and assets, but outside of that, it works fine.

Below is a simple python script to preview the existing urls after exporting the site pages to xml.

This can also be adapted to replace the url paths.

```python
import xml.etree.ElementTree as ET
import re
root = ET.parse('site.WordPress.2020-12-07.xml')

s3_base_url = 'https://site-wp.s3-us-west-2.amazonaws.com'
# Removing index.php - can be done from wordpress settings
# for page in root.findall("./channel/item"):
#   link = page.find('link').text
#   new_link = re.sub(r'index.php/', '', link, flags=re.MULTILINE)
#   print(new_link)

for page in root.findall("./channel/item"):
  link = page.find('link').text + 'index.html'
  # print(link)
  s3_link = link.replace('http://11.217.301.18', s3_base_url)
  s3_link = re.sub(r'wordpress/index.php', 'index.php', s3_link, flags=re.MULTILINE)
  print(s3_link)
```
