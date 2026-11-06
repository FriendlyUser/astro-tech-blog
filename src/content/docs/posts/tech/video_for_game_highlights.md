---
title: Using remotion for game highlights
description: As I hit titan in erbs I wanted to make a video of the highlights
pubDate: Tuesday, 22 November 2022 13:00:00 GMT
tags: ["remotion", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-11-19 19.36.15 - game highlights.png'
---

In order to generate a video in erbs with decent animations I used a few things.

Remotion which is a react based library for creating videos in react.


Eternal return is a game that I play and I wanted to make a video of the highlights of my road of titan. I used remotion to create a video of the highlights. I used the following code to create the video.

I track all the segments times to apply animations

```jsx
const openingDuration = fps*20;
const buffsNerfsMeanMessageDuration = fps*20;
// Length of video / playbackspeed, doubled
const medalVideoI = fps*60/2;
const medalVideoII = fps*60/2;
const twitchClipDuration = fps*21;
```

The first section is the opening. I wanted to have a nice animation for the opening. I used the following code to create the opening animation.

It grabs information from json.

```jsx
const renderSeasonText1To3 = () => {
		// Center div with transitioning appearing text

		// show opacity: (frame - (wordStart * videoConfig.fps)) / (videoConfig.fps * 0.5),
		// 3 seasons to start split by 1/3 openingDuration
		const seasonToShow = Math.floor((frame / openingDuration) * 3);
		const seasonData = seasonsP1[seasonToShow];
		if (!seasonData) {
			return null;
		}
		const seasonName = seasonData.name;
		const hyunWooStats = seasonData.games[0]
		const startFrame = seasonToShow * openingDuration / 3;
		const endFrame = startFrame + openingDuration / 3;

		const headingOpacity = interpolate(frame, [startFrame, endFrame], [1, 0.25]);

		const textOpacity = interpolate(frame, [startFrame, startFrame +10, startFrame + 20, startFrame +25, endFrame], [0.25, 0.75, 0.6, 0.5, 0.4]);
		return (
			<>
				<div style={{
				}}>
					<h1 style={{
						opacity: headingOpacity,
						fontWeight: 'bold',
						fontSize: 100,
						textAlign: 'center',
						position: 'absolute',
						top: 100,
						width: '100%',
						color: 'black',
						// Transform: 'translateY(-50%)',
					}}>{seasonName}</h1>
						<h6 
							style={{
								color: 'black',
								fontSize: 60,
								textAlign: 'center',
								position: 'absolute',
								top: 300,
								width: '100%',
								// Opacity: (endFrame - startFrame) / (frameDuration),
								opacity: textOpacity,
								// Transform: `scale(${bounceAnimation})`,
							}}>
								{hyunWooStats.hyunwoo} Games
						</h6>
						<RankContainer tier={hyunWooStats.tier} subdivision={hyunWooStats.subdivision} naRank={hyunWooStats?.naRank} delay={startFrame}/>
				</div>
			</>
		)
	}
```

It shows the season name and the number of games played by hyunwoo. It also shows the rank of hyunwoo at the time.

The  interploate is a function that takes in a frame and a range of frames and returns a value between 0 and 1. It is used to create animations. You need to calculate the starting frame and ending frame for the animation. The starting frame is the current frame and the ending frame is the current frame + the duration of the animation. The value is then used to create the animation.


Afterwards, I use the `OffthreadVideo`to show some of the highlights recorded by medal. I use the following code to create the highlights.

```jsx
  const video1 = <OffthreadVideo  src={staticFile(vid1.vidSrc)} playbackRate={2} style={{
      width: "50%"
    }}/>
  const video2 = <OffthreadVideo  src={staticFile(vid2.vidSrc)} playbackRate={2} style={{
      width: "50%"
    }}/>
```

This will show two videos side by side loaded from static files.

```jsx
<Sequence from={finalSection} durationInFrames={fps*10}>
  {renderShowTitanLevel()}
  <AbsoluteFill style={{
    zIndex: 1,
  }}>
    {renderBg("fankit/ER_3840x2160.png", 0.5)}
  </AbsoluteFill>
</Sequence>
```

The final sequence shows me hitting titan after 7 seasons of eternal return

See the full video at https://www.youtube.com/watch?v=r8cBmdfXBmo

## References

A lot of assets using are available from the erbs fankit

* https://drive.google.com/drive/folders/1bgW32L09YPpRgQKtH4C_TAd3Kr0N9Y90