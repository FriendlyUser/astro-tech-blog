---
title: Evaluating whispers vs current alternatives
description: Evaluating the new whispers asr text extraction vs current options like wit.ai
pubDate: Saturday, 1 October 2022 13:00:00 GMT
tags: ["whispers", "openai", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---


### Summary
Recently openai released whispers, a new transcription tool. I wanted to evaluate it against current options like wit.ai and see how it compares.

In order to use whispers for your projects, will you need python 3.7+ and to install a model.
```
pip install whispers
```
For my use cases, I will use the base model due to speed being more important than efficency, as I want to implement (somewhat real time transcription).

Although I am comparing it to my existing implementation of wit.ai, the length of my content is a bit longer than the average user. Due to technical limitations of wit.ai I am sending video chunks in 4 minute 30 second intervals, with whispers running locally, that limitation can be somewhat lessened.

For this analysis, I am comparing a youtube video (has google transcriptions), to what wit.ai ( from facebook) produces and what whispers produces. 

I am using `ffmpeg` to convert the audio to mp3 and then the corresponding libraries to transcribe the audio. For the given youtube video, I extract the transcript using the unofficial youtube api.

I will be using https://www.youtube.com/watch?v=8F5Mc5bKEdc with stonk talk from jim cramer.

For example in this sample phrase `whispers` does a good job. Given the amazing performance on dalle, I am not surprised that the openai model performs quite well.

```
whispers: 
Sebastian says the volatility index, the bond market, and bond volatility are all pointing towards lower stock prices.

wit.ai:
Sebastian says the volatile index, the bomb market and bond vault totally are all pointing towards lower stock prices

google:
Sebastian says the volatility index the bond market and bond volatility are all pointing toward lower stock prices
```

In this phrase you can see that whispers has the best performance, wit.ai has the worst performance, and google is in the middle.

In another example, whispers fails to detect P instead of B. Wit.ai does a good job of detecting the P, but google does a better job of detecting the B.

```
whispers:
Even though the selling in the S&B has slowed versus where we were looking at earlier this month, the volatility index has shut up much, much more.

google:
even though the selling in the s p has slowed versus where we were looking at earlier this month the volatility index has shot up much much more

wit.ai:
failed to detect the speech
```

In this case, I believe that whispers does a better job than wit.ai, but google does a better job than whispers. I think my script to detect the speech is not working well for wit.ai or it dropped the text as it seemed like the text was not detected.

This illustrates the advantages of whispers, it has a 30 second sliding window, which reduces the likelyhood of dropping text like this.

In another example, whispers does a good job of detecting the speech, but wit.ai does a better job of detecting the speech.

```
whispers:
If you're still another turbulent week where the average is cut smashed, how much worse do things have to get before we stem the bleeding?

wit.ai:
If you're still another turbulent week or the average got smash How much worse do things have to get before we stem the bleeding?

google:
foreign if there's still another turbulent week where the averages got smashed how much worse do things have to get before we stem the bleeding unfortunately
```

In this case, google does a better job of detecting the speech, whispers performs worse than wit.ai, and wit.ai performs worse than google.

Overall it appears that whispers has an excellent transcription rate, but it is not perfect. It is also better as wit.ai, but it is much easier to use as it has native python bindings.

The raw transcriptions files are available at:

* https://friendlyuser.github.io/assets/code/witai.json
* https://friendlyuser.github.io/assets/code/whispers.json
* https://friendlyuser.github.io/assets/code/youtube_video.json

The code I used is available at https://github.com/dli-invest/fdrtt/commit/ca74636cbc881a3f34a9753b19c216f9ea35c7a8

and more whispers documentation is available at https://openai.com/blog/whisper/, the examples are pretty promising.