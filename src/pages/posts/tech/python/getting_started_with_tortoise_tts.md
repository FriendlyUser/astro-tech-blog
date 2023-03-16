---
tags: ['python', 'tortoise_tts']
title: Tortoise TTS: A Multi-Voice Text-to-Speech System
description: Text-to-speech (TTS) is a technology that converts text into natural-sounding speech using natural language processing (NLP) and speech synthesis techniques.
pubDate: Fri, 15 April 2023
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3750534419.png"
---

# Tortoise TTS: A Multi-Voice Text-to-Speech System

Text-to-speech (TTS) is a technology that converts text into natural-sounding speech using natural language processing (NLP) and speech synthesis techniques. TTS can have various applications, such as:

- Enhancing accessibility for people with visual impairments or reading difficulties
- Providing voice assistance for smart devices or chatbots
- Creating audio content for podcasts, audiobooks, or videos
- Generating realistic voices for animation, gaming, or entertainment

However, most TTS systems are limited by their single-voice capability, meaning that they can only produce speech in one predefined voice. This can be problematic for scenarios where multiple voices are needed or desired, such as:

- Expressing different emotions or personalities
- Adapting to different languages or accents
- Mimicking specific speakers or celebrities
- Personalizing voice preferences or styles

To address this challenge, tortoise_tts is a project that aims to create a multi-voice TTS system that can generate speech in various voices based on a small set of voice samples. The project is hosted on GitHub at https://github.com/neonbjb/tortoise-tts.

## Project Overview

The project is developed by James Betker, a researcher and developer who specializes in speech-related technologies. The project's goal is to create a TTS system that can achieve strong multi-voice capabilities and highly realistic prosody and intonation.

The system leverages two main components: an autoregressive decoder and a diffusion decoder. The autoregressive decoder is responsible for generating mel-spectrograms from text using an attention-based sequence-to-sequence model. The diffusion decoder is responsible for converting mel-spectrograms into raw audio waveforms using a denoising diffusion probabilistic model.

The system also uses two auxiliary models: a conditioning latent vector predictor (CLVP) and a conditioning latent vector perturbator (CVVP). The CLVP is responsible for generating conditioning latent vectors from voice samples using an encoder-decoder model. The conditioning latent vectors are used to guide the autoregressive decoder to produce mel-spectrograms in different voices. The CVVP is responsible for perturbing conditioning latent vectors using an adversarial network. The perturbed conditioning latent vectors are used to introduce variations in pitch,
tone,
and timbre of the generated speech.

The system allows users to customize their speech output by choosing different options such as:

- Text: The input text to be converted into speech
- Voice: The reference voice samples to be used for voice cloning
- Preset: The speed-quality trade-off of the generation process (fast,
medium,
or slow)
- Format: The output format of the generated speech (wav,
mp3,
or ogg)

## Project Examples

Here are some examples of tortoise_tts's output using different texts and voices: The sample clips may not work at this time of writing.

Text: "Hello world! This is tortoise tts speaking."
Voice: Random
Preset: Fast
Format: Wav

[Listen here](https://huggingface.co/spaces/mdnestor/tortoise?audio=hello-world-random-fast.wav)

Text: "I'm sorry Dave, I'm afraid I can't do that."
Voice: HAL 9000 from 2001: A Space Odyssey
Preset: Medium
Format: Mp3

[Listen here](https://huggingface.co/spaces/mdnestor/tortoise?audio=hal9000-medium.mp3)

Text: "To be, or not to be? That is the question."
Voice: William Shakespeare from Eleven Labs Voice Cloning Demo
Preset: Slow
Format: Ogg

[Listen here](https://huggingface.co/spaces/mdnestor/tortoise?audio=shakespeare-slow.ogg)

## Project Limitations

Tortoise tts is still a work in progress and has some limitations, such as:

- Slow generation speed due to the use of both autoregressive and diffusion decoders
- High computational cost due to the use of large models and multiple components
- Variable quality depending on the input text and voice samples


This blog post was generated with bing gpt.

Source: Conversation with Bing, 3/16/2023(1) GitHub - neonbjb/tortoise-tts: A multi-voice TTS system trained with an .... https://github.com/neonbjb/tortoise-tts Accessed 3/16/2023.
(2) ken2ki/tortoise · Hugging Face. https://huggingface.co/ken2ki/tortoise Accessed 3/16/2023.
(3) jbetker/tortoise-tts-v2 · Hugging Face. https://huggingface.co/jbetker/tortoise-tts-v2 Accessed 3/16/2023.
(4) GitHub - Fictiverse/tortoise-tts-Windows: A multi-voice TTS system .... https://github.com/Fictiverse/tortoise-tts-Windows Accessed 3/16/2023.
(5) Tortoise TTS - a Hugging Face Space by mdnestor. https://huggingface.co/spaces/mdnestor/tortoise Accessed 3/16/2023.