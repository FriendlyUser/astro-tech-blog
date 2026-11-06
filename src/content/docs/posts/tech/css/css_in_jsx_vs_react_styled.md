---
tags: ['css', 'jsx', 'react', 'styled']
title: Css in js vs plain css and styled components
description: Comparing css in js to plain css and styled components
pubDate: Fri, 28 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1098832555.png
---
JSX (JavaScript XML) is an extension to JavaScript syntax that allows developers to write HTML-like code in JavaScript. It is commonly used in React to define the structure and layout of user interfaces. When JSX is compiled, it is transformed into regular JavaScript function calls that create React elements.

CSS-in-JS is a technique for styling web applications by generating and injecting CSS at runtime using JavaScript. Some advantages of using CSS-in-JS are:

1. Scoped styles: CSS-in-JS generates unique class names for each component, ensuring that styles are only applied to the intended elements and reducing the risk of style collisions.
2. Dynamic styles: CSS-in-JS allows developers to write dynamic styles using JavaScript, making it easier to create responsive designs and dynamic user interfaces.
3. Better code organization: CSS-in-JS allows developers to write styles in the same file as the corresponding component, making it easier to manage styles and component logic together.
4. Type safety: CSS-in-JS libraries like styled-components and emotion use TypeScript to provide type safety for CSS styles, ensuring that styles are properly defined and that there are no syntax errors.
5. Server-side rendering: CSS-in-JS libraries like styled-components and emotion support server-side rendering, allowing styles to be generated on the server and included in the initial page load.

While there are many advantages to using CSS-in-JS, there are also some potential disadvantages, including:

1. Increased complexity: CSS-in-JS requires developers to write and maintain JavaScript code in addition to CSS, which can increase the overall complexity of the codebase.
2. Tooling dependencies: CSS-in-JS libraries may require additional tooling and build steps, which can add to the complexity of the development environment.
3. Learning curve: Developers who are not familiar with JavaScript may find it more difficult to learn and use CSS-in-JS.
4. Performance overhead: Generating and injecting CSS at runtime can add some overhead to the application's performance, especially on mobile devices or slower networks.
5. Limited browser support: Some CSS-in-JS libraries may not be fully supported by older browsers or may require additional polyfills to work correctly.

Here are a few examples of using styled-components to create styled React components:

1. Basic example of a styled button:


```jsx
import styled from 'styled-components';

const Button = styled.button
 background-color: #0077cc;
 color: #fff;
 font-size: 16px;
 padding: 10px 20px;
 border-radius: 4px;
;

function App() {
 return <Button>Click me!</Button>;
}
```
2. Example of a styled input component with a hover effect:


```jsx
import styled from 'styled-components';

const Input = styled.input
 border: 1px solid #ddd;
 padding: 10px;
 border-radius: 4px;
 
 &:hover {
 border-color: #0077cc;
 }
;

function App() {
 return <Input placeholder="Enter your name" />;
}
```
3. Example of a styled card component with a shadow effect:


```jsx
import styled from 'styled-components';

const Card = styled.div
 background-color: #fff;
 border-radius: 4px;
 box-shadow: 0 2px 4px rgba(0,0,0,0.1);
 padding: 20px;
;

function App() {
 return <Card>
 <h2>My Card</h2>
 <p>This is some card content</p>
 </Card>;
}
```
In each example, the styled-components library is used to define a custom styled component using a tagged template literal syntax. The styles are defined in a template string and can include any valid CSS properties.


"Styled Components" is a popular CSS-in-JS library for styling React components. "CSS-in-JS" is a broader category that includes other libraries and techniques for generating and injecting CSS at runtime using JavaScript.

Here are some differences between styled components and CSS-in-JS:

1. Syntax: Styled Components uses a tagged template literal syntax to define styles for individual components, while other CSS-in-JS libraries may use different syntaxes.
2. Scalability: Styled Components can scale well in large projects due to its modular approach to styling and componentization. Other CSS-in-JS libraries may not offer the same level of flexibility and scalability.
3. Performance: Styled Components can offer good performance by optimizing the CSS generated and injected for each component. However, it is worth noting that CSS-in-JS can add some overhead to the application's performance, especially on mobile devices or slower networks.
4. Server-side rendering: Styled Components provides server-side rendering out of the box, while other CSS-in-JS libraries may require additional setup or configuration.
5. Developer experience: Styled Components has gained popularity in part because of its developer experience, which makes it easy to create custom, reusable components with minimal CSS code. Other CSS-in-JS libraries may have different learning curves or require more complex setup.

Ultimately, the choice of CSS-in-JS library will depend on the specific needs of a project and the preferences of the development team.


