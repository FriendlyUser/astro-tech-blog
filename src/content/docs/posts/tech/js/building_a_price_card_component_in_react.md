---
tags: ['css', 'jsx', 'react']
title: Building a responsive price card component in React
description: How I built a React price card with an image, nightly price, host and total, then made it responsive with a media query and added a hover zoom in CSS.
pubDate: Fri, 4 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/358691897_blank_card_on_brown_table.png
---
A price card is a small, self-contained component that shows up on almost every booking or
pricing page, which makes it a good exercise for practising props and CSS layout. The card I
built has an image on top, the price per day, the host's name, a line of pricing details, and a
total for a 7-day stay.

## The component

```jsx
// PricingCard.jsx
import './PricingCard.css';

const formatPrice = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const PricingCard = ({ image, imageAlt, price, hostName, details, nights = 7 }) => {
  return (
    <div className="pricing-card">
      <div className="image-wrapper">
        <img src={image} alt={imageAlt} />
      </div>
      <div className="content">
        <div className="price">{formatPrice(price)} per day</div>
        <div className="host">
          <strong>Hosted by</strong> {hostName}
        </div>
        <div className="details">{details}</div>
        <div className="total">
          Total: {formatPrice(price * nights)} for {nights} days
        </div>
      </div>
    </div>
  );
};

export default PricingCard;
```

Using it:

```jsx
<PricingCard
  image="/cabin.jpg"
  imageAlt="Log cabin by a lake"
  price={120}
  hostName="Sam"
  details="Free cancellation for 48 hours"
/>
```

A few choices worth explaining:

- `price` is a number, not a preformatted string, so the component can do arithmetic with it.
  `Intl.NumberFormat` handles the currency symbol and decimals; change the locale and currency
  to suit your app.
- The total is `price * nights`, with `nights` defaulting to 7. Adjust the calculation if your
  pricing has cleaning fees, taxes or weekly discounts.
- The image `alt` text is a prop, because a hard-coded `alt="Product"` tells a screen reader user
  nothing about the listing.
- The image sits inside an `image-wrapper` div. The wrapper clips the image when it's scaled up
  on hover (see the CSS below) and gives the media query something to size.
- The text is wrapped in a `content` div so it can be laid out as one column next to the image
  on wider screens.

## The CSS

```css
/* PricingCard.css */
.pricing-card {
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.image-wrapper {
  overflow: hidden;
}

.image-wrapper img {
  display: block;
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

.details {
  font-size: 14px;
}

.total {
  font-size: 16px;
  font-weight: 600;
  margin-top: 16px;
}

@media (min-width: 768px) {
  .pricing-card {
    flex-direction: row;
  }

  .image-wrapper,
  .content {
    width: 50%;
  }

  .image-wrapper img {
    height: 100%;
    object-fit: cover;
  }

  .content {
    text-align: left;
  }

  .price {
    font-size: 32px;
  }

  .host,
  .total {
    font-size: 18px;
  }

  .details {
    font-size: 16px;
  }
}
```

### Making it responsive

On small screens the card is a single column: the image fills the width and the text sits
underneath. The media query kicks in at 768px and switches the flex direction to `row`, so the
image and text sit side by side at half the width each. `object-fit: cover` lets the image fill
the full height of the card without being stretched. The font sizes also step up a little on
larger screens.

### Hover zoom

The `transition` on the image plus `transform: scale(1.05)` on `.image-wrapper:hover img` gives a
small, smooth zoom when the pointer is over the image. Because the wrapper has
`overflow: hidden`, the enlarged image is clipped instead of spilling over the card's edges.
Animating `transform` is cheap for the browser, unlike animating `width` or `height`, which forces
a new layout on every frame.

## Preview

To preview the component, see
https://codesandbox.io/s/price-card-component-sesk3p
