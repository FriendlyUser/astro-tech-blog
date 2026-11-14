---
description: A complete C++ program that uses FFmpeg's libavformat and libavcodec to decode a video stream and re-encode it to H.264 in an MP4 file.
imgSrc: /imgs/2023/1047200128.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-05T01:45:04.000Z'
lastUpdated: 2026-11-14
tags: ["cpp", "ffmpeg"]
title: Transcoding a video to H.264 with the FFmpeg libraries in C++
---

:::caution
The first version of this post used `av_register_all()`, stack-allocated `AVPacket`s and non-const `AVCodec *` pointers. `av_register_all()` was deprecated in FFmpeg 4.0 and removed in 5.0, and the others no longer compile cleanly against current FFmpeg. The code below uses the current API.
:::

The `ffmpeg` command-line tool is built on a set of C libraries: libavformat reads and writes containers (MP4, MKV, AVI), libavcodec decodes and encodes, and libavutil holds shared helpers. Calling them directly from C++ lets you transcode inside your own program. This post builds a small tool that takes the main video stream from any input FFmpeg can read and re-encodes it to H.264 in an MP4.

## The steps

1. Open the input and find the video stream (libavformat).
2. Open a decoder for that stream (libavcodec).
3. Create the output container and an H.264 encoder.
4. Write the container header.
5. Loop: read a packet, send it to the decoder, take decoded frames, send them to the encoder, write the encoded packets.
6. Flush the decoder and encoder, then write the trailer.

Step 6 is the one people forget. Decoders and encoders buffer frames internally, so without flushing the last frames never reach the file.

## The program

```cpp
extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/opt.h>
}

#include <cstdio>
#include <cstdlib>

// Print FFmpeg's error message and exit if ret is negative.
static void check(int ret, const char *what) {
    if (ret < 0) {
        char msg[AV_ERROR_MAX_STRING_SIZE];
        av_strerror(ret, msg, sizeof msg);
        std::fprintf(stderr, "%s: %s\n", what, msg);
        std::exit(1);
    }
}

// Send one frame (or nullptr to flush) to the encoder and write every
// packet it produces to the output file.
static void encodeAndWrite(AVCodecContext *enc, AVFrame *frame,
                           AVFormatContext *ofmt, AVStream *ost, AVPacket *pkt) {
    check(avcodec_send_frame(enc, frame), "avcodec_send_frame");
    while (true) {
        int ret = avcodec_receive_packet(enc, pkt);
        if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) return;
        check(ret, "avcodec_receive_packet");
        pkt->stream_index = ost->index;
        av_packet_rescale_ts(pkt, enc->time_base, ost->time_base);
        check(av_interleaved_write_frame(ofmt, pkt), "av_interleaved_write_frame");
    }
}

int main(int argc, char **argv) {
    if (argc != 3) {
        std::fprintf(stderr, "usage: %s <input> <output.mp4>\n", argv[0]);
        return 1;
    }
    const char *inPath = argv[1];
    const char *outPath = argv[2];

    // 1. Open the input and pick its main video stream.
    AVFormatContext *ifmt = nullptr;
    check(avformat_open_input(&ifmt, inPath, nullptr, nullptr), "avformat_open_input");
    check(avformat_find_stream_info(ifmt, nullptr), "avformat_find_stream_info");

    const AVCodec *decoder = nullptr;
    int videoIdx = av_find_best_stream(ifmt, AVMEDIA_TYPE_VIDEO, -1, -1, &decoder, 0);
    check(videoIdx, "av_find_best_stream");
    AVStream *ist = ifmt->streams[videoIdx];

    // 2. Open a decoder for that stream.
    AVCodecContext *dec = avcodec_alloc_context3(decoder);
    check(avcodec_parameters_to_context(dec, ist->codecpar), "avcodec_parameters_to_context");
    dec->pkt_timebase = ist->time_base;
    check(avcodec_open2(dec, decoder, nullptr), "open decoder");

    // 3. Create the output container (format guessed from the file name)
    //    and an H.264 encoder.
    AVFormatContext *ofmt = nullptr;
    check(avformat_alloc_output_context2(&ofmt, nullptr, nullptr, outPath),
          "avformat_alloc_output_context2");

    const AVCodec *encoder = avcodec_find_encoder(AV_CODEC_ID_H264);
    if (!encoder) {
        std::fprintf(stderr, "No H.264 encoder found (FFmpeg built without libx264?)\n");
        return 1;
    }
    AVCodecContext *enc = avcodec_alloc_context3(encoder);
    enc->width = dec->width;
    enc->height = dec->height;
    enc->sample_aspect_ratio = dec->sample_aspect_ratio;
    enc->pix_fmt = dec->pix_fmt;  // assumes the encoder accepts it, e.g. yuv420p
    enc->time_base = ist->time_base;
    enc->framerate = av_guess_frame_rate(ifmt, ist, nullptr);
    if (ofmt->oformat->flags & AVFMT_GLOBALHEADER) {
        enc->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
    }
    av_opt_set(enc->priv_data, "crf", "23", 0);  // libx264 quality setting
    check(avcodec_open2(enc, encoder, nullptr), "open encoder");

    AVStream *ost = avformat_new_stream(ofmt, nullptr);
    check(avcodec_parameters_from_context(ost->codecpar, enc), "avcodec_parameters_from_context");
    ost->time_base = enc->time_base;

    // 4. Open the output file and write the container header.
    if (!(ofmt->oformat->flags & AVFMT_NOFILE)) {
        check(avio_open(&ofmt->pb, outPath, AVIO_FLAG_WRITE), "avio_open");
    }
    check(avformat_write_header(ofmt, nullptr), "avformat_write_header");

    // 5. Read packets, decode them to frames, re-encode and write.
    AVPacket *inPkt = av_packet_alloc();
    AVPacket *outPkt = av_packet_alloc();
    AVFrame *frame = av_frame_alloc();

    auto drainDecoder = [&]() {
        while (true) {
            int ret = avcodec_receive_frame(dec, frame);
            if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) return;
            check(ret, "avcodec_receive_frame");
            frame->pts = frame->best_effort_timestamp;
            frame->pict_type = AV_PICTURE_TYPE_NONE;  // let the encoder choose
            encodeAndWrite(enc, frame, ofmt, ost, outPkt);
            av_frame_unref(frame);
        }
    };

    while (av_read_frame(ifmt, inPkt) >= 0) {
        if (inPkt->stream_index == videoIdx) {
            check(avcodec_send_packet(dec, inPkt), "avcodec_send_packet");
            drainDecoder();
        }
        av_packet_unref(inPkt);
    }

    // 6. Flush the decoder and the encoder, then finish the file.
    check(avcodec_send_packet(dec, nullptr), "flush decoder");
    drainDecoder();
    encodeAndWrite(enc, nullptr, ofmt, ost, outPkt);
    check(av_write_trailer(ofmt), "av_write_trailer");

    av_frame_free(&frame);
    av_packet_free(&inPkt);
    av_packet_free(&outPkt);
    avcodec_free_context(&dec);
    avcodec_free_context(&enc);
    avformat_close_input(&ifmt);
    if (!(ofmt->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&ofmt->pb);
    }
    avformat_free_context(ofmt);
    return 0;
}
```

## Build and run

With the FFmpeg development packages installed (`libavformat-dev` and `libavcodec-dev` on Debian/Ubuntu, `ffmpeg` on Homebrew), `pkg-config` supplies the flags:

```bash
g++ -std=c++17 -Wall -o transcode transcode.cpp \
    $(pkg-config --cflags --libs libavformat libavcodec libavutil)
./transcode input.avi output.mp4
```

## Details worth knowing

- **Send/receive is not one-to-one.** One packet can produce zero, one or several frames, and the encoder may hold frames back before emitting packets. That's why both sides loop until they get `AVERROR(EAGAIN)`, and why the first version of this post, which called `avcodec_receive_packet` exactly once per frame, would drop data.
- **Timestamps need rescaling.** The encoder works in its own `time_base`. The muxer can change the stream's `time_base` in `avformat_write_header` (MP4 usually does), so packets are converted with `av_packet_rescale_ts` just before writing.
- **`AV_CODEC_FLAG_GLOBAL_HEADER`.** MP4 and MKV store codec setup data once in the container header rather than in the stream, so the encoder must be told before it's opened.
- **Pixel formats.** The encoder is given the decoder's pixel format. That's fine for typical `yuv420p` sources, but if the encoder doesn't support the input's format, `avcodec_open2` fails and you need to convert frames with libswscale first.
- **Only video is kept.** Audio, subtitle and data streams are skipped. To keep audio without re-encoding it, add a second output stream, copy its `codecpar` with `avcodec_parameters_copy`, and write its packets directly after rescaling their timestamps.
- **H.264 needs an encoder library.** `avcodec_find_encoder(AV_CODEC_ID_H264)` returns libx264 (or another H.264 encoder) only if your FFmpeg build includes one.

For a fuller version that handles every stream and runs frames through a filter graph, see `transcode.c` in FFmpeg's [official examples](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples). The [libavcodec send/receive API docs](https://ffmpeg.org/doxygen/trunk/group__lavc__encdec.html) explain the encode/decode loop in detail.
