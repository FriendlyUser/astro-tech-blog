---
tags: ['react']
title: React Functional Components
description: How to make react class components
pubDate: Fri, 29 November 2023
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3281011769.png
---
Functional programming is a programming paradigm that treats computation as the evaluation of mathematical functions and avoids changing state and mutable data. In functional programming, functions are first-class citizens and can be assigned to variables, passed as arguments to other functions, and returned as values from functions. The goal of functional programming is to write code that is concise, maintainable, and easy to reason about.


In React, functional components are a way to create reusable UI components using JavaScript functions. These components are simple and easy to read and understand, and they are a great way to create UI elements that do not require complex state management. Here are the steps to creating and managing functional components in React:

1. Import React and any other necessary dependencies:


```tsx
import React from 'react';
```
2. Define the functional component using an ES6 arrow function:


```tsx
const MyComponent = () => {
 return (
 <div>
 <h1>Hello, world!</h1>
 </div>
 );
};
```
3. Export the functional component so that it can be used elsewhere in the application:


```tsx
export default MyComponent;
```
4. Use the functional component in another component or in the main App component:


```tsx
import React from 'react';
import MyComponent from './MyComponent';

const App = () => {
 return (
 <div>
 <MyComponent />
 </div>
 );
};

export default App;
```
Functional components do not have their own state or lifecycle methods, but they can receive props and use them to render dynamic content. They can also use React hooks, such as useState and useEffect, to manage local state and perform side effects.


React hooks are functions that allow functional components to use state and lifecycle methods that were previously only available to class components. React hooks were introduced in React 16.8 as a way to simplify state management and make it easier to reuse stateful logic across components. Here are some of the most commonly used React hooks:

1. useState
useState is a hook that allows functional components to use state. It takes an initial state value as an argument and returns an array with two values: the current state value and a function to update the state. Here is an example:


```tsx
import React, { useState } from 'react';

const Counter = () => {
 const [count, setCount] = useState(0);

 return (
 <div>
 <p>Count: {count}</p>
 <button onClick={() => setCount(count + 1)}>Increment</button>
 </div>
 );
};
```
2. useEffect
useEffect is a hook that allows functional components to perform side effects, such as fetching data from an API or updating the document title. It takes a function as its first argument, which is called after every render. It can also take a second argument, which is an array of dependencies that specify when the effect should be called. Here is an example:


```tsx
import React, { useState, useEffect } from 'react';

const User = ({ userId }) => {
 const [user, setUser] = useState(null);

 useEffect(() => {
 fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
 .then(response => response.json())
 .then(data => setUser(data));
 }, [userId]);

 if (!user) {
 return <p>Loading user...</p>;
 }

 return (
 <div>
 <p>Name: {user.name}</p>
 <p>Email: {user.email}</p>
 </div>
 );
};
```
3. useContext
useContext is a hook that allows functional components to access a context object that was created using React.createContext. It takes a context object as its argument and returns its current value. Here is an example:


```tsx
import React, { useContext } from 'react';

const ThemeContext = React.createContext('light');

const Header = () => {
 const theme = useContext(ThemeContext);

 return (
 <header className={theme}>
 <h1>My App</h1>
 </header>
 );
};

export default Header;
```
React hooks are useful because they simplify state management and allow for more reusable and composable code. They also make it easier to write and test functional components, which are generally simpler and easier to understand than class components.


In React, handling user input and events is done using event handlers, which are functions that are called when an event, such as a button click or a form submission, occurs. Here are the steps to handling user input and events in React:

1. Define a function to handle the event:


```tsx
const handleClick = () => {
 console.log('Button clicked');
};
```
2. Attach the event handler to the appropriate element using the onClick or onSubmit attribute:


```tsx
<button onClick={handleClick}>Click me</button>

<form onSubmit={handleSubmit}>
 <input type="text" value={value} onChange={handleChange} />
 <button type="submit">Submit</button>
</form>
```
3. In the event handler, you can access the event object and its properties, such as target and value:


```tsx
const handleChange = (event) => {
 setValue(event.target.value);
};
```
4. You can also use state to manage the input value and update it in the event handler:


```tsx
const [value, setValue] = useState('');

const handleChange = (event) => {
 setValue(event.target.value);
};
```
5. If you need to pass data from a child component to a parent component, you can use props and callback functions:


```tsx
const ChildComponent = ({ onButtonClick }) => {
 const handleClick = () => {
 onButtonClick('Button clicked');
 };

 return (
 <button onClick={handleClick}>Click me</button>
 );
};

const ParentComponent = () => {
 const handleButtonClick = (message) => {
 console.log(message);
 };

 return (
 <ChildComponent onButtonClick={handleButtonClick} />
 );
};
```
By using event handlers and state, you can create interactive and dynamic user interfaces in React. It's important to remember to avoid directly manipulating the DOM and to always use React's declarative programming model to update the UI.


To implement functional components in TypeScript, you can define the props interface as a generic type parameter and specify the prop types for each property. Here is an example:


```tsx
typescript`import React from 'react';

interface Props {
 name: string;
 age: number;
 email: string;
}

const User: React.FC<Props> = ({ name, age, email }) => {
 return (
 <div>
 <p>Name: {name}</p>
 <p>Age: {age}</p>
 <p>Email: {email}</p>
 </div>
 );
};

export default User;
```
In this example, we define an interface called Props that specifies the type of each prop. We then use the React.FC generic type parameter to define the functional component and specify the Props interface as the type parameter. Inside the component, we destructure the props and use them in the JSX.

You can also specify default props and optional props using the following syntax:


```tsx
typescript`interface Props {
 name: string;
 age?: number;
 email: string;
}

const User: React.FC<Props> = ({ name, age = 18, email }) => {
 // ...
};
```
Here, we define the age prop as optional by adding a question mark after its name, and we provide a default value of 18 in the function signature.

TypeScript can help catch errors at compile-time and provide better documentation for your code, making it a useful tool for building React applications.


Here is an example of an input form using functional components in React:


```tsx
jsx`import React, { useState } from 'react';

const InputForm = () => {
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');

 const handleSubmit = (event) => {
 event.preventDefault();
 console.log(`Name: ${name}, Email: ${email}`);
 };

 return (
 <form onSubmit={handleSubmit}>
 <label>
 Name:
 <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
 </label>
 <label>
 Email:
 <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
 </label>
 <button type="submit">Submit</button>
 </form>
 );
};

export default InputForm;
```
In this example, we define a functional component called InputForm that uses the useState hook to manage the form input values. We define two state variables, `name` and `email`, and initialize them to empty strings using `useState('')`. We also define a handleSubmit function that is called when the form is submitted. This function prevents the default form submission behavior using `event.preventDefault()` and logs the form input values to the console.

In the JSX, we define a `form` element with two input fields and a submit button. We bind the value of each input field to its corresponding state variable using the `value` prop and update the state when the input value changes using the `onChange` event handler. Finally, we attach the `handleSubmit` function to the `onSubmit` event of the form element.

This is a basic example, but you can add validation and more complex logic to handle form input data as needed.


