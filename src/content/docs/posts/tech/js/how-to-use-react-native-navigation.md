---
title: "React Navigation basics: stacks, params, tabs, deep links and transitions"
description: Set up React Navigation 7 in a React Native app, pass params between screens, nest a stack in tabs, handle deep links and change screen transitions.
alt: my first blog post
tags: ["dotnet","git","react-native","js"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 14 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/bear_book_2.png'
---

React Native doesn't ship a navigation system. [React Navigation](https://reactnavigation.org/) is the most common library for it: you describe screens inside *navigators* (stack, tabs, drawer), and it handles history, the back button, headers, and deep links.

The examples below use React Navigation 7 with the dynamic (component-based) API. Version 7 also has a static, object-based API that the docs recommend for its automatic TypeScript types; both produce the same result.

## Installing

React Navigation 7 needs React Native 0.72 or later. In an Expo project:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

In a bare React Native project, install the same four packages with `npm install`, then run `npx pod-install ios` on a Mac.

## A two-screen stack

A stack navigator keeps a history of screens: navigating pushes a screen on top, going back pops it.

```jsx
// App.js
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button
        title="Go to Details"
        onPress={() =>
          navigation.navigate('Details', { item: { name: 'React Native' } })
        }
      />
    </View>
  );
}

function DetailsScreen({ route, navigation }) {
  const item = route.params?.item;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{item ? item.name : 'No item'}</Text>
      <Button title="Go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

`NavigationContainer` holds the navigation state and must wrap the whole tree, once per app.

Every screen rendered by a navigator receives two props:

- `navigation`: methods such as `navigate(name, params)`, `goBack()`, `push()`, `popToTop()`, `setParams()` and `reset()`.
- `route`: the current route, including `route.params` from whoever navigated here.

Use optional chaining on `route.params`, because a screen can be opened without params (for example, as the initial route or from a deep link). Keep params small and serialisable, such as IDs and flags. Pass an ID and load the full object on the screen, rather than passing large objects or functions.

## Nesting a stack inside tabs

To give each tab its own history, render a stack navigator as the component of a tab screen. Install the tabs package first:

```bash
npm install @react-navigation/bottom-tabs
```

```jsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Details" component={DetailsScreen} />
    </HomeStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="HomeTab"
          component={HomeStackScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

`headerShown: false` on the tab avoids two headers stacked on top of each other, because the inner stack already draws one. `SettingsScreen` is any other screen component.

## Deep linking

Deep links are configured on `NavigationContainer` through the `linking` prop, not on the navigator. For the two-screen stack above:

```jsx
const linking = {
  prefixes: ['myapp://', 'https://example.com'],
  config: {
    screens: {
      Home: '',
      Details: 'details/:itemId',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      {/* Stack.Navigator as before */}
    </NavigationContainer>
  );
}
```

Opening `myapp://details/abc123` or `https://example.com/details/abc123` navigates to `Details` with `route.params.itemId === 'abc123'`.

The JavaScript config is only half of it. The OS also has to route the URL to your app. In Expo, set `scheme` in `app.json`. In a bare app, add an intent filter in `AndroidManifest.xml` and a URL type plus the `RCTLinkingManager` handlers in the iOS `AppDelegate`. `https://` links additionally need Android App Links or iOS Universal Links set up for your domain. See the [deep linking guide](https://reactnavigation.org/docs/deep-linking) for the exact steps.

## Screen transitions

The native stack uses the platform's own transitions, and you pick one with the `animation` option:

```jsx
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  options={{ animation: 'slide_from_bottom' }}
/>
```

Supported values include `default`, `fade`, `fade_from_bottom`, `flip`, `simple_push`, `slide_from_bottom`, `slide_from_right`, `slide_from_left` and `none`.

For fully custom, JavaScript-driven animations, use the JS-based stack from `@react-navigation/stack` instead. It also needs `react-native-gesture-handler` (and `@react-native-masked-view/masked-view` for UIKit-style header animations). It exposes `cardStyleInterpolator`, which maps the transition progress to styles. A fade looks like this:

```jsx
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const forFade = ({ current }) => ({
  cardStyle: {
    opacity: current.progress,
  },
});

<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen
    name="Details"
    component={DetailsScreen}
    options={{ cardStyleInterpolator: forFade }}
  />
</Stack.Navigator>;
```

`cardStyleInterpolator` is not available on the native stack. Prefer the native stack unless you need this level of control, because it runs transitions on the platform's own navigation primitives.

## Further reading

- [Getting started](https://reactnavigation.org/docs/getting-started)
- [Passing parameters to routes](https://reactnavigation.org/docs/params)
- [Nesting navigators](https://reactnavigation.org/docs/nesting-navigators)
- [Configuring links](https://reactnavigation.org/docs/configuring-links)
- [Stack navigator (JS) and card interpolators](https://reactnavigation.org/docs/stack-navigator)
