---
title: Simple web app to transcribe audio
description: Transcribing audio with python using openai and whispers
alt: Applying nlp to various youtube videos
pubDate: Friday, 5 March 2023 13:00:00 GMT
tags: ["whisper", "gradio", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-14 22.06.43 - blank book open on the coffee table.png'
imgAlt: 'rbc stock analyzer'
---

## Summary

Audio transcription is the process of converting speech in an audio recording into written text. This can be useful in a variety of situations, such as when a person wants to search for a specific word or phrase within an audio recording, or when a person wants to make the content of an audio recording more accessible to people who are deaf or hard of hearing. Audio transcription can also be useful for creating written records of meetings, interviews, and other events that are recorded in audio form. In general, audio transcription can help to make the information in audio recordings more easily accessible and searchable.


Audio transcription can be useful for transcribing investor calls, which are typically audio recordings of meetings or conference calls where company executives discuss the company's financial performance and outlook with investors. Transcribing these calls can make the information contained in them more easily accessible and searchable, which can be helpful for investors who want to review the information discussed in the calls at a later date. 

The contents of requirements.txt are as follows:
```
whispers
git+https://github.com/openai/whisper.git
```

```python
import whisper
import gradio as gr


def get_text_from_mp3_whisper(mp3_file: str)->str:
    model = whisper.load_model("base")
    # options = whisper.DecodingOptions(language="en", without_timestamps=True)
    result = model.transcribe(mp3_file)
    return result.get("text", "No text found"), result.get("segments", {})
    
    
 
gr.Interface(
    title = 'OpenAI Whisper Transcribe audio files to text', 
    fn=get_text_from_mp3_whisper, 
    inputs=[
        gr.inputs.Audio(type="filepath")
    ],
    outputs=[
        "textbox", "json"
    ],
    live=True).launch()
```

This code uses the whisper and gradio libraries to create an interface for transcribing audio files. The get_text_from_mp3_whisper function uses the whisper library to load a model and transcribe the audio file at the given filepath. The transcription results are returned as text and a JSON object. The gradio library is then used to create an interface that allows users to input an audio file and see the transcription results. The interface also has a live mode, which allows users to see the transcription results as they are being generated.

## References 

This app is hosted on hugging space

See https://huggingface.co/spaces/FriendlyUser/whisper_demo