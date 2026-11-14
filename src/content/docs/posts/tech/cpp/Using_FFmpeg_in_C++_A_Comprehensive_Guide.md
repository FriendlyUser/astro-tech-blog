---
title: "FFmpeg in C++: decoding video frames and remuxing files with libav*"
pubDate: "2023-05-03T14:16:44.767Z"
lastUpdated: 2026-11-14
description: "Use FFmpeg's libavformat and libavcodec from C++ to decode video frames and copy streams into a new container, using the current send/receive API."
tags: ["ffmpeg", "cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2112480316.webp
---

The `ffmpeg` command-line tool is a thin front end over a set of C libraries you can call directly. Doing that from C++ makes sense when you need frame-level access inside your own program: feeding frames to a vision model, building a custom player, or writing files without shelling out.

This post covers two programs: one that decodes a video stream and prints per-frame information, and one that remuxes a file (copies its streams into a different container without re-encoding).

## The libraries

- **libavformat**: reads and writes containers (MP4, MKV, MPEG-TS, ...) and protocols. Demuxing and muxing live here.
- **libavcodec**: encoders and decoders.
- **libavutil**: shared helpers: frames, error codes, math, pixel format descriptors.
- **libswscale** / **libswresample**: pixel format conversion and scaling / audio resampling.
- **libavfilter**: the filter graph used by `ffmpeg -vf`.
- **libavdevice**: capture and playback devices.

## Setup

On Linux, install the development packages (for example `libavformat-dev libavcodec-dev libavutil-dev` on Debian/Ubuntu). On macOS, `brew install ffmpeg` includes the headers. On Windows, use vcpkg (`vcpkg install ffmpeg`) or a "shared" build from the links on the [FFmpeg download page](https://ffmpeg.org/download.html).

The libraries ship `pkg-config` files, so the simplest build is:

```sh
g++ -std=c++17 decode.cpp -o decode $(pkg-config --cflags --libs libavformat libavcodec libavutil)
```

With CMake:

```cmake
find_package(PkgConfig REQUIRED)
pkg_check_modules(FFMPEG REQUIRED IMPORTED_TARGET libavformat libavcodec libavutil)
target_link_libraries(decode PRIVATE PkgConfig::FFMPEG)
```

FFmpeg is a C library, so wrap its headers in `extern "C"` when including them from C++.

The examples use the API as it exists in FFmpeg 6.1 and later. Older tutorials (including the first version of this post) call `av_register_all()`, which was removed in FFmpeg 5.0, and put `AVPacket` on the stack with `av_init_packet()`, which is deprecated. Allocate packets with `av_packet_alloc()` instead.

## Decoding video frames

The program opens a file, picks the best video stream, and runs every packet through the decoder using the send/receive API: `avcodec_send_packet()` feeds compressed data in, and `avcodec_receive_frame()` is called until it returns `AVERROR(EAGAIN)` (needs more input) or `AVERROR_EOF` (fully drained). Sending a null packet at the end flushes frames the decoder is still holding.

The `unique_ptr` deleters make sure every FFmpeg object is freed on every early return.

```cpp
#include <iostream>
#include <memory>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
}

struct InputDeleter  { void operator()(AVFormatContext* c) const { avformat_close_input(&c); } };
struct CodecDeleter  { void operator()(AVCodecContext* c) const { avcodec_free_context(&c); } };
struct FrameDeleter  { void operator()(AVFrame* f) const { av_frame_free(&f); } };
struct PacketDeleter { void operator()(AVPacket* p) const { av_packet_free(&p); } };

// Send one packet (or nullptr to flush) and print every frame it produces.
static int decode_and_print(AVCodecContext* dec, const AVPacket* pkt, AVFrame* frame) {
    int ret = avcodec_send_packet(dec, pkt);
    if (ret < 0) return ret;

    while (true) {
        ret = avcodec_receive_frame(dec, frame);
        if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) return 0;
        if (ret < 0) return ret;

        std::cout << "pts=" << frame->pts
                  << " type=" << av_get_picture_type_char(frame->pict_type)
                  << " key=" << ((frame->flags & AV_FRAME_FLAG_KEY) ? 1 : 0)
                  << " size=" << frame->width << "x" << frame->height << '\n';
        av_frame_unref(frame);
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <input_file>\n";
        return 1;
    }

    AVFormatContext* raw_fmt = nullptr;
    if (avformat_open_input(&raw_fmt, argv[1], nullptr, nullptr) < 0) {
        std::cerr << "Could not open " << argv[1] << '\n';
        return 1;
    }
    std::unique_ptr<AVFormatContext, InputDeleter> fmt(raw_fmt);

    if (avformat_find_stream_info(fmt.get(), nullptr) < 0) {
        std::cerr << "Could not read stream info\n";
        return 1;
    }

    const AVCodec* codec = nullptr;
    int stream_idx = av_find_best_stream(fmt.get(), AVMEDIA_TYPE_VIDEO, -1, -1, &codec, 0);
    if (stream_idx < 0) {
        std::cerr << "No decodable video stream\n";
        return 1;
    }

    std::unique_ptr<AVCodecContext, CodecDeleter> dec(avcodec_alloc_context3(codec));
    if (!dec ||
        avcodec_parameters_to_context(dec.get(), fmt->streams[stream_idx]->codecpar) < 0 ||
        avcodec_open2(dec.get(), codec, nullptr) < 0) {
        std::cerr << "Could not open decoder\n";
        return 1;
    }

    std::unique_ptr<AVFrame, FrameDeleter> frame(av_frame_alloc());
    std::unique_ptr<AVPacket, PacketDeleter> pkt(av_packet_alloc());
    if (!frame || !pkt) return 1;

    while (av_read_frame(fmt.get(), pkt.get()) >= 0) {
        int ret = 0;
        if (pkt->stream_index == stream_idx) {
            ret = decode_and_print(dec.get(), pkt.get(), frame.get());
        }
        av_packet_unref(pkt.get());
        if (ret < 0) {
            std::cerr << "Decoding error\n";
            return 1;
        }
    }

    // Flush frames still buffered in the decoder.
    decode_and_print(dec.get(), nullptr, frame.get());
    return 0;
}
```

A few things that commonly trip people up:

- `pts` is in the stream's time base, not seconds. Multiply by `av_q2d(fmt->streams[stream_idx]->time_base)` to get seconds.
- `AVFrame::key_frame` and `AVCodecContext::frame_number` are deprecated; use `frame->flags & AV_FRAME_FLAG_KEY` and `frame_num`.
- `av_err2str()` is a macro that uses a C compound literal and does not compile as C++. Use `av_strerror()` with your own buffer, as in the next example.
- Decoded frames are usually in a YUV pixel format. Use libswscale (`sws_getContext` / `sws_scale`) to convert to RGB if you need it.

## Remuxing into another container

Remuxing changes the container (say, MKV to MP4) while copying the compressed audio and video packets untouched. It's fast because nothing is decoded. This is the library equivalent of `ffmpeg -i in.mkv -c copy out.mp4`, and follows the structure of FFmpeg's own [`remux.c` example](https://github.com/FFmpeg/FFmpeg/blob/master/doc/examples/remux.c).

```cpp
#include <iostream>
#include <vector>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/error.h>
}

static int remux(const char* in_name, const char* out_name,
                 AVFormatContext*& in_ctx, AVFormatContext*& out_ctx, AVPacket* pkt) {
    int ret = avformat_open_input(&in_ctx, in_name, nullptr, nullptr);
    if (ret < 0) return ret;
    if ((ret = avformat_find_stream_info(in_ctx, nullptr)) < 0) return ret;

    // The output format is guessed from the file extension.
    if ((ret = avformat_alloc_output_context2(&out_ctx, nullptr, nullptr, out_name)) < 0) return ret;

    // Map input stream indexes to output stream indexes; -1 means "drop".
    std::vector<int> stream_map(in_ctx->nb_streams, -1);
    int next_out = 0;
    for (unsigned i = 0; i < in_ctx->nb_streams; ++i) {
        const AVCodecParameters* par = in_ctx->streams[i]->codecpar;
        if (par->codec_type != AVMEDIA_TYPE_VIDEO &&
            par->codec_type != AVMEDIA_TYPE_AUDIO &&
            par->codec_type != AVMEDIA_TYPE_SUBTITLE) {
            continue;
        }
        AVStream* out_stream = avformat_new_stream(out_ctx, nullptr);
        if (!out_stream) return AVERROR(ENOMEM);
        if ((ret = avcodec_parameters_copy(out_stream->codecpar, par)) < 0) return ret;
        out_stream->codecpar->codec_tag = 0;  // let the muxer pick a tag valid for its container
        stream_map[i] = next_out++;
    }

    if (!(out_ctx->oformat->flags & AVFMT_NOFILE)) {
        if ((ret = avio_open(&out_ctx->pb, out_name, AVIO_FLAG_WRITE)) < 0) return ret;
    }
    if ((ret = avformat_write_header(out_ctx, nullptr)) < 0) return ret;

    while (av_read_frame(in_ctx, pkt) >= 0) {
        int out_index = stream_map[pkt->stream_index];
        if (out_index < 0) {
            av_packet_unref(pkt);
            continue;
        }
        AVStream* in_stream = in_ctx->streams[pkt->stream_index];
        AVStream* out_stream = out_ctx->streams[out_index];

        pkt->stream_index = out_index;
        av_packet_rescale_ts(pkt, in_stream->time_base, out_stream->time_base);
        pkt->pos = -1;

        // Takes ownership of the packet's data and resets pkt.
        if ((ret = av_interleaved_write_frame(out_ctx, pkt)) < 0) return ret;
    }

    return av_write_trailer(out_ctx);
}

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input_file> <output_file>\n";
        return 1;
    }

    AVFormatContext* in_ctx = nullptr;
    AVFormatContext* out_ctx = nullptr;
    AVPacket* pkt = av_packet_alloc();
    if (!pkt) return 1;

    int ret = remux(argv[1], argv[2], in_ctx, out_ctx, pkt);

    av_packet_free(&pkt);
    avformat_close_input(&in_ctx);
    if (out_ctx && !(out_ctx->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&out_ctx->pb);
    }
    avformat_free_context(out_ctx);

    if (ret < 0) {
        char err[AV_ERROR_MAX_STRING_SIZE];
        av_strerror(ret, err, sizeof(err));
        std::cerr << "Error: " << err << '\n';
        return 1;
    }
    return 0;
}
```

Two details matter here. Each container has its own time base, so `av_packet_rescale_ts()` converts timestamps before writing. And not every codec fits every container: copying a stream the target format can't hold makes `avformat_write_header()` fail, which is reported through the error message.

## Going further

Full transcoding (changing the codec or resolution) combines both programs: decode packets to frames, optionally scale or filter them, then encode with `avcodec_send_frame()` / `avcodec_receive_packet()` and mux the result. That is a lot more code; FFmpeg's [`transcode.c` example](https://github.com/FFmpeg/FFmpeg/blob/master/doc/examples/transcode.c) is the best reference.

If you just need to convert files and don't need frame access, calling the `ffmpeg` binary is usually simpler and less error-prone than linking the libraries.

## Further reading

- [FFmpeg API documentation](https://ffmpeg.org/doxygen/trunk/index.html)
- [Official examples in `doc/examples`](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples)
- [`APIchanges`](https://github.com/FFmpeg/FFmpeg/blob/master/doc/APIchanges): the log of added, deprecated and removed functions
