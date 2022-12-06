```css
@keyframes bounce-1 {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-100px); }
  100% { transform: translateY(0); }
}

/* Animations for the landing page image */
.animate--bounce-up {
  animation: bounce-up 2s;
  -moz-animation: bounce-up 2s; /* Firefox */
  -webkit-animation: bounce-up 2s; /* Safari and Chrome */
  -o-animation: bounce-up 2s; /* Opera */
}

@keyframes bounce-up {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 
  40% {transform: translateY(-25px);} 
  60% {transform: translateY(-12.5px);} 
} 

@-moz-keyframes bounce-up { /* Firefox */
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 
  40% {transform: translateY(-25px);} 
  60% {transform: translateY(-12.5px);} 
}
@-webkit-keyframes bounce-up { /* Safari and Chrome */
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 
  40% {transform: translateY(-25px);} 
  60% {transform: translateY(-12.5px);} 
}
@-o-keyframes bounce-up { /* Opera */
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 
  40% {transform: translateY(-25px);} 
  60% {transform: translateY(-12.5px);}  
}

/* Animations for stats section */
.animate--fade-in-left {
  animation: fadein-left 2s;
  -moz-animation: fadein-left 2s; /* Firefox */
  -webkit-animation: fadein-left 2s; /* Safari and Chrome */
  -o-animation: fadein-left 2s; /* Opera */
}
```
The CSS code above defines a number of keyframe animations for a website. The animations include bounce-1, bounce-up, and fade-in-left. These animations can be applied to elements on a website using the animation property and giving the name of the keyframe animation as the value, along with any additional animation properties such as duration and delay.
For example, to apply the bounce-up animation to an element with the class my-element, the following code could be used:


Additionally, the code defines some classes that can be applied to elements to trigger the animations, such as animate--bounce-up and animate--fade-in-left. These classes can be added to an element along with the animation property to trigger the animation. For example:

```html
<div class="my-element animate--bounce-up">
  This element will bounce up when the page loads.
</div>
```

Note that in order for these animations to work properly, the website must also include the necessary vendor prefixes for different browsers, as shown in the code above.

```js
import React, { useEffect, useContext } from 'react'
import { CommandBar, ICommandBarItemProps } from 'office-ui-fabric-react/lib-commonjs/CommandBar'
import { CommandBarButton, IButtonProps } from 'office-ui-fabric-react/lib-commonjs/Button'
import { DirectionalHint } from 'office-ui-fabric-react/lib-commonjs/Callout'
import {
  IContextualMenuItemProps,
  ContextualMenuItem,
  IContextualMenuItemStyles,
  IContextualMenuStyles
} from 'office-ui-fabric-react/lib-commonjs/ContextualMenu'

import { dark } from "@theme/dark"
import { light } from "@theme/light"
import { getTheme } from 'office-ui-fabric-react/lib-commonjs/Styling'
import {Context} from '@theme/ThemeProvider'
export const Navbar: React.FunctionComponent = () => {
  const [state, dispatch] = useContext(Context)
  let currentTheme = dark
  let theme = getTheme()
  // use effects
  useEffect(() => {
    dispatch({type: 'SET_DARK'})
  }, [])
  useEffect(() => {
    theme = getTheme()
  })
  let _farItems: ICommandBarItemProps[] = [
    {
      key: 'tile',
      text: 'Toggle Theme',
      // This needs an ariaLabel since it's icon-only
      ariaLabel: 'Toggle Theme',
      iconOnly: true, 
      iconProps: { iconName: currentTheme === dark ? 'Sunny' : 'ClearNight' },
      onClick: () => { 
        currentTheme = currentTheme === light ? dark : light;
        // simple approach to switching icons
        _farItems[0].iconProps = { iconName: currentTheme === dark ? 'Sunny' : 'ClearNight' }
        dispatch({type: 'SET_THEME', payload: currentTheme})
      }
    }
  ]
    
  // Styles for both command bar and overflow/menu items
  const itemStyles: Partial<IContextualMenuItemStyles> = {
    label: { fontSize: 18 },
    icon: { color: theme.palette.themePrimary },
    iconHovered: { color: theme.palette.neutralPrimaryAlt }
  }
  // For passing the styles through to the context menus
  const menuStyles: Partial<IContextualMenuStyles> = {
    subComponentStyles: { menuItem: itemStyles, callout: {} }
  }

  // Custom renderer for main command bar items
  const CustomButton: React.FunctionComponent<IButtonProps> = props => {
    return (
      <CommandBarButton
        {...props}
        onClick={props.onClick}
        styles={{
          ...props.styles,
          ...itemStyles
        }}
      />
    )
  }

  // Custom renderer for menu items (these must have a separate custom renderer because it's unlikely
  // that the same component could be rendered properly as both a command bar item and menu item).
  // It's also okay to custom render only the command bar items without changing the menu items.
  const CustomMenuItem: React.FunctionComponent<IContextualMenuItemProps> = props => {
    // Due to ContextualMenu implementation quirks, passing styles here doesn't work
    return <ContextualMenuItem {...props} />
  }

  const overflowProps: IButtonProps = {
    ariaLabel: 'More commands',
    menuProps: {
      contextualMenuItemAs: CustomMenuItem,
      // Styles are passed through to menu items here
      styles: menuStyles,
      items: [], // CommandBar will determine items rendered in overflow
      isBeakVisible: true,
      beakWidth: 20,
      gapSpace: 10,
      directionalHint: DirectionalHint.topCenter
    }
  }

  const _items: ICommandBarItemProps[] = [
    {
      key: 'newItem',
      text: 'New',
      iconProps: { iconName: 'Add' },
      onClick: () => console.log('Share'),
      subMenuProps: {
        // Must specify the menu item type for submenus too!
        contextualMenuItemAs: CustomMenuItem,
        // Styles are passed through to menu items here
        styles: menuStyles,
        items: [
          { key: 'emailMessage', text: 'Email message', iconProps: { iconName: 'Mail' }, onClick: () => console.log('Share') },
          { key: 'calendarEvent', text: 'Calendar event', iconProps: { iconName: 'Calendar' }, onClick: () => console.log('Share') }
        ]
      }
    },
    { key: 'upload', text: 'Upload', iconProps: { iconName: 'Upload' }, href: 'https://dev.office.com/fabric' },
    { key: 'share', text: 'Share', iconProps: { iconName: 'Share' }, onClick: () => console.log('Share') },
    { key: 'download', text: 'Download', iconProps: { iconName: 'Download' }, onClick: () => console.log('Download') }
  ]

  const _overflowItems: ICommandBarItemProps[] = [
    { key: 'move', text: 'Move to...', onClick: () => console.log('Move to'), iconProps: { iconName: 'MoveToFolder' } },
    { key: 'copy', text: 'Copy to...', onClick: () => console.log('Copy to'), iconProps: { iconName: 'Copy' } },
    { key: 'rename', text: 'Rename...', onClick: () => console.log('Rename'), iconProps: { iconName: 'Edit' } }
  ]

  return (
    <CommandBar
      overflowButtonProps={overflowProps}
      // Custom render all buttons
      buttonAs={CustomButton}
      items={_items}
      overflowItems={_overflowItems}
      farItems={_farItems}
      ariaLabel="Use left and right arrow keys to navigate between commands"
    />
  )
}
```

The code above is a React component that renders a command bar at the top of the page. The command bar has a button that allows the user to toggle between light and dark themes for the page. The command bar also has several other buttons for performing various actions.

The component uses the useContext hook to get the current theme from the Context object and to dispatch actions that update the theme. The useEffect hook is used to set the initial theme to dark when the component is first rendered.

The CustomButton and CustomMenuItem components are custom renderers for the command bar buttons and menu items, respectively. These custom renderers allow the developer to control the styles of the buttons and menu items.

The command bar is rendered using the CommandBar component from the office-ui-fabric-react library. This component allows the developer to specify the items that appear in the command bar and their behavior. The items that appear in the overflow menu (the menu that appears when there are too many items to fit in the command bar) are determined automatically by the CommandBar component.

Overall, this component provides a user-friendly way to access common actions and to toggle between light and dark themes for the page.
