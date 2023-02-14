---
tags: ['css', 'jsx', 'react']
title: How I implemented a price card component in react
description: Building a price card component in react is a great way to learn how to use css
pubDate: Fri, 4 April 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/358691897_blank_card_on_brown_table.png
---
Building price card components is important because they allow businesses to present pricing information to their customers in a clear and organized manner, which can improve the customer experience and ultimately lead to increased sales. Price cards can also help businesses to highlight the features and benefits of their products or services, differentiate themselves from competitors, and create a sense of transparency and trust with customers. Additionally, price card components can be used to test and optimize pricing strategies, allowing businesses to find the sweet spot between profitability and customer demand.


Here is an example of a React component for a pricing card with an image on top, below the image the price per day, the host in bold with the host name, and a line below for pricing details:


```jsx
import React from 'react';

const PricingCard = ({image, price, host, hostName, details}) => {
 return (
 <div className="pricing-card">
 <img src={image} alt="Product" />
 <div className="price">{price} per day</div>
 <div className="host">
 <span className="bold">{host}</span> {hostName}
 </div>
 <div className="details">{details}</div>
 </div>
 );
};

export default PricingCard;
```
This component accepts props for the image source, price per day, host name, and pricing details. The `host` prop is passed as a string and is displayed in bold using the `span` element with the `bold` class. The other props are displayed as regular text. Styling for the component can be added to a CSS file or within the component itself using inline styles.


To make the `PricingCard` component responsive, you can use CSS media queries to adjust the layout and sizing of the component for different screen sizes. Here's an example of how you could modify the component to be responsive:


```jsx
import React from 'react';
import './PricingCard.css';

const PricingCard = ({image, price, host, hostName, details}) => {
 return (
 <div className="pricing-card">
 <img src={image} alt="Product" />
 <div className="content">
 <div className="price">{price} per day</div>
 <div className="host">
 <span className="bold">{host}</span> {hostName}
 </div>
 <div className="details">{details}</div>
 </div>
 </div>
 );
};

export default PricingCard;
```
In this example, we've added a new `div` with a class of `content` that wraps the pricing information below the image. We'll use this wrapper to adjust the layout and sizing of the pricing information based on screen size.

Here's an example of some CSS that could be used to make the `PricingCard` component responsive:


```css
.pricing-card {
 display: flex;
 flex-direction: column;
 align-items: center;
 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 border-radius: 8px;
 overflow: hidden;
}

.pricing-card img {
 width: 100%;
 height: auto;
}

.content {
 padding: 16px;
 text-align: center;
}

.price {
 font-size: 24px;
 margin: 16px 0;
}

.host {
 font-size: 16px;
 margin-bottom: 16px;
}

.bold {
 font-weight: 600;
}

.details {
 font-size: 14px;
}

@media only screen and (min-width: 768px) {
 .pricing-card {
 flex-direction: row;
 align-items: stretch;
 }

 .pricing-card img {
 width: 50%;
 height: auto;
 }

 .content {
 width: 50%;
 text-align: left;
 }

 .price {
 font-size: 32px;
 }

 .host {
 font-size: 18px;
 }

 .details {
 font-size: 16px;
 }
}
```
In this CSS, we've added a media query that targets screens with a minimum width of 768 pixels. Within this media query, we've adjusted the layout and sizing of the component to display the image and pricing information side-by-side. We've also increased the font sizes for the pricing information to make it more readable on larger screens.


To make the image in the `PricingCard` component look nice on hover, you can add a CSS transition effect to the image and use a hover selector to apply a transform or filter effect. Here's an example of how you could modify the component to add a simple zoom effect when hovering over the image:


```javascript
import React from 'react';
import './PricingCard.css';

const PricingCard = ({image, price, host, hostName, details}) => {
 return (
 <div className="pricing-card">
 <div className="image-wrapper">
 <img src={image} alt="Product" />
 </div>
 <div className="content">
 <div className="price">{price} per day</div>
 <div className="host">
 <span className="bold">{host}</span> {hostName}
 </div>
 <div className="details">{details}</div>
 </div>
 </div>
 );
};

export default PricingCard;
```
In this example, we've added a new `div` with a class of `image-wrapper` that wraps the `img` element. We'll use this wrapper to apply the hover effect to the image.

Here's an example of some CSS that could be used to add a zoom effect when hovering over the image:


```css
.pricing-card {
 display: flex;
 flex-direction: column;
 align-items: center;
 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 border-radius: 8px;
 overflow: hidden;
}

.image-wrapper {
 overflow: hidden;
}

.image-wrapper img {
 width: 100%;
 height: auto;
 transition: transform 0.2s ease-out;
}

.image-wrapper:hover img {
 transform: scale(1.05);
}

.content {
 padding: 16px;
 text-align: center;
}

.price {
 font-size: 24px;
 margin: 16px 0;
}

.host {
 font-size: 16px;
 margin-bottom: 16px;
}

.bold {
 font-weight: 600;
}

.details {
 font-size: 14px;
}
```
In this CSS, we've added a `transition` property to the `img` element to create a smooth transition effect. We've also added a `hover` selector to the `.image-wrapper` class, which applies a `scale` transform to the `img` element when hovering over the image. This creates a simple zoom effect that makes the image stand out when the user hovers over it.


To add a line for the total price in the `PricingCard` component, you can simply add a new `div` element after the `details` section, and give it a class like `total`:


```jsx
import React from 'react';
import './PricingCard.css';

const PricingCard = ({image, price, host, hostName, details}) => {
 return (
 <div className="pricing-card">
 <div className="image-wrapper">
 <img src={image} alt="Product" />
 </div>
 <div className="content">
 <div className="price">{price} per day</div>
 <div className="host">
 <span className="bold">{host}</span> {hostName}
 </div>
 <div className="details">{details}</div>
 <div className="total">Total: ${price / 7} for 7 days</div>
 </div>
 </div>
 );
};

export default PricingCard;
```
In this example, we've added a new `div` element with a class of `total`, and used a simple expression `{price * 7}` to calculate the total price for 7 days. You can adjust this calculation as needed to reflect the actual pricing rules of your application.


To preview the component, see
https://codesandbox.io/s/price-card-component-sesk3p