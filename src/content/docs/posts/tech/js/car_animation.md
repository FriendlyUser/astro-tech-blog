---
tags: ['javascript', 'css', 'react']
title: How to create an infinite animation for a car.
description: Using basic css and html to animate a car in react.
pubDate: Fri, 30 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3054188082.png
---
Animations are important in web development for several reasons:

1. Improve user experience: Animations can make a website feel more engaging and interactive, which can lead to a better overall user experience. When used properly, animations can help users navigate the website more easily and understand the information presented.
2. Grab user attention: Animations can be used to draw attention to important elements of the website, such as calls to action, alerts, or notifications. This can help ensure that users don't miss important information or actions they need to take.
3. Communicate information: Animations can be used to convey complex information in a more digestible format. For example, animations can be used to show how a particular feature works, or to demonstrate the steps involved in a process.
4. Enhance branding: Animations can help enhance a website's branding by adding a unique visual style that sets it apart from other websites. Animations can be used to convey a brand's personality and values, and create a more memorable user experience.
5. Create a sense of flow: Animations can help create a sense of flow and continuity between different sections of a website. For example, animations can be used to smoothly transition between pages or sections, creating a more seamless user experience.


Animating a car on a road can make your website or application more visually appealing and engaging. In this tutorial, we'll walk you through the process of creating a car animation in React using CSS.

```jsx 
import "./styles.css";

export default function App() {
  return (
    <div xs="12" md="6" data-testid="carOnRoad">
      <div className="carWrapper">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/3/38/Red_Car_Closed_Window_Cartoon_Vector.svg"
          alt="car"
          className="car"
          data-testid="bookingStatusCar"
        />
      </div>
      <div className="bookingCar">
        <div
          className="infinite"
          style={{
            width: "500px"
          }}
          data-testid="bookingStatusRoad"
        >
          <div className="shadow" />
        </div>
      </div>
    </div>
  );
}
```

The code above is a React functional component that renders an animation of a car on a road.

The component returns a div with a few child divs that are styled using CSS. The first child div has the class 'carWrapper' and contains an image of a car with the class 'car'. The 'carWrapper' class is used to apply CSS animations to the car image to make it move across the screen.

The second child div has the class 'bookingCar' and is used to represent the road. It has a div inside it with the class 'infinite', which has a fixed width of 500px and is used to add a shadow effect to the road. The shadow effect is created using the CSS box-shadow property.

```css 
 .bookingCar {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    background-color: white;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
    position: relative;
}
.infinite {
    position: relative;
    min-width: 200px;
    height: 64px;
    background: gray;
    transform-origin: bottom;
    transform-style: preserve-3d;
}
.infinite:before {
    content: "";
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 0;
    width: 100%;
    height: 10px;
    background: linear-gradient(90deg, #fff 0%, #fff 50%, gray 50%, gray 100%);
    background-size: 60px;
    animation: animate 2s linear infinite;
}
@keyframes animate {
    0% {
        background-position: 0px;
    }
    100% {
        background-position: -60px;
    }
}
.carWrapper {
    position: absolute;
}
.car {
    position: relative;
    transform-style: preserve-3d;
    transition: 5s ease-in-out;
    z-index: 20;
    height: 30px;
}
 
 ```

This CSS code defines styles for a booking car element that includes an animated infinite strip and a car image. The infinite strip is defined by the `.infinite` class and includes a gradient background that transitions from white to gray. The `before` pseudo-element is used to create the strip and the `animate` keyframes define the animation that causes the strip to move horizontally from right to left.

The car element is defined by the `.car` class and includes a 3D transform that creates a sense of depth, as well as a transition effect that causes the car to move smoothly when animated. The `z-index` property is used to position the car above other elements on the page.

Overall, the animations in this code help to create a more engaging and visually appealing user experience for the booking car element, which can help to increase user engagement and satisfaction.


<iframe src="https://codesandbox.io/embed/elated-haibt-3e8pph?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" title="elated-haibt-3e8pph" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts" ></iframe>


Animations are important in web development for several reasons:

1. Improve user experience: Animations can make a website feel more engaging and interactive, which can lead to a better overall user experience. When used properly, animations can help users navigate the website more easily and understand the information presented.
2. Grab user attention: Animations can be used to draw attention to important elements of the website, such as calls to action, alerts, or notifications. This can help ensure that users don't miss important information or actions they need to take.
3. Communicate information: Animations can be used to convey complex information in a more digestible format. For example, animations can be used to show how a particular feature works, or to demonstrate the steps involved in a process.
4. Enhance branding: Animations can help enhance a website's branding by adding a unique visual style that sets it apart from other websites. Animations can be used to convey a brand's personality and values, and create a more memorable user experience.
5. Create a sense of flow: Animations can help create a sense of flow and continuity between different sections of a website. For example, animations can be used to smoothly transition between pages or sections, creating a more seamless user experience.
