---
title: Updating list of entries in react
description: Recently I had to update entries based on user input, will go over what I did
pubDate: Saturday, 18 November 2022 13:00:00 GMT
tags: ["whispers", "openai", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-11-11 09.47.17 - updating a list of papers.png'
---

## Description

Sometimes rather than implement a save button, we want to update the entries as the user interacts. This is a common pattern in many applications. For example, in a todo list, we want to update the entries as the user modifies items. In this post, I will go over how I did this in react.


```jsx
useEffect(() => {
  const fetchItems = async () => {
    setLoadingItems(true);
    const resp = await fetch("/api/items")
    const data = await res.json()
    // copy of items that can be updated
    setItems(data);
    // save a copy of the items, we use this to diff for any changes
    setOriginalItems(data);
  }; 
}, [])
```

When the user updates entries, we check changes againist the original items. If there are changes, we update the items. If there are no changes, we do not update the items.

Disadvantage of this approach is that we are making a request to the server every time the user updates an entry. This can be mitigated by using a debounce function. This will only make a request to the server if the user has not updated the entry for a certain amount of time.


In order to check if an entry has been created we can see if the id matches the an item in the original items array. If the id does not match, we can assume that the item is new.


If the properties of the array have been altered then we can assume that the item has been updated. We can use the `lodash` library to check if the properties of the object have been altered or plain javascript logic.

```jsx
   finalItems.forEach((finalItem: any) => {
      // look for matches in original items
      const existingItem = originItems.find((original: any) => {
        return original?.id === finalItem.id;
      });
      if (!existingItem) {
        createList.push(timing);
        return false;
      }

      // here we check if the entry has been updated
      if (
        original.text !== finalItem.text
      ) {
        // updated Timing will need more data
        editList.push(timing);
      }
      return null;
    });
```

So we are appending the items to the create list if the id does not match. If the id matches, we check if the properties have been altered. If the properties have been altered, we append the item to the edit list.

In order to check if entries are deleted we can check if the id of the original items array matches the id of the final items array. If the id does not match, we can assume that the item has been deleted.

```jsx
  originItems.forEach((original: any) => {
    // look for matches in final items
    const existingItem = finalItems.find((final: any) => {
      return original?.id === final.id;
    });
    if (!existingItem) {
      deleteList.push(original);
    }
    return null;
  });
```

Combining this all together into a single function, we can update the items in the database. For obvious reasons, the api calls have been removed.

```jsx
 const handleUpdates = async (
    finalItems: Item[],
    originItems: Item[],
  ) => {
    // return if loadingItems or this function is called already
    // might need to revisit this logic if user is able to update multiple entries at the same time
    // or is on a slow connection
    if (loadingItems || isUpdating) {
      return;
    }
    setIsUpdating(true);
    // find entries that have been edited
    const editList: any[] = [];
    const createList: any[] = [];
    const deleteBookingTimings: InstantBookingTiming[] = [];
    let callsMade = false;
    finalItems.forEach((finalItem: any) => {
      // look for matches in original items
      const existingItem = originItems.find((original: any) => {
        return original?.id === finalItem.id;
      });
      if (!existingItem) {
        createList.push(timing);
        return false;
      }

      // here we check if the entry has been updated
      if (
        original.text !== finalItem.text
      ) {
        // updated Timing will need more data
        editList.push(timing);
      }
      return null;
    });

    // find deleted entries, entries in originalBookingTimings
    // that are not in newInstantBookingTimings should be deleted
    originItems.forEach((original: any) => {
      const newBookingTiming = finalItems.find((timing: any) => {
        return originalTiming?.timing?.id === timing.timingId;
      });
      if (!newBookingTiming) {
        deleteList.push(originalTiming);
      }
    });
    if (createList.length > 0) {
      // create new items
      callsMade = true;
    }
    if (editList.length > 0 && !callsMade) {
     // patch items
      callsMade = true;
    }
    if (deleteList.length > 0 && !callsMade) {
      callsMade = true;
    }
    setUpdatingIB(false);
    if (callsMade) {
      // retech items
      fetchItems();
    }
  };
```

If the user is on a slow connection, its possible that the user will have to make multiple updates. In this case, we can use a queue to store the updates. When the user is done updating the entries, we can make a single request to the server. Once the queue hits a certain number of entries, we can make a request to the server. This will reduce the number of requests to the server.

### Improvements

- debounce function to reduce the number of requests to the server
- queue to store updates
- use a library like `immer` to make the code more readable
- use a library like `lodash` to make the code more readable

For more projects and examples like this, visit my [github](https://friendlyuser.github.io/).
