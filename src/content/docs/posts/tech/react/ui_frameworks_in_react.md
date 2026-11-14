---
tags: ['react', 'bootstrap', 'material', 'testing']
title: "React UI libraries and app basics: MUI, React-Bootstrap, routing, Redux and tests"
description: Add MUI or React-Bootstrap to a Vite React app, then wire up controlled forms, React Router, Redux Toolkit, Vitest tests and a Vercel deploy.
pubDate: Fri, 29 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2955132952.png
---
A UI component library gives you buttons, inputs, dialogs and layout primitives that already look consistent and handle accessibility details, so you can spend your time on the app instead of on CSS. This post shows how to add the two most common ones, MUI (Material UI) and React-Bootstrap, and then covers the other pieces most React apps need: forms, routing, shared state, tests and deployment.

:::caution
The original version of this post used Create React App-era tooling (webpack config by hand, Enzyme, `createStore`, React Router v5). Create React App was [deprecated in February 2025](https://react.dev/blog/2025/02/14/sunsetting-create-react-app), Enzyme has no official adapter for React 17 or later, Redux now recommends Redux Toolkit, and React Router replaced `component={...}` with `element={...}` in v6. The examples below use the current equivalents.
:::

## Create the project

Start from a Vite template instead of writing a webpack config:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

## Add a UI library

### MUI (Material UI)

MUI implements Google's Material Design. Install it with its default styling engine, Emotion:

```bash
npm install @mui/material @emotion/react @emotion/styled
```

MUI uses the Roboto font by default; add it with `@fontsource/roboto` or a Google Fonts `<link>` if you want the stock look. Components are imported one per path:

```tsx
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export default function Toolbar() {
  return (
    <Stack direction="row" spacing={2}>
      <Button variant="contained">Save</Button>
      <Button variant="outlined">Cancel</Button>
    </Stack>
  );
}
```

### React-Bootstrap

React-Bootstrap reimplements Bootstrap 5's components as React components, without jQuery. You install Bootstrap itself for the CSS:

```bash
npm install react-bootstrap bootstrap
```

Import the stylesheet once, in `src/main.tsx`:

```tsx
import 'bootstrap/dist/css/bootstrap.min.css';
```

Then import components individually:

```tsx
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

export default function Notice() {
  return (
    <Alert variant="info">
      New version available. <Button size="sm">Reload</Button>
    </Alert>
  );
}
```

Pick one library per app. Mixing them means two design systems and two sets of global styles fighting each other.

## Controlled form inputs

In React, form inputs are usually *controlled*: the value lives in component state and every keystroke goes through an `onChange` handler. That makes it easy to validate or transform input before submitting. Library inputs work the same way as plain `<input>` elements. Here is the MUI version:

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

export default function NameForm() {
  const [name, setName] = useState('');

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    alert(`Hello, ${name}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Name"
        value={name}
        onChange={handleChange}
        error={name.length > 0 && name.trim().length < 2}
        helperText="At least two characters"
      />
      <Button type="submit" variant="contained" disabled={name.trim().length < 2}>
        Submit
      </Button>
    </form>
  );
}
```

## Routing with React Router

React Router maps URLs to components in a single-page app. In current releases the package is `react-router` (the separate `react-router-dom` package is no longer needed):

```bash
npm install react-router
```

Wrap the app in a `BrowserRouter`, declare routes with `<Routes>` and `<Route element={...}>`, and navigate with `<Link>`:

```tsx
import { BrowserRouter, Link, Route, Routes } from 'react-router';

function HomePage() {
  return <h1>Welcome to the homepage!</h1>;
}

function AboutPage() {
  return <h1>About us</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> | <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

The latest major version requires React 19.2.7 or newer. If you are on an older React, `react-router-dom` v6 or v7 uses the same `Routes`/`element` API. Routes match exactly by default since v6, so the old `exact` prop is gone. For links that should show an active state, use `NavLink`.

## Shared state with Redux Toolkit

Redux keeps app-wide state in one store. Plain `createStore` from the `redux` package is deprecated; the Redux team recommends Redux Toolkit, which removes most of the boilerplate:

```bash
npm install @reduxjs/toolkit react-redux
```

Define a slice and a store (`src/store.ts`):

```ts
import { configureStore, createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    // Immer lets you write "mutating" code; it produces a new state object.
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  },
});

export const { increment, decrement } = counterSlice.actions;

export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
```

Provide the store and read from it with hooks:

```tsx
import { Provider, useDispatch, useSelector } from 'react-redux';
import { decrement, increment, store, type RootState } from './store';

function Counter() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => dispatch(increment())}>Increment</button>
      <button onClick={() => dispatch(decrement())}>Decrement</button>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}
```

Redux adds indirection. If the state is only used by one subtree, `useState` plus props or a React context is often enough.

## Testing with Vitest and React Testing Library

Enzyme's shallow rendering tested component internals and never got official support past React 16. React Testing Library renders real DOM and queries it the way a user would. With a Vite project, Vitest is the natural runner:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/dom
```

Enable a browser-like environment in `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true, // lets Testing Library clean up the DOM after each test
  },
});
```

A component and its test:

```tsx
// src/Button.tsx
type Props = { text: string; onClick?: () => void };

export default function Button({ text, onClick }: Props) {
  return <button onClick={onClick}>{text}</button>;
}
```

```tsx
// src/Button.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button';

describe('<Button />', () => {
  it('renders the button text', () => {
    render(<Button text="Click me" />);
    expect(screen.getByRole('button').textContent).toBe('Click me');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button text="Click me" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

Add `"test": "vitest"` to the `scripts` in `package.json` and run `npm test`.

## Building and deploying to Vercel

`npm run build` writes a static bundle to `dist/`. Any static host can serve it (Vercel, Netlify, Cloudflare Pages, GitHub Pages, Firebase Hosting, AWS Amplify). On Vercel:

1. Push the project to GitHub, GitLab or Bitbucket.
2. In the Vercel dashboard, import the repository. Vercel detects Vite and fills in `npm run build` and `dist` as the build command and output directory.
3. Each push to the main branch deploys to production; pull requests get preview URLs.

You can also deploy from the terminal with the Vercel CLI by running `vercel` in the project root.

One gotcha with client-side routing: opening `/about` directly returns a 404, because there is no `about.html` on the server. Tell Vercel to serve `index.html` for every path with a `vercel.json` in the project root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

To use your own domain, add it under the project's Domains settings and create the DNS records Vercel shows you at your registrar.

## A few performance notes

- Always deploy the production build; the dev build includes extra checks and warnings.
- Split rarely visited routes into separate chunks with `React.lazy` and `<Suspense>`.
- Import library components by path (`@mui/material/Button`, `react-bootstrap/Button`) as shown above, which keeps development builds fast.
- Profile before optimising: the React Developer Tools Profiler shows which components re-render and why.

## Further reading

- [MUI installation](https://mui.com/material-ui/getting-started/installation/)
- [React-Bootstrap introduction](https://react-bootstrap.netlify.app/docs/getting-started/introduction)
- [React Router declarative mode](https://reactrouter.com/start/declarative/installation)
- [Redux Toolkit quick start](https://redux.js.org/tutorials/quick-start)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
