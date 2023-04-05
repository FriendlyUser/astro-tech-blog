---
title: Page Transitions with Next.js
description: One of the ways to enhance the user experience of a Next.js app is to add page transitions. In this article, we will explore how to add page transitions to a Next.js app.
pubDate: Saturday, 20 October 2023 13:00:00 GMT
tags: ["css", "chatgpt"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-26 21.10.41 - decentralized network diagram simple bobble heads.png'
---


Next.js is a popular React framework that enables developers to build server-side rendered React applications with ease. One of the ways to enhance the user experience of a Next.js app is to add page transitions. In this article, we will explore how to add page transitions to a Next.js app.

### Step 1: Install Necessary Packages

To add page transitions to a Next.js app, we need to install two packages: `framer-motion` and `next-page-transitions`. We can install them using npm by running the following command:

```
npm install framer-motion next-page-transitions
```

### Step 2: Create a Layout Component

We need to create a layout component that will wrap all our pages. This component will be responsible for rendering the page transitions. Here is an example of a simple layout component:

```jsx
import { motion } from 'framer-motion';
import { PageTransition } from 'next-page-transitions';

const transitionStyles = {
  enter: {
    opacity: 0,
  },
  enterActive: {
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const Layout = ({ children }) => (
  <PageTransition
    timeout={500}
    classNames="page-transition"
    monkeyPatchScrolling
    loadingDelay={500}
    loadingTimeout={{
      enter: 500,
      exit: 0,
    }}
    loadingClassNames="loading-indicator"
  >
    <motion.div
      key={router.route}
      initial="enter"
      animate="enterActive"
      exit="exit"
      variants={transitionStyles}
    >
      {children}
    </motion.div>
  </PageTransition>
);

export default Layout;
```

In this component, we are using the `PageTransition` component from `next-page-transitions` to wrap our content. We are also using the `motion` component from `framer-motion` to add animations.

### Step 3: Wrap Pages with the Layout Component

We need to wrap all our pages with the layout component we just created. Here is an example:

```jsx
import Layout from '../components/Layout';

const HomePage = () => (
  <Layout>
    <div>
      <h1>Home Page</h1>
    </div>
  </Layout>
);

export default HomePage;
```

### Step 4: Add CSS Transitions

We also need to add CSS transitions to our pages to make the animations smoother. Here is an example of a simple CSS transition:

```css
.page-transition-enter {
  opacity: 0;
}

.page-transition-enter-active {
  opacity: 1;
  transition: opacity 500ms ease-in-out;
}

.page-transition-exit {
  opacity: 1;
}

.page-transition-exit-active {
  opacity: 0;
  transition: opacity 500ms ease-in-out;
}
```

### Step 5: Test the Page Transitions

We are now ready to test our page transitions. Run the app and navigate between pages to see the animations in action.

### Conclusion

Adding page transitions to a Next.js app can enhance the user experience and make the app feel more polished. By following the steps outlined in this article, you can easily add page transitions to your Next.js app.