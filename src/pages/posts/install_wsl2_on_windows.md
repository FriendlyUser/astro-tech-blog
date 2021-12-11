---
title: Details to install wsl2 on windows without using the windows store
description: A summary of lessons learned from installing wsl2 with a broken windows store app.
alt: dockerhub tags to github package registry
tags: ["wsl2", "windows store"]
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'
---

# Summary

Windows is finally becoming a good alternative to mac osx for developers. With its built in linux support via wsl2, I decided to
purchase a somewhat powerful windows machine for coding and gaming.

My initial setup involved following the instructions provided by microsoft. At this time of writing, there was no easy command and I had to follow instructions.

The end result was wsl setup successfully, but nothing was working. Make sure wsl is set to v2.

```bash
wsl --help
```

After realising I couldn't download the linux distro through the store and I decided to download the package manually.

After installing debian manually which results in the file being saved to an appx file.

Unzipping the appx file, open if and run the `*.exe` file. In my case I had to open the `debian.exe` file.

Afterwards, a black window will open and prompt you to fill out details for your linux distro.

Hopefully this article was useful.


## References
* https://docs.microsoft.com/en-us/windows/wsl/install-win10
* https://docs.microsoft.com/en-us/windows/wsl/install-manual