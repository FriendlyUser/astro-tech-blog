---
title: How to generate remotion videos using the whispers transcript
description: Generating mp4 videos for youtube using transcription from whispers
pubDate: Saturday, 5 October 2022 13:00:00 GMT
tags: ["whispers", "typescript", "remotion"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-09 18.23.20 - microphone.png'
---


## Summary

In the [previous post](https://friendlyuser.github.io/posts/tech/using_whispers_to_transcribe_youtube_videos/) I covered how you can use whispers to extract transcript from youtube videos. In this post, I will cover how you can use the in videos generated from remotion.

## Remotion

First I used a generated remotion template and was inspired by the original tts template, but that relied on tts from azure. Using whispers we can produce a json file with the transcript and then use that to generate the video.

Using ffmpeg I was able to convert the audio to mp3 and then use the whispers library to transcribe the audio. Keep in mind that whispers also works with mp4 files and requires ffmpeg to be installed.


```typescript
import colorsJson from '../../public/uMzUL.json'

const {segments} = colorsJson;
```
First we extract the segments from the json file. The segments are the timestamps for each word in the transcript.


```typescript
const renderSegment = () => {
  const secAdjustedFrame = frame / videoConfig.fps;
  const segmentIndex = segments.findIndex(segment => {
    return segment.start <= secAdjustedFrame && segment.end >= secAdjustedFrame;
  });
  const segment = segments[segmentIndex];
  if (!segment) {
    return <></>
  }
}
```

The initial code is grabbing the current frame and then finding the segment that matches the current frame. If there is no segment, then we return an empty fragment. Since we are rendering the video in 30 fps and the segments are in seconds, we need to adjust the frame by the fps.

```typescript
const textDuration = segment.end - segment.start;
const words = segment.text.split(" ");

return (
  <div
    key={segment?.text}
  >
    {words.map((word, index) => {
      const wordStart = segment.start + (index * textDuration / words.length);
      return (
        <>
        <span 
          key={word}
          style={{
            color: titleColor,
            marginLeft: 10,
            marginRight: 10,
            opacity: (frame - (wordStart * videoConfig.fps)) / (videoConfig.fps * 0.5),
            transform: `scale(${spring({
              fps: videoConfig.fps,
              frame: frame - (wordStart * videoConfig.fps),
              config: {
                damping: 100,
                stiffness: 200,
                mass: 0.5,
              },
            })})`,
            display: 'inline-block',
          }}>
            {word}
          </span>
        </>
      )
    })}
  </div>
);
```

We split the segments into words so we can animate each individual word using spring. Whenever you use animations in remotion, in has reference frame for clean animations. In this case, we are using the frame of the video and then adjusting it by the start time of the word. This allows us to have a smooth animation for each word as they appear. 

Using the opacity and scale we can animate the words as they appear. The opacity is set to the frame minus the start time of the word divided by the fps. This allows us to have a smooth animation for each word as they appear. 

The one disadvantage of using segments, is words linger on the screen for a bit. This is because the segments are based on the audio segment. This means that the words lag the audio before appearing for long segments. This is something that I will need to look into in the future. Thinking that a declining exponential function might be a good way to handle this.


```typescript
	const renderImage = () => {
		const images = ["img1.png", "img2.png"]
		const imageIndex = Math.floor(frame / (videoConfig.durationInFrames / images.length));
		const image = images[imageIndex];
		return (
			<Img src={staticFile(image)} style={{
				opacity: 0.25,
			}}/>
		);
	}

	return (
		<>
		{audioUrl ? <Audio src={staticFile(audioUrl)} /> : <></>}
		<AbsoluteFill>
			{renderImage()}
		</AbsoluteFill>
		<h1 style={title}>{titleText}</h1>
		<h1 style={mainText}>
			{renderSegment()}
			</h1>
		</>
	);
```

Using dalle to generate images, I was able to generate a few images that I could use to overlay on the video. It shows a new image when the video reachs the halfway point. An opacity of 0.25 is used so the text is clear. I also added the extracted audio (using `ffmpeg`) to the video.

To view the video you can see it on youtube.

<iframe width="560" height="315" src="https://www.youtube.com/embed/rMQ9ZVRMQzQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>


https://www.youtube.com/watch?v=rMQ9ZVRMQzQ&ab_channel=GenericPerson

## References

* https://github.com/FriendlyUser/auto_youtube_caption_system/tree/v1.0.0
