---
title: Custom image component in react
description: Created a custom image component with a loading spinner and fallback image
alt: my first blog post
tags: ["react","js"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 April 2024 13:00:00 GMT
imgSrc: '/imgs/2023/342028959_blank_card_on_brown_table.png'
---


he HTML `<img>` tag is used to embed an image in a web page. It allows you to display an image that is hosted on a server or included in the webpage's source code. The `<img>` tag has two required attributes:

* src: This specifies the URL or path to the image that you want to display.
* alt: This provides alternative text for the image, which is displayed if the image cannot be 
loaded or if the user is using a screen reader.

Here's an example of how to use the `<img>` tag to display an image:

```html
<img src="image.jpg" alt="A beautiful sunset over the ocean">
```


In this example, the src attribute points to an image file called image.jpg, and the alt attribute provides a description of the image for users who cannot see it.

The `<img>` tag also supports several optional attributes that can be used to modify the image's appearance and behavior, such as width, height, title, and loading.

Overall, the `<img>` tag is a simple and widely used element that makes it easy to add images to your web pages.  

A fallback image is a backup image that is displayed in the event that the primary image fails to load. This can happen for various reasons, such as slow internet connection or incorrect file path. The fallback image is usually a simpler version of the primary image and is designed to provide a reasonable substitute for the missing image.

To specify a fallback image in HTML, you can use the "onerror" attribute of the "img" tag. Here's an example:

```html
<img src="primary-image.jpg" onerror="this.src='fallback-image.jpg';">
```

In this example, if the "primary-image.jpg" fails to load, the "onerror" attribute triggers and sets the "src" attribute to "fallback-image.jpg". This will display the fallback image instead of the missing primary image.

It's a good practice to use fallback images, as they can improve the user experience by ensuring that something is displayed even if the primary image is unavailable.


```js
import React from 'react';

function MyImageComponent() {
  return (
    <img src="primary-image.jpg" onError={(e) => {
      e.target.src = 'fallback-image.jpg';
    }} />
  );
}
```

In this example, the MyImageComponent renders an img tag with a src attribute set to the primary image source. If the primary image fails to load, the onError event handler will trigger and set the src attribute to the fallback image source.

Note that we're using an arrow function as the event handler for the onError event. The event object is passed as an argument to the function, and we're using the target property of the event object to access the img tag and set its src attribute to the fallback image source.

This is just one example of how to implement a fallback image in React. The specific implementation may vary depending on your needs and the structure of your application.

In addition to the src and onError properties, there are several other properties that you can use with the img tag in React. Here are some common ones:

* alt: The alternative text that is displayed if the image fails to load or if the user is using a screen reader. It's also used for SEO purposes.
width and height: The dimensions of the image. You can specify these as numbers or strings, such as "100px".
* loading: The lazy-loading behavior of the image. This can be set to "lazy" to defer loading the image until it's in the user's viewport, or "eager" to load it immediately.
* style: An object containing CSS styles to apply to the image element. For example, you can set the borderRadius property to round the corners of the image.

Here's an example that uses some of these properties:

```js
import React from 'react';

function MyImageComponent() {
  return (
    <img
      src="primary-image.jpg"
      onError={(e) => {
        e.target.src = 'fallback-image.jpg';
      }}
      alt="A beautiful landscape"
      width="400"
      height="300"
      loading="lazy"
      style={{ borderRadius: '10px' }}
    />
  );
}
```

In this example, we're setting the alt text, dimensions, lazy-loading behavior, and border radius of the image using the corresponding properties.

These are just a few examples of the properties that you can use with the img tag in React. There are many others, so it's worth consulting the React documentation or the HTML specification if you need to use a specific property.

An example of a React component that wraps an img tag with a skeleton loader and a fallback image:

```js
import React, { useState } from 'react';

function ImageWithFallbackAndLoader(props) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <>
      {isLoading && (
        <div className="skeleton-loader">
          {/* Placeholder content while image is loading */}
        </div>
      )}
      {!hasError ? (
        <img
          src={props.src}
          alt={props.alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <img src={props.fallbackSrc} alt={props.alt} />
      )}
    </>
  );
}
```

In this example, we define a function component called ImageWithFallbackAndLoader that takes two props: src (the primary image source) and fallbackSrc (the fallback image source). We also pass down the alt attribute from the parent component.

The component uses React's useState hook to manage the loading and error states of the image. Initially, isLoading is set to true, and hasError is set to false.

When the img tag successfully loads the image, the onLoad event handler is called, which sets isLoading to false. If there's an error loading the image, the onError event handler is called, which sets both isLoading and hasError to false and true, respectively.

In the return statement, we use conditional rendering to display either a skeleton loader or the img tag. If isLoading is true, we show the placeholder content while the image is loading. If hasError is false, we show the img tag with the src and alt attributes set to the primary image source and the event handlers set to handleImageLoad and handleImageError, respectively.

If hasError is true, we show the img tag with the src attribute set to the fallback image source and the alt attribute set to the alt prop passed down from the parent component.

This is just one example of how to create a wrapper component for an img tag with a skeleton loader and fallback image. You can customize this component to fit your specific needs and styling.

Defining the .skeleton-loader class in CSS:

```css
.skeleton-loader {
  display: inline-block;
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  background-color: #e3e3e3;
  animation: skeleton-loading 1s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
```

In this example, we define the .skeleton-loader class with the following properties:

* display: inline-block: This ensures that the skeleton loader takes up only the space that it needs, and doesn't push other elements out of the way.
position: relative: This allows us to position child elements (such as the placeholder content) inside the skeleton loader using absolute positioning.
* width: 100%: This ensures that the skeleton loader is as wide as its parent element.
* padding-bottom: 100%: This sets the height of the skeleton loader to be the same as its width, creating a square aspect ratio. You can adjust this value if you want the skeleton loader to have a different aspect ratio.
* background-color: #e3e3e3: This sets the background color of the skeleton loader to a light gray color. You can change this to any color you want.
* animation: skeleton-loading 1s ease-in-out infinite: This applies an animation to the skeleton loader using the skeleton-loading keyframe animation. The animation lasts for 1 second, uses an ease-in-out timing function, and repeats infinitely.

The @keyframes rule defines the skeleton-loading animation with two keyframes: one at 0% and one at 100%. The animation uses the translateX transform function to move the element horizontally from -100% to 100% of its width, creating a sliding animation effect.

You can adjust these properties to fit your specific design needs. This is just one example of how to define a skeleton loader in CSS.