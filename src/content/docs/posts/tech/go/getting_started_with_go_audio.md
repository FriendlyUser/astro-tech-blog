---
tags: ['go']
title: "Processing WAV audio in Go with go-audio"
description: "Read a WAV file with go-audio/wav, apply gain and a low-pass filter, find the dominant frequency with a gonum FFT, and write the result back to WAV."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/323056288.webp
---

:::note
An earlier version of this post described a `github.com/goaudio/goaudio` library with MP3
encoding, biquad filters and an FFT package. That module doesn't exist. This revision uses the
real [go-audio](https://github.com/go-audio) packages, which the original code was closest to,
plus [gonum](https://www.gonum.org/) for the FFT.
:::

[go-audio/wav](https://github.com/go-audio/wav) decodes and encodes PCM WAV files in pure Go.
It gives you the samples as an `*audio.IntBuffer` (interleaved `[]int` plus sample rate and
channel count), and what you do with those samples is up to you. It doesn't do filtering,
resampling or MP3, so for anything beyond reading and writing WAV you either write the DSP
yourself or pull in another package.

This post builds one small program that:

1. reads `input.wav`,
2. prints the dominant frequency of the first channel,
3. applies a low-pass filter and doubles the volume,
4. writes `output.wav`.

## Setup

```bash
go mod init example.com/wavdemo
go get github.com/go-audio/wav gonum.org/v1/gonum
```

The code uses the `min` and `max` builtins, so it needs Go 1.21 or newer. It assumes a
16-bit or 24-bit PCM input file.

## The program

```go
package main

import (
	"fmt"
	"log"
	"math"
	"math/cmplx"
	"os"

	"github.com/go-audio/wav"
	"gonum.org/v1/gonum/dsp/fourier"
)

func main() {
	in, err := os.Open("input.wav")
	if err != nil {
		log.Fatal(err)
	}
	defer in.Close()

	dec := wav.NewDecoder(in)
	if !dec.IsValidFile() {
		log.Fatal("input.wav is not a valid WAV file")
	}
	buf, err := dec.FullPCMBuffer() // loads the whole file into memory
	if err != nil {
		log.Fatal(err)
	}

	channels := buf.Format.NumChannels
	rate := buf.Format.SampleRate
	bits := int(dec.BitDepth)
	fmt.Printf("%d Hz, %d channel(s), %d-bit, %d frames\n",
		rate, channels, bits, buf.NumFrames())

	if buf.NumFrames() >= 4096 {
		fmt.Printf("dominant frequency: %.1f Hz\n",
			peakFrequency(buf.Data, channels, rate, 4096))
	}

	lowPass(buf.Data, channels, rate, 500)

	// Double the volume, clamping to the range of the source bit depth.
	hi := 1<<(bits-1) - 1
	lo := -(1 << (bits - 1))
	for i, v := range buf.Data {
		buf.Data[i] = min(max(v*2, lo), hi)
	}

	out, err := os.Create("output.wav")
	if err != nil {
		log.Fatal(err)
	}
	defer out.Close()

	enc := wav.NewEncoder(out, rate, bits, channels, int(dec.WavAudioFormat))
	if err := enc.Write(buf); err != nil {
		log.Fatal(err)
	}
	// Close writes the final chunk sizes into the header; don't skip it.
	if err := enc.Close(); err != nil {
		log.Fatal(err)
	}
}

// lowPass applies a one-pole low-pass filter in place to interleaved samples.
func lowPass(data []int, channels, sampleRate int, cutoff float64) {
	rc := 1 / (2 * math.Pi * cutoff)
	dt := 1 / float64(sampleRate)
	alpha := dt / (rc + dt)

	prev := make([]float64, channels)
	for i, v := range data {
		ch := i % channels
		prev[ch] += alpha * (float64(v) - prev[ch])
		data[i] = int(math.Round(prev[ch]))
	}
}

// peakFrequency runs an FFT over the first n frames of channel 0 and returns
// the frequency (in Hz) of the strongest non-DC bin.
func peakFrequency(data []int, channels, sampleRate, n int) float64 {
	seq := make([]float64, n)
	for i := range seq {
		seq[i] = float64(data[i*channels])
	}

	fft := fourier.NewFFT(n)
	coeffs := fft.Coefficients(nil, seq) // n/2+1 complex values

	peak := 1 // index 0 is the DC offset
	for i := 2; i < len(coeffs); i++ {
		if cmplx.Abs(coeffs[i]) > cmplx.Abs(coeffs[peak]) {
			peak = i
		}
	}
	// Freq returns cycles per sample; scale by the sample rate for Hz.
	return fft.Freq(peak) * float64(sampleRate)
}
```

Run it with `go run .` next to an `input.wav`.

## How the pieces work

**Decoding.** `wav.NewDecoder` takes an `io.ReadSeeker` (an `*os.File` works).
`FullPCMBuffer` returns every sample as an `int` in interleaved order: for stereo,
`Data[0]` is left, `Data[1]` is right, `Data[2]` is left again, and so on. That's why both
helper functions use `i % channels` or `i*channels` to stay on one channel.

**Gain.** Samples are integers in the range of the source bit depth (−32768 to 32767 for
16-bit). Multiplying without clamping wraps around and produces loud clicks, so the loop
clamps to that range.

**Low-pass filter.** This is the simplest IIR filter: each output moves a fraction `alpha` of
the way from the previous output toward the new input. It rolls off gently (6 dB per octave),
so 500 Hz here means "noticeably duller", not a hard cutoff. For steeper filters you'd
implement a biquad, but the structure is the same: keep per-channel state and walk the
interleaved samples.

**FFT.** gonum's `fourier.NewFFT(n)` works on real input and returns `n/2+1` coefficients.
Bin `i` corresponds to `fft.Freq(i) * sampleRate` Hz, so with 4096 samples at 44.1 kHz each bin
is about 10.8 Hz wide. Use a larger `n` for finer resolution, and apply a window (Hann, for
example) if you need accurate magnitudes rather than just the peak.

**Encoding.** `wav.NewEncoder(w, sampleRate, bitDepth, numChans, audioFormat)` needs an
`io.WriteSeeker`, because `Close` seeks back to fill in the header sizes. Passing the
decoder's `WavAudioFormat` keeps the output format the same as the input (1 means PCM).

## Gotchas

- `FullPCMBuffer` reads the whole file into memory. For long recordings, read in chunks with
  `dec.PCMBuffer(buf)` and process each chunk, carrying the filter state across chunks.
- go-audio has no MP3 support. To read MP3, look at a decoder such as
  [hajimehoshi/go-mp3](https://github.com/hajimehoshi/go-mp3); for writing MP3 you'll
  generally shell out to `ffmpeg` or `lame`.
- 8-bit WAV samples are unsigned, so the clamping range above doesn't apply to them.

## Further reading

- [go-audio/wav on pkg.go.dev](https://pkg.go.dev/github.com/go-audio/wav)
- [go-audio/audio buffer types](https://pkg.go.dev/github.com/go-audio/audio)
- [gonum dsp/fourier](https://pkg.go.dev/gonum.org/v1/gonum/dsp/fourier)
