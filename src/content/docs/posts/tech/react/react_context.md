---
tags: ['react', 'context']
title: Using react context to manage state
description: Explaining the use of react context to manage state
pubDate: Fri, 29 November 2023
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1212575964.png
---
React context is a feature in React that allows for global state management within an application. It enables data to be passed down through the component tree without having to pass props manually at every level. With context, any component in the tree can access and update the state, making it a powerful tool for managing state in large applications.


Using React context to manage state can be beneficial for several reasons:

1. **Avoiding prop drilling:** When an application grows, it becomes harder to pass down state as props through multiple levels of nested components. React context solves this problem by allowing data to be shared between components without having to pass it manually.
2. **Global state management:** Context provides a central location for state management, making it easier to share data between components, even if they are not directly related.
3. **Performance optimization:** With context, only the components that need access to the shared data will be re-rendered when that data changes. This can lead to better performance and faster rendering times.
4. **Code organization:** Context can be used to separate concerns and organize code in a more modular way. By creating separate context objects for different parts of the application, you can keep related data and logic together, making it easier to maintain and debug.

Overall, using React context for state management can improve the scalability, performance, and maintainability of your application.


Certainly! Here is an example of using the React Context API to manage state:


```jsx
// createContext returns an object with two properties: Provider and Consumer
import { createContext } from 'react'

// Define a new context object
const MyContext = createContext()

// Define a provider component that wraps the entire application and provides state to child components
function MyProvider({ children }) {
 const [count, setCount] = useState(0)
 
 // Use the `value` prop to provide state to child components
 return (
 <MyContext.Provider value={{ count, setCount }}>
 {children}
 </MyContext.Provider>
 )
}

// Define a child component that uses state provided by the context
function MyComponent() {
 const { count, setCount } = useContext(MyContext)

 return (
 <div>
 <p>Count: {count}</p>
 <button onClick={() => setCount(count + 1)}>Increment</button>
 </div>
 )
}

// Render the entire application
function App() {
 return (
 <MyProvider>
 <MyComponent />
 </MyProvider>
 )
}
```
In this example, we define a context object using the `createContext` function. We then define a provider component that wraps the entire application and provides state to child components. We use the `value` prop to pass state down to child components.

In the child component `MyComponent`, we use the `useContext` hook to access the state provided by the context. We can then use this state to render the UI and update the state when necessary.

Finally, we render the entire application by wrapping it in the `MyProvider` component. Any child components that need access to the state can simply use the `useContext` hook to access it.


Sure! Here is an example of using the React Context API to manage the theme of a website:


```jsx
// ThemeContext.js
import { createContext, useState } from 'react'

// Define a new context object
export const ThemeContext = createContext()

// Define a provider component that wraps the entire application and provides theme to child components
export const ThemeProvider = ({ children }) => {
 const [theme, setTheme] = useState('light')

 const toggleTheme = () => {
 setTheme(theme === 'light' ? 'dark' : 'light')
 }

 // Use the `value` prop to provide theme and toggle function to child components
 return (
 <ThemeContext.Provider value={{ theme, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 )
}
```
In this example, we define a context object using the `createContext` function. We then define a provider component that wraps the entire application and provides theme to child components. We use the `value` prop to pass theme and toggle function down to child components.

The `toggleTheme` function is used to toggle the current theme between light and dark.


```jsx
// Header.js
import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'

export const Header = () => {
 const { theme, toggleTheme } = useContext(ThemeContext)

 return (
 <header className={theme}>
 <h1>My Website</h1>
 <button onClick={toggleTheme}>
 {theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
 </button>
 </header>
 )
}
```
In the child component `Header`, we use the `useContext` hook to access the theme and toggle function provided by the context. We can then use this theme to add or remove classes to our HTML elements, which will change the visual appearance of the website.


```jsx
// App.js
import { ThemeProvider } from './ThemeContext'
import { Header } from './Header'
import { Main } from './Main'
import { Footer } from './Footer'

export const App = () => {
 return (
 <ThemeProvider>
 <Header />
 <Main />
 <Footer />
 </ThemeProvider>
 )
}
```
Finally, we render the entire application by wrapping it in the `ThemeProvider` component. Any child components that need access to the theme can simply use the `useContext` hook to access it. When the user clicks the button in the header, the theme will be toggled and all child components will re-render with the new theme.


Certainly! Here is an example of using the React Context API to sync state variables between mobile and desktop components:


```jsx
// DeviceContext.js
import { createContext, useState, useEffect } from 'react'

const DeviceContext = createContext()

const DeviceProvider = ({ children }) => {
 const [isMobile, setIsMobile] = useState(false)

 useEffect(() => {
 const checkIsMobile = () => {
 setIsMobile(window.innerWidth < 768)
 }

 checkIsMobile()
 window.addEventListener('resize', checkIsMobile)

 return () => {
 window.removeEventListener('resize', checkIsMobile)
 }
 }, [])

 return (
 <DeviceContext.Provider value={{ isMobile }}>
 {children}
 </DeviceContext.Provider>
 )
}

export { DeviceContext, DeviceProvider }
```

In this example, we define a context object using the `createContext` function. We then define a provider component that wraps the entire application and provides `isMobile` state to child components.

In the `useEffect` hook, we add an event listener to check the window size and set `isMobile` state to `true` if the window width is less than 768px. We also remove the event listener when the component unmounts.


```jsx
// DesktopComponent.js
import { useContext } from 'react'
import { DeviceContext } from './DeviceContext'

const DesktopComponent = () => {
 const { isMobile } = useContext(DeviceContext)

 return (
 <div>
 {isMobile ? null : (
 <div>
 <h2>Desktop Component</h2>
 <p>This component is only visible on desktop devices.</p>
 </div>
 )}
 </div>
 )
}

export { DesktopComponent }
```
In the `DesktopComponent`, we use the `useContext` hook to access the `isMobile` state provided by the context. We can then use this state to conditionally render the component based on the device type.


```jsx
// MobileComponent.js
import { useContext } from 'react'
import { DeviceContext } from './DeviceContext'

const MobileComponent = () => {
 const { isMobile } = useContext(DeviceContext)

 return (
 <div>
 {isMobile ? (
 <div>
 <h2>Mobile Component</h2>
 <p>This component is only visible on mobile devices.</p>
 </div>
 ) : null}
 </div>
 )
}

export { MobileComponent }
```
Similarly, in the `MobileComponent`, we use the `useContext` hook to access the `isMobile` state provided by the context. We can then use this state to conditionally render the component based on the device type.


```jsx
// App.js
import { DeviceProvider } from './DeviceContext'
import { DesktopComponent } from './DesktopComponent'
import { MobileComponent } from './MobileComponent'

const App = () => {
 return (
 <DeviceProvider>
 <DesktopComponent />
 <MobileComponent />
 </DeviceProvider>
 )
}

export default App
```


Finally, we render the entire application by wrapping it in the `DeviceProvider` component. Any child components that need access to the `isMobile` state can simply use the `useContext` hook to access it. When the device type changes (i.e. when the user resizes the window), the state will be updated and all child components will re-render with the new state.
