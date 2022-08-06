---
title: How to consume twilio conversations media
description: A simple explaination of how I consume twilio conversation media
alt: Tagging in Astro
layout: '@/templates/BasePost.astro'
pubDate: Monday, 15 July 2022 13:00:00 GMT
tags: ["twilio", "typescript"]
imgSrc: '/assets/images/image-post4.jpeg'
imgAlt: 'Image post 4'
---

# Summary

Twilio conversations is an excellent framework to start building applications on top of.

```jsx
import React, { useEffect } from "react";
import { Message } from "@twilio/conversations";

export interface ConversationMessageProps {
  message: Message;
}

const ConversationMedia = ({ message }: ConversationMessageProps) => {
  const [imageUrls, setImageUrls] = React.useState<string[]>();

  const getAllMessages = async () => {
    if (message.attachedMedia) {
      const mediaImages = await Promise.all(
        message.attachedMedia.map(async (media) => {
          // todo figure out if we need to get the temporary url and the cached one
          return media.getContentTemporaryUrl();
        }),
      );
      // filter out null values
      const filteredImages = mediaImages.filter((item) => item !== null);
      setImageUrls(filteredImages as string[]);
    }
  };
  useEffect(() => {
    if (!imageUrls) {
      getAllMessages();
    }
  }, []);
  // TODO skeleton loader
  return (
    <>
      {imageUrls && imageUrls.length > 0 && (
        <>
          {imageUrls.map((imageUrl) => {
            return (
              <div key={imageUrl}>
                <img src={imageUrl} className="img-fluid" />
              </div>
            );
          })}
        </>
      )}
    </>
  );
};

export default ConversationMedia;
```

My implementation of conversation media, loads the data after a while, other improvements could include adding a skeleton loader based on the image.

After passing in an image, I load the images temporarily from the api, I think it might be better to grab the cache and then attempt to refire the image, but I do not think its that serious for this implementation.


```jsx
if (message.type === "text") {
    return (
    <>
        <div
        className={`${styles.bubbleContainer} ${bubbleDirection}`}
        key={message.body}
        >
        {firstMessage ? (
            renderAvatar(profileImage)
        ) : (
            <div className={styles.blankCircle} />
        )}
        <div className={`${styles.bubble} ${bubbleClass}`}>{message.body}</div>
        </div>
        <br />
    </>
    );
}

// hopefully images works fine
// media type
if (message.type === "media") {
    return <ConversationMedia message={message} />;
}
```

As you can see, rendering the images is a lot more complex than rendering, some improvements could include making it more clear who uploaded the image.

But overall, its pretty simple to work with twilio conversations.