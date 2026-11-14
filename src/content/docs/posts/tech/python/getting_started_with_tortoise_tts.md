---
tags: ['python', 'tortoise_tts', 'tortoise-tts']
title: "Tortoise TTS: how it works and how to generate speech in a cloned voice"
description: How the Tortoise text-to-speech model turns text and a few reference clips into speech, and how to run it from the command line or Python.
pubDate: Fri, 15 April 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3750534419.png"
---

[Tortoise](https://github.com/neonbjb/tortoise-tts) is an open-source text-to-speech model by James Betker. It can speak in many voices: you give it a few short clips of a speaker, and it generates new speech that imitates that voice. It's known for natural prosody and intonation, and for being slow (hence the name).

## How it works

Tortoise chains several models together:

1. **Conditioning.** The reference clips are turned into mel spectrograms and encoded into a single conditioning vector that describes the voice.
2. **Autoregressive transformer.** A GPT-style model takes the text and the voice conditioning, and samples many candidate sequences of discrete speech tokens.
3. **CLVP reranking.** CLVP is a contrastive model trained on text and speech tokens, similar to CLIP for images. It scores how well each candidate matches the text, and only the best few are kept. A second model, CVVP, can also influence the choice through the `cvvp_amount` parameter.
4. **Diffusion decoder.** For each kept candidate, a diffusion model turns the transformer's latents into a mel spectrogram.
5. **Vocoder.** UnivNet converts the mel spectrogram into a 24 kHz waveform.

Sampling many candidates and then running diffusion is what makes Tortoise sound good and also what makes it slow. The presets trade the two off by changing the number of autoregressive samples and diffusion steps:

| Preset | Autoregressive samples | Diffusion iterations |
| --- | --- | --- |
| `ultra_fast` | 16 | 30 |
| `fast` | 96 | 80 |
| `standard` | 256 | 200 |
| `high_quality` | 256 | 400 |

## Running it

Install the package (a CUDA-capable GPU is strongly recommended):

```bash
pip install tortoise-tts
```

The repo includes a CLI script. `--voice` takes the name of a voice folder, or `random` for a randomly generated voice:

```bash
python tortoise/do_tts.py --text "I'm going to speak this" --voice random --preset fast
```

From Python, load a voice's reference clips and generate audio with a preset:

```python
import torchaudio
from tortoise.api import TextToSpeech
from tortoise.utils.audio import load_voice

tts = TextToSpeech()

# "geralt" is one of the voices bundled in tortoise/voices
voice_samples, conditioning_latents = load_voice("geralt")

gen = tts.tts_with_preset(
    "Hello world! This is Tortoise speaking.",
    voice_samples=voice_samples,
    conditioning_latents=conditioning_latents,
    preset="fast",
)
torchaudio.save("generated.wav", gen.squeeze(0).cpu(), 24000)
```

The model weights are downloaded the first time you create `TextToSpeech()`. Output is a 24 kHz WAV file.

To use your own voice, add a folder of short, clean WAV clips of one speaker under `tortoise/voices/<name>/`, or pass extra folders with the `extra_voice_dirs` argument of `load_voice`. Then use `<name>` as the voice.

## Limitations

- **Speed.** Even the `ultra_fast` preset samples many candidates and runs diffusion. It's far slower than single-pass TTS models, so it suits pre-rendered audio better than real-time use.
- **Hardware.** It's practical on a GPU. On a CPU, generation is very slow.
- **Quality varies with the reference clips.** Noisy or very short clips, or clips that mix speakers, produce worse voices.
- **Packaging.** The latest PyPI release of `tortoise-tts` is 3.0.0, from October 2023. If you run into dependency problems with current PyTorch versions, install from the GitHub repo instead.
- **Misuse.** Voice cloning can be used to impersonate people. Only clone voices you have permission to use.

## Further reading

- [tortoise-tts on GitHub](https://github.com/neonbjb/tortoise-tts) (README and `voice_customization_guide.md`)
- [Better speech synthesis through scaling](https://arxiv.org/abs/2305.07243), the paper describing the model
- [Hugging Face Spaces demo](https://huggingface.co/spaces/Manmay/tortoise-tts) linked from the README
