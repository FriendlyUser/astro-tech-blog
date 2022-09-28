---
title: Upgrading from material v4 to mui v5 
description: Updating material ui components to the latest version
pubDate: Tuesday, 27 September 2022 13:00:00 GMT
tags: ["mui", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-09-27 19.30.58 - corgi playing basketball.png'
---

Recently at work, I have been upgrading material ui from v4 to v5, here are some of the lessons I learned.


```javascript
const QontoConnector = withStyles({
  alternativeLabel: {
    top: 10,
    left: "calc(-50% + 16px)",
    right: "calc(50% + 16px)",
  },
  active: {
    "& $line": {
      borderColor: Colors.LIGHT_GREY,
      },
    },
  completed: {
    "& $line": {
      borderColor: Colors.LIGHT_GREY,
    }
   },
  line: {
    borderColor: "#eaeaf0",
    borderTopWidth: 3,
    borderRadius: 1,
  },
})(StepConnector);
```

With the latest version of mui, the `withStyles` function has been deprecated. Instead, we can use the `styled` function to create a hook that we can use to style our components.

```javascript
const QontoConnector =  styled(StepConnector)(() => {
  return {
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
      top: 10,
      left: "calc(-50% + 16px)",
      right: "calc(50% + 16px)",
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: Colors.LIGHT_GREY,
      },
    },
      [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: {
          borderColor: Colors.LIGHT_GREY,
        },
      },
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: "#eaeaf0",
        borderTopWidth: 3,
        borderRadius: 1,
      },
  };
});
```

In addition, we can also create styled divs instead of `makeStyles` hooks. This is useful for creating styled components that are not part of the mui library.

```javascript
const useQontoStepIconStyles = makeStyles({
  root: {
    color: Colors.LIGHT_GREY,
    display: "flex",
    height: 22,
    alignItems: "center",
  },
  active: {
    color: Colors.SHAIR_GREEN,
  },
  circle: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    border: "1px solid rgba(0, 0, 0, 0.54)",
    backgroundColor: "white",
  },
  completed: {
    color: Colors.SHAIR_GREEN,
    zIndex: 1,
    fontSize: 18,
  },
});
```

and then we can use it like this for mui v4:

```javascript
const QontoStepIcon = (props) => {
  const classes = useQontoStepIconStyles();
  const { active, completed } = props;

  return (
    <div
      className={clsx(classes.root, {
        [classes.active]: active,
      })}
    >
      {completed ? (
        <Check className={classes.completed} />
      ) : (
        <div className={classes.circle} />
      )}
    </div>
  );
};
```

In the new mui v5, we can use the `styled` function to create a styled component.

```javascript

const Root = styled("div")(() => {
  return {
    [`&.${classes.root}`]: {
      color: Colors.LIGHT_GREY,
      display: "flex",
      height: 22,
      alignItems: "center",
    },
    [`& .${classes.active}`]: {
      color: Colors.SHAIR_GREEN,
    },
    [`& .${classes.circle}`]: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      border: "1px solid rgba(0, 0, 0, 0.54)",
      backgroundColor: "white",
    },
    [`& .${classes.completed}`]: {
      color: Colors.SHAIR_GREEN,
      zIndex: 1,
      fontSize: 18,
    },
  };
});

```

And in order to use it in mui v5, we can use it like this:
  
 ```javascript
const QontoStepIcon = (props) => {
 const { active, completed } = props;
  return (
    <Root className={`${classes.root} ${active ? classes.active : ""}`}>
      {completed ? <Check className={classes.completed} /> : <div className={classes.circle} />}
    </Root>
  );
};
```

For overriding custom styles, we can use the `sx` prop instead of the `classes` prop. For example, if we want to override the `MuiButton` component, we can do it like this:

```javascript
const AmountSlider = createTheme({
  components: {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "green",
          height: 3,
        },
        thumb: {
          backgroundColor: "black",
        },
        active: {},
        track: {
          height: 10,
        },
        rail: {
          height: 2,
        },
      },
    },
  },
});
```

The documentation provides clear simple guidelines in order to upgrade from v4 to v5. This article covers some of the more subtle changes that I encountered while upgrading.
