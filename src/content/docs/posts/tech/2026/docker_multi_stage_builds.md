---
title: "Smaller Docker images with multi-stage builds"
description: "Split a Dockerfile into builder and runtime stages: COPY --from, slim and distroless bases, BuildKit cache mounts, .dockerignore, and how to check what an image contains."
tags: ["Docker", "Dockerfile", "Containers", "BuildKit", "DevOps"]
pubDate: "2026-03-21T16:00:00.000Z"
imgSrc: "/imgs/2026/docker_multi_stage_builds.webp"
imgAlt: "A tall builder stage of stacked layers with an arrow carrying one small artifact into a short runtime stage, labelled COPY --from=build"
---

A multi-stage Dockerfile has more than one `FROM`. Each `FROM` starts a new stage with its own base image, and later stages can copy files out of earlier ones. The point is to build your application in a stage that has compilers, package managers and headers, then copy only the result into a small runtime stage. The final image ships without any of the build tooling.

That makes images smaller, which means faster pulls and deploys. It also means fewer packages for a vulnerability scanner to flag, and nothing like a compiler left lying around for an attacker to use. This post walks through two examples, a compiled binary on a distroless base and an interpreted web app on a slim base, and then covers cache mounts, `.dockerignore` and how to check the result. The Dockerfiles use BuildKit, the default builder since Docker Engine 23.0.

## The single-stage problem

A typical first Dockerfile for a compiled service looks like this:

```dockerfile
FROM golang:1.25
WORKDIR /src
COPY . .
RUN go build -o /server .
CMD ["/server"]
```

It works, but the image contains the whole Go toolchain, the module cache, the source code and a Debian userland, all to run one static binary. The official toolchain images are hundreds of megabytes; the binary is usually a few.

## Example 1: a static binary on distroless

Here is a tiny HTTP server using only the standard library:

```go
// main.go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "hello from a distroless image")
	})
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

```text
// go.mod
module example.com/server

go 1.25
```

And the multi-stage Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.25 AS build
WORKDIR /src
# Dependencies first, so this layer is reused until go.mod/go.sum change
COPY go.* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

What each piece does:

- **`AS build`** names the stage so later stages can refer to it. Without a name you would have to use its index (`--from=0`), which breaks when stages are reordered.
- **`COPY go.* ./` before `COPY . .`** is the classic layer-caching trick. The dependency download only reruns when `go.mod` or `go.sum` changes, not on every source edit.
- **`CGO_ENABLED=0`** produces a statically linked binary that doesn't need the C library, so it can run on an image with no libc at all.
- **`gcr.io/distroless/static-debian12:nonroot`** is one of Google's distroless images: CA certificates, time zone data, `/etc/passwd` entries and little else. There is no shell and no package manager. The `nonroot` tag sets the default user to UID 65532, so the server doesn't run as root. The `debian12` in the name is the Debian release the image is built from; distroless supports the previous release for about a year after a new Debian release, so check the README for the current one.
- **`COPY --from=build`** copies the one file the runtime needs. Everything else in the build stage is discarded from the final image.

Build and run it:

```bash
docker build -t hello-server .
docker run --rm -p 8080:8080 hello-server
```

## Example 2: an interpreted app on a slim base

For languages that need a runtime, distroless is less convenient, and a "slim" image of the same runtime is the usual choice. The build stage installs dependencies into a virtual environment, and the runtime stage copies just that environment.

The app is a minimal FastAPI service in `app.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root() -> dict:
    return {"status": "ok"}
```

`requirements.txt` lists `fastapi` and `uvicorn`; pin exact versions in a real project. The Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.13-slim AS build
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

FROM python:3.13-slim
RUN useradd --system --uid 10001 app
COPY --from=build /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY app.py .
USER app
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

The details that make this work:

- **Same base image in both stages.** A virtual environment contains absolute paths and links to the interpreter that created it. Copying it to the same path on an image with the same Python version keeps those valid. Mixing, for example, a full `python:3.13` builder with a different minor version at runtime gives you a broken environment, and compiled extensions built against one libc won't load on another.
- **The build stage is where compilers would go.** If a dependency has no prebuilt wheel, add `apt-get install build-essential` to the build stage. The runtime stage never sees it.
- **Application code comes last.** Editing `app.py` only invalidates the final `COPY`, not the dependency install.

## BuildKit cache mounts

`RUN --mount=type=cache,target=...` mounts a directory that persists between builds on the same builder but is **not** stored in the image layer. Package managers keep their download caches there:

| Tool | Cache mount target |
|---|---|
| pip | `/root/.cache/pip` |
| Go modules and build cache | `/go/pkg/mod`, `/root/.cache/go-build` |
| npm | `/root/.npm` |

The difference from layer caching: when `requirements.txt` changes, the layer is rebuilt from scratch, but with a cache mount, pip still finds the previously downloaded packages and only fetches what is new. It also means you don't need `--no-cache-dir` to keep the cache out of the image.

Cache mounts need the `# syntax=docker/dockerfile:1` line or a recent BuildKit. They live on the builder, so in CI, where each job typically starts with a fresh builder, they are usually empty. Exporting the build cache (for example `docker buildx build --cache-to type=gha` on GitHub Actions) brings back the image layers, but not the contents of cache mounts.

## .dockerignore

`COPY . .` sends everything in the build context unless `.dockerignore` excludes it. Without one, the context can include `.git`, local virtual environments, `node_modules`, test data and `.env` files with secrets. That makes builds slower, can invalidate the cache on every commit, and can leak files into the image:

```text
# .dockerignore
.git
.venv
__pycache__
node_modules
*.log
.env
Dockerfile
.dockerignore
```

Treat it like `.gitignore` but stricter: anything not needed by a `COPY` instruction can go.

## Checking the result

Compare sizes with:

```bash
docker image ls hello-server
docker history hello-server
```

`docker history` lists each layer with the instruction that created it and its size. On the distroless image you should see the base layers and one layer for the copied binary. A layer of hundreds of megabytes in a final image usually means a `COPY` brought in more than intended, or a build tool ended up in the runtime stage.

A few other useful commands:

- **`docker build --target build -t hello-build .`** builds only up to the named stage. Handy for debugging the build environment, or for a test stage that runs your test suite.
- **`docker build --check .`** runs Dockerfile lint rules without building, such as mismatched casing between `FROM` and `AS`, or a `CMD` in shell form where the exec (JSON array) form is recommended.
- **[dive](https://github.com/wagoodman/dive)**, a third-party tool, shows the files added in each layer, which makes it easy to spot what is taking up space.

## Gotchas

- **No shell in distroless.** `docker exec -it container sh` doesn't work. Distroless publishes `:debug` tags that include a BusyBox shell for troubleshooting. Use them temporarily, not in production.
- **Static binaries still need CA certificates and time zones** for HTTPS and `time.LoadLocation`. `distroless/static` includes both; `FROM scratch` does not, so you would have to copy them in yourself.
- **Alpine is not a drop-in slim image.** It uses musl instead of glibc. Prebuilt wheels and binaries built for glibc may not work, and builds that compile from source can be slower. Pick it deliberately.
- **`COPY --from` can reference any image**, not just a stage, such as `COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/`. Pin a version or digest when you do, or the build changes whenever that image is updated.
- **Secrets don't belong in `ARG` or `ENV`.** Values set that way stay in the image metadata. Use `RUN --mount=type=secret` for tokens needed during the build.

## Further reading

- [Docker docs: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker docs: Optimize cache usage in builds](https://docs.docker.com/build/cache/optimize/)
- [Docker docs: Dockerfile reference, RUN --mount](https://docs.docker.com/reference/dockerfile/#run---mount)
- [GoogleContainerTools/distroless](https://github.com/GoogleContainerTools/distroless)
