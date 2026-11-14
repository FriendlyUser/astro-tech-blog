---
tags: ['react', 'context']
title: Sharing state across React components with Context
description: How to use createContext and useContext to share state without prop drilling, with counter, theme toggle and viewport-size examples, and how context re-renders work.
pubDate: Fri, 29 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/react-context.webp"
---

React context lets a parent make a value available to every component below it without passing it as a prop through each level. Put state in a provider component and pass that state, plus the functions that change it, as the context value. Any descendant can then read and update it with `useContext`.

The examples use React 19, where you can render the context itself as the provider (`<CountContext value={...}>`). On React 18 and earlier, use `<CountContext.Provider value={...}>`.

## When context helps, and what it costs

- **It avoids prop drilling.** You don't have to thread a value through intermediate components that don't use it.
- **It suits values many components read and that change rarely,** such as theme, locale, the signed-in user, or feature flags.
- **It is not a performance optimisation.** When the value changes, React re-renders *every* component that reads that context, even if it only uses part of the value. If the provider passes a new object on every render (`value={{ count, setCount }}`), all consumers re-render whenever the provider does. Memoize the value with `useMemo` (see [the `useContext` docs](https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions)), and split unrelated data into separate contexts.

For state that changes often and is read by many components, a store library with selectors (Zustand, Redux Toolkit) usually re-renders less.

## A shared counter

```jsx
import { createContext, useContext, useMemo, useState } from 'react';

const CountContext = createContext(null);

function CountProvider({ children }) {
  const [count, setCount] = useState(0);
  // Keep the same object between renders unless count changes
  const value = useMemo(() => ({ count, setCount }), [count]);

  return <CountContext value={value}>{children}</CountContext>;
}

// A small hook gives a clear error when the provider is missing
function useCount() {
  const ctx = useContext(CountContext);
  if (ctx === null) {
    throw new Error('useCount must be used inside <CountProvider>');
  }
  return ctx;
}

function Counter() {
  const { count, setCount } = useCount();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}

export default function App() {
  return (
    <CountProvider>
      <Counter />
    </CountProvider>
  );
}
```

`createContext(null)` sets the default value a component gets when there is no provider above it. Here that default is `null`, which `useCount` turns into an error instead of a confusing `undefined` crash later.

## A theme toggle

Split across files, the same pattern drives a light/dark theme.

```jsx
// ThemeContext.jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

```jsx
// Header.jsx
import { useTheme } from './ThemeContext';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={theme}>
      <h1>My Website</h1>
      <button onClick={toggleTheme}>
        {theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      </button>
    </header>
  );
}
```

```jsx
// App.jsx
import { ThemeProvider } from './ThemeContext';
import { Header } from './Header';

export default function App() {
  return (
    <ThemeProvider>
      <Header />
      {/* other components can call useTheme() too */}
    </ThemeProvider>
  );
}
```

When the button is clicked, `theme` changes, the memoized value changes, and every component that calls `useTheme()` re-renders with the new theme. Your CSS then styles `.light` and `.dark`.

## Sharing a viewport flag between mobile and desktop components

Context can also hold values derived from the browser, so several components share one listener instead of each adding its own.

```jsx
// DeviceContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const DeviceContext = createContext(false);

export function DeviceProvider({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <DeviceContext value={isMobile}>{children}</DeviceContext>;
}

export function useIsMobile() {
  return useContext(DeviceContext);
}
```

`matchMedia` only fires when the breakpoint is crossed, not on every pixel of a resize like a `resize` listener does. The value is a plain boolean, so there's nothing to memoize.

```jsx
// App.jsx
import { DeviceProvider, useIsMobile } from './DeviceContext';

function DesktopNav() {
  return <nav>Desktop navigation</nav>;
}

function MobileNav() {
  return <nav>Mobile navigation</nav>;
}

function Nav() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileNav /> : <DesktopNav />;
}

export default function App() {
  return (
    <DeviceProvider>
      <Nav />
    </DeviceProvider>
  );
}
```

`isMobile` starts as `false` and is corrected after the first effect runs, so on a phone the desktop version can flash briefly. With server rendering this is unavoidable unless you guess from the request. If the difference is only visual, a CSS media query avoids the problem entirely.

## Further reading

- [`createContext`](https://react.dev/reference/react/createContext)
- [`useContext`](https://react.dev/reference/react/useContext)
- [Passing data deeply with context](https://react.dev/learn/passing-data-deeply-with-context)
