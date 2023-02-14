---
tags: ['css', 'intersectionobserver', 'react']
title: Implementation animations with css and react-intersection-observer
description: Using the react-intersection-observer library to implement animations with css
pubDate: Fri, 21 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.png
---
CSS animations are used to add dynamic and visually appealing effects to web pages without the need for additional scripting or third-party libraries. They can be used to draw attention to specific elements, create transitions between states, and provide an enhanced user experience. CSS animations are also generally lightweight and have good performance, making them a great option for improving the look and feel of web pages.


The React Intersection Observer library is used to detect when a target element enters or exits the viewport. Here are the basic steps to use it:

1. Install the library by running `npm install react-intersection-observer`.
2. Import the library in your React component by adding the following line at the top of your file:


```jsx
python`import { useInView } from 'react-intersection-observer';
```
3. Use the `useInView` hook to track the visibility of your target element by adding the following line inside your component:


```jsx
scss`const [ref, inView] = useInView();
```
4. Add the `ref` attribute to the target element that you want to track, like this:


```jsx
php`<div ref={ref}>...</div>
```
5. Use the `inView` variable to conditionally render content or apply styles based on whether the element is currently in view, like this:


```jsx
javascript`{inView ? <div>Visible</div> : <div>Not visible</div>}
```

That's the basic usage of the React Intersection Observer library. You can also customize the options for the observer, such as the threshold and whether to detect visibility on the horizontal or vertical axis, by passing an object as the second argument to the `useInView` hook.


To create simple CSS animations using the `react-intersection-observer` library, you can use the `inView` prop that is returned by the `useInView` hook to conditionally apply a CSS class to the element when it comes into view.

Here's an example of a fade-in animation using the `opacity` property:

1. Install the `react-intersection-observer` library by running `npm install react-intersection-observer`.
2. Import the library and a CSS file with your animation styles:


```jsx
jsx`import { useInView } from 'react-intersection-observer';
import './styles.css';
```
3. Use the `useInView` hook to track the visibility of your target element:


```jsx
jsx`function MyComponent() {
 const { ref, inView } = useInView();

 return (
 <div ref={ref} className="fade-in">
 {inView ? <p>Hello world!</p> : null}
 </div>
 );
}
```
4. Add the animation styles to your CSS file:


```jsx
css`.fade-in {
 opacity: 0;
 transition: opacity 1s ease-in-out;
}

.fade-in.is-visible {
 opacity: 1;
}
```
5. Add the `is-visible` class to the element when it comes into view:


```jsx
jsx`function MyComponent() {
 const { ref, inView } = useInView();

 return (
 <div ref={ref} className={`fade-in ${inView ? 'is-visible' : ''}`}>
 {inView ? <p>Hello world!</p> : null}
 </div>
 );
}
```

That's it! The element will fade in smoothly when it enters the viewport. You can adjust the animation duration, timing function, and other properties in the CSS file to customize the effect.


The transition property in CSS is used to create smooth and gradual animations between two states of an element. The transition effect is applied to a CSS property when the value of that property changes.

The syntax for the transition property is as follows:

```css
transition: property duration timing-function delay;
```

The transition property in CSS is used to create smooth and gradual animations between two states of an element. The transition effect is applied to a CSS property when the value of that property changes.

Here's what each value represents:

* property: the CSS property that you want to apply the transition effect to (e.g., opacity,  transform, background-color).
* duration: the length of time over which the transition should occur (e.g., 1s, 300ms).
* timing-function: the rate of change of the transition effect over time (e.g., ease, linear, cubic-bezier(0.1, 0.7, 1.0, 0.1)).
* delay: the length of time to wait before starting the transition effect (e.g., 0s, 500ms).

Here's an example of a CSS transition that changes the opacity property of an element:

```css
.box {
  opacity: 1;
  transition: opacity 1s ease-in-out;
}

.box:hover {
  opacity: 0.5;
}
```

In this example, the opacity property of the .box element is set to 1 initially, and a transition effect is applied to it with a duration of 1s and an easing function of ease-in-out. When the element is hovered over, the opacity property changes to 0.5, and the transition effect smoothly fades the element to the new opacity value over the course of 1 second.
