---
title: Thoughts after trying to sell dall-e images on the internet
description: Attempting to sell dall-e images on the internet
alt: Tagging in Astro
pubDate: Sunday, 7 August 2022 13:00:00 GMT
tags: ["astro", "dall-e"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/sellDalleImage.png'
imgAlt: 'Dalle Image for selling images'
---

Long story short, my attempts to make side income through dall-e have failed.

The main image hosting providers shutterstock and 500px did not allow me to sell my images due to watermark, raterization issues and image quality related images.

I do not think I can legally remove the watermark from the images.

However, I realised that I needed to upscale the image and tried many ways to convert the images from png to jpeg.

```python

# convert png to jpg
import os
from PIL import Image
# iterate through all png files in this directory
for file in os.listdir("."):
    if file.endswith(".png"):
        # convert to jpg
        im = Image.open(file)
        im = im.resize((2560,2560), resample=Image.BOX)
        im.convert('RGB').save(file.replace(".png", ".jpg"),"JPEG", quality = 100)
        # remove png
        # os.remove(file)
        print("converted " + file)
    else:
        print("skipped " + file)
```

In general, pillow is fantastic for image manipulation.

Convert images to jpeg, with the highest quality available and big enough to meet the minimum image size requirements for image uploads.

Once the images are converted, I can upload them to the image hosting providers for review, but they are commonly rejected.

Overall, I'll continue to generate dall-e images at least for my blog and/or personal usage while adding them to pexels.

```typescript

const pixelApiKey = '<GET PEXEL API KEY>'';
const myCollectionsResp = await fetch('https://api.pexels.com/v1/collections', {
  headers: {
    Authorization: pixelApiKey,
  },
});

const myCollection = await myCollectionsResp.json();

const dallECollectionId = myCollection?.collections[0]?.id;

// fetch dalle collection from pexels api
const dallECollectionResp = await fetch(
  `https://api.pexels.com/v1/collections/${dallECollectionId}?per_page=80`,
  {
    headers: {
      Authorization: pixelApiKey,
    },
  }
);

const dallECollection = await dallECollectionResp.json();

const dallEImages = dallECollection?.media?.map((photo) => {
  return {
    src: photo.src.original,
    alt: photo.photographer,
  };
});
```

The above script downloads image from pexels
### References

* [Converting PNG to JPEG](https://stackoverflow.com/questions/9296024/converting-png-to-jpeg)
* [Pillow - Image Manipulation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html)
* [Pillow - Image Resizing](https://pillow.readthedocs.io/en/stable/handbook/concepts.html#concept-resizing)