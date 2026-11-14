---
tags: ['react', 'typescript']
title: "React class components: state, props, events and lifecycle methods"
description: How to write React class components with state, props, event handlers, lifecycle methods and TypeScript types, and when you still need one.
pubDate: Fri, 29 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/class-components.webp"
---

:::caution
The React docs list `Component` under [Legacy React APIs](https://react.dev/reference/react/legacy). Class components still work in React 19, but the docs recommend function components with Hooks for new code. The main case that still needs a class is an [error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).
:::

A class component is a JavaScript class that extends `React.Component` and implements a `render()` method. You'll still find them in older codebases, so it helps to know how they handle state, props, events and lifecycle.

## A component with state and an event handler

```jsx
import React from 'react';

class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    // Class methods aren't bound to the instance by default
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    // Use the updater form when the new state depends on the old one
    this.setState((prev) => ({ count: prev.count + 1 }));
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.handleClick}>Increment</button>
      </div>
    );
  }
}

export default Counter;
```

- Initial state is set in the constructor. After that, change it only through `this.setState()`, which merges the object you pass into the existing state and schedules a re-render.
- `setState` can be batched, so `this.state.count + 1` may read a stale value. The updater function `(prev) => ...` always gets the latest state.
- `render()` is required. React calls it whenever props or state change and it should return JSX without side effects.

You use a class component the same way as any other component, including from a function component:

```jsx
import Counter from './Counter';

export default function App() {
  return <Counter />;
}
```

## Props

Props are read from `this.props`. They are passed by the parent and are read-only inside the child.

```jsx
import React from 'react';

class Greeting extends React.Component {
  render() {
    return (
      <p>
        {this.props.name} is {this.props.age} years old
      </p>
    );
  }
}

// <Greeting name="John Doe" age={30} />
```

Default values go in a static `defaultProps` field. React 19 removed `defaultProps` for function components, but class components still support it.

```jsx
class Greeting extends React.Component {
  static defaultProps = { name: 'stranger' };
  // ...
}
```

## Forms and class-field handlers

Arrow functions assigned as class fields are bound to the instance, so you can skip the `bind` calls in the constructor. One handler can serve several inputs by using each input's `name` attribute:

```jsx
import React from 'react';

class SignupForm extends React.Component {
  state = { firstName: '', lastName: '' };

  handleInputChange = (event) => {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    console.log('Submitted:', this.state);
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          value={this.state.firstName}
          onChange={this.handleInputChange}
        />
        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          name="lastName"
          value={this.state.lastName}
          onChange={this.handleInputChange}
        />
        <button type="submit">Submit</button>
      </form>
    );
  }
}

export default SignupForm;
```

Each input is *controlled*: its `value` comes from state and every keystroke goes through `setState`.

## Lifecycle methods

Lifecycle methods run at fixed points: after the component is added to the page (`componentDidMount`), after an update (`componentDidUpdate`), and before it is removed (`componentWillUnmount`). Set up subscriptions and timers in the first and clean them up in the last.

```jsx
import React from 'react';

class Clock extends React.Component {
  state = { now: new Date() };

  componentDidMount() {
    this.timerId = setInterval(() => this.setState({ now: new Date() }), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerId);
  }

  render() {
    return <p>{this.state.now.toLocaleTimeString()}</p>;
  }
}

export default Clock;
```

In a function component, this pair becomes one `useEffect` that returns a cleanup function.

## TypeScript

`React.Component` takes two type parameters: props and state. With them, `this.props` and `this.state` are type-checked.

```tsx
import React from 'react';

interface CounterProps {
  name: string;
}

interface CounterState {
  count: number;
}

class Counter extends React.Component<CounterProps, CounterState> {
  state: CounterState = { count: 0 };

  handleClick = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  render() {
    return (
      <div>
        <h1>Hello, {this.props.name}!</h1>
        <p>Count: {this.state.count}</p>
        <button onClick={this.handleClick}>Increment</button>
      </div>
    );
  }
}

export default Counter;
```

TypeScript needs `@types/react` installed to know about `React.Component`.

## A note on prop-types

Older class-component code often validates props with the [`prop-types`](https://www.npmjs.com/package/prop-types) package:

```jsx
import PropTypes from 'prop-types';

Greeting.propTypes = {
  name: PropTypes.string.isRequired,
};
```

React 19 removed `propTypes` checking from React itself, so these declarations are now silently ignored and won't warn about bad props. The [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) recommends TypeScript or another type checker instead.

## Further reading

- [`Component` reference](https://react.dev/reference/react/Component), which includes a guide to migrating each class feature to a function component
- [Legacy React APIs](https://react.dev/reference/react/legacy)
