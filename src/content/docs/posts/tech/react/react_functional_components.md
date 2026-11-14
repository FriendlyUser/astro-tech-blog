---
tags: ['react', 'typescript']
title: "React function components: props, hooks, events and TypeScript"
description: Write React function components, manage state and effects with hooks, handle events and forms, and type props in TypeScript.
pubDate: Fri, 29 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/react-functional-components.webp"
---

A function component is a JavaScript function that takes props and returns JSX. Since hooks arrived in React 16.8, function components can hold state and run side effects, so they are the default way to write React today. Class components still work, but the [React docs](https://react.dev/learn) teach function components only.

## A minimal component

```tsx
// MyComponent.tsx
export default function MyComponent() {
  return (
    <div>
      <h1>Hello, world!</h1>
    </div>
  );
}
```

```tsx
// App.tsx
import MyComponent from './MyComponent';

export default function App() {
  return <MyComponent />;
}
```

With the JSX transform introduced in React 17 (used by Vite, Next.js and other current toolchains), you don't need `import React from 'react'` just to use JSX. Import only the hooks and types you use. An arrow function (`const MyComponent = () => { ... }`) works the same way; pick one style and stay consistent.

## State with `useState`

`useState` takes an initial value and returns the current value plus a setter. Calling the setter schedules a re-render.

```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

Use the updater form (`setCount(c => c + 1)`) when the new value depends on the old one. It avoids stale values when several updates are batched together.

## Side effects with `useEffect`

`useEffect` runs after React commits a render. The dependency array controls when it re-runs: here, whenever `userId` changes. Return a cleanup function so a slow response for an old `userId` doesn't overwrite the current one.

```tsx
import { useEffect, useState } from 'react';

type User = { name: string; email: string };

export function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then((response) => response.json())
      .then((data: User) => {
        if (!ignore) setUser(data);
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (!user) return <p>Loading user...</p>;

  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

For real data fetching, a framework loader or a library such as TanStack Query handles caching and race conditions for you. The pattern above is what those tools do under the hood.

## Shared values with `useContext`

`useContext` reads the nearest value provided for a context. Without a provider above it, the component gets the default passed to `createContext`.

```tsx
import { createContext, useContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function Header() {
  const theme = useContext(ThemeContext);
  return (
    <header className={theme}>
      <h1>My App</h1>
    </header>
  );
}

export default function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Header />
    </ThemeContext.Provider>
  );
}
```

In React 19 you can also write `<ThemeContext value="dark">` without `.Provider`.

## Events and passing data up

Event handlers are functions passed to props such as `onClick`, `onChange` and `onSubmit`. To send data from a child to its parent, pass a callback as a prop:

```tsx
function ChildComponent({ onButtonClick }: { onButtonClick: (message: string) => void }) {
  return <button onClick={() => onButtonClick('Button clicked')}>Click me</button>;
}

export function ParentComponent() {
  const handleButtonClick = (message: string) => {
    console.log(message);
  };

  return <ChildComponent onButtonClick={handleButtonClick} />;
}
```

## A controlled form

A controlled input takes its `value` from state and updates that state in `onChange`. This form keeps both fields in state and logs them on submit:

```tsx
import { useState, type ChangeEvent } from 'react';

export default function InputForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        console.log(`Name: ${name}, Email: ${email}`);
      }}
    >
      <label>
        Name:
        <input type="text" value={name} onChange={handleNameChange} />
      </label>
      <label>
        Email:
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
}
```

`event.preventDefault()` stops the browser from reloading the page. Inline handlers get their event type inferred; a handler defined separately needs an explicit type such as `ChangeEvent<HTMLInputElement>`.

## Typing props in TypeScript

Declare a props type and annotate the destructured parameter. Optional props use `?`, and defaults go in the destructuring:

```tsx
type UserProps = {
  name: string;
  email: string;
  age?: number;
};

export default function User({ name, email, age = 18 }: UserProps) {
  return (
    <div>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
      <p>Email: {email}</p>
    </div>
  );
}
```

`const User: React.FC<UserProps> = (...) => ...` also works. Since the React 18 type definitions, `React.FC` no longer adds an implicit `children` prop, so if your component renders children, declare `children: React.ReactNode` in the props type either way.

## Further reading

- [Your first component](https://react.dev/learn/your-first-component)
- [Built-in React hooks](https://react.dev/reference/react/hooks)
- [Using TypeScript with React](https://react.dev/learn/typescript)
