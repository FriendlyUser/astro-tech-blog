---
title: How to use Navigation API in react native
description: The Navigation API is a powerful new tool for managing navigation in React Native apps.
alt: my first blog post
tags: ["dotnet","git"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 14 June 2023 13:00:00 GMT
imgSrc: '/imgs/2023/bear_book_2.png'
---

# Understanding the Navigation API

The Navigation API is a powerful new tool for managing navigation in React Native apps. It allows you to navigate between routes in your app, handle deep linking, share state between routes, and more - all with a straightforward API. 

Some of the main benefits of the Navigation API are:

- Simple routing - You define routes, and the API handles transitioning between them, maintaining history, etc.

- Shared state - You can pass data between routes, maintaining a shared state for your whole navigation "tree". 

- Custom screen transitions - You have full control over the transition between routes with custom animations and gestures.

- Nested child routes - Routes can contain child routes, allowing you to create nested navigation hierarchies in your app.

- Deep linking support - Easily handle links that open into specific routes in your app.

- And more - The Navigation API also provides features like modals, tab navigation, drawer navigation, and more.

To get started with the Navigation API, you first need to install the react-navigation library:

```
npm install @react-navigation/native
```

The Navigation API is made up of "navigators" - components like StackNavigator, TabNavigator, and DrawerNavigator that manage navigation for a section of your app. You nest navigators within one another to create the navigation structure for your whole app.

For example, here's a basic app with some routes defined using the StackNavigator:

```jsx
import { NavigationContainer, StackNavigator } from '@react-navigation/native';

const Stack = StackNavigator({
  Home: {
    screen: HomeScreen
  },
  Details: {
    screen: DetailsScreen
  }
});

export default function App() {
  return (
    <NavigationContainer>
      <Stack />
    </NavigationContainer>
  ); 
}
```

This defines two routes, Home and Details, wrapped in a StackNavigator. The NavigationContainer component is required to manage state for the navigation tree.


## Navigating Between Routes and Passing Data

In part 1, we set up a basic StackNavigator with two routes. Now let's look at how to navigate between those routes and share data between them.

To navigate from one route to another, you call the navigation prop on the screen component. For example:

```jsx
// HomeScreen.js

export default function HomeScreen({ navigation }) {
  return (
    <Button 
      title="Go to Details"
      onPress={() => navigation.navigate('Details')} 
    />
  );
}
```

The navigate method takes the name of the route to navigate to. So this will navigate from HomeScreen to DetailsScreen.

You can also pass data between routes using the navigation prop. For example:

```jsx
// HomeScreen.js

export default function HomeScreen({ navigation }) {
  return (
    <Button 
      title="Go to Details"
      onPress={() => navigation.navigate('Details', { item: { name: 'React Native' } })} 
    />
  );
}
```

This passes an item object with some data to the Details route.

In the DetailsScreen, you can access this data through the route prop:

```jsx 
// DetailsScreen.js

export default function DetailsScreen({ route }) {
  const item = route.params.item;
  return <Text>{item.name}</Text>; 
}
```

The route.params contains the parameters passed from the navigating route.

To go back from the Details route to the Home route, you can call `navigation.goBack()`. For example:

```jsx
// DetailsScreen.js

export default function DetailsScreen({ navigation }) {
  return (
    <Button 
      title="Go back"
      onPress={() => navigation.goBack()} 
    />
  );
}
```

This will pop the DetailsScreen off the stack and return to the HomeScreen.

The `navigation` prop contains various other useful methods for controlling navigation like setParams, push, popToTop, reset, etc. You can build very flexible navigation flows using all the features of the Navigation API.

Next, we'll look at nesting navigators to create a tabbed view, handling deep linking, and implementing custom transitions between routes.


# Nested Navigators, Deep Linking, and Custom Transitions 

We covered the basics of navigating between routes and passing data with the Navigation API.

Nested Navigators
To create complex navigation hierarchies in your app, you nest navigators within one another. For example, to have tab navigation where each tab contains a stack of routes, you'd do:

```jsx
<TabNavigator>
  <StackNavigator>
    {/* Routes for tab 1 */}
  </StackNavigator>
  <StackNavigator>
    {/* Routes for tab 2 */}
  </StackNavigator>
</TabNavigator> 
```

You can nest navigators as deeply as you like to create really complex navigation structures.

## Deep Linking
Deep linking allows you to link directly into routes in your app. To handle deep linking with the Navigation API, you define a linking config when creating your StackNavigator. For example:

```js  
const Stack = StackNavigator({
  Home: {
    screen: HomeScreen
  },
  Details: {
    screen: DetailsScreen
  } 
}, {
  initialRouteName: 'Home',
  linking: {
    prefixes: ['https://example.com'],
    config: {
      Details: {
        path: 'details/:itemId'
      }
    }
  } 
}); 
```

This will match incoming URLs that start with `https://example.com`. The config then looks for the route name (Details here) in the path after the prefix, and any parameters after than (`:itemId`) will be passed as params to the route.

So if your app is opened with the URL `https://example.com/details/abc123`, it will navigate directly to the DetailsScreen route with route.params.itemId = 'abc123'.

Custom Screen Transitions
You have full control over the transition between screens with the Navigation API. You can create custom animations and gestures for navigating between routes.

For example, to have a slide up transition between routes, you'd do:
```jsx
<Stack.Navigator initialRouteName="Home" screenOptions={{
  headerShown: false,
  cardStyle: { backgroundColor: 'transparent' }
}}>
  <Stack.Screen name="Home" component={HomeScreen}/>
  <Stack.Screen 
    name="Details" 
    component={DetailsScreen}
    options={{
      cardStyleInterpolator: ({ current, next, closing }) => {
        return {
          cardStyle: {
            opacity: current.progress,
          }
        };
      }
    }} 
  />
</Stack.Navigator> 
```

This sets some options to hide the default header and use a transparent background for the Stack. It then passes a custom `cardStyleInterpolator` to the DetailsScreen which handles the animation/transition. This will cause the DetailsScreen to slide up and fade in.

You can create transitions triggered by gestures, react to drag gestures, and completely customize the navigation experience in your app using the Navigation API.

That covers the basics of the Navigation API in React Native! Let me know if you have any other questions.