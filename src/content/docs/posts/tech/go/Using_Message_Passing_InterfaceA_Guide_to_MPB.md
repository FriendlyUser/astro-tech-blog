---
title: "Using MPI from Go: a parallel sum with gompi and Open MPI"
pubDate: "2023-05-30T19:37:46.030Z"
lastUpdated: 2026-11-14
description: "Call the Message Passing Interface from Go with the gompi Open MPI wrapper: start MPI, get ranks, broadcast data, reduce partial sums and run with mpirun."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

:::caution
An earlier version of this post described an "MPB (Message Passing Bridge)" library at `github.com/btracey/go-mpb`. That package does not exist, and its code would not compile. The post now uses [`github.com/sbromberger/gompi`](https://github.com/sbromberger/gompi), a maintained cgo wrapper around Open MPI.
:::

MPI (Message Passing Interface) is the standard API for running one program as many cooperating processes, often across the nodes of a cluster. Each process has a *rank* (0 to N-1), and processes exchange data with point-to-point calls (`Send`, `Recv`) and collective calls (`Bcast`, `Reduce`). Go has no MPI support in the standard library, so you use a wrapper around a C implementation.

Within a single machine, goroutines and channels are usually the simpler choice. MPI earns its keep when the work has to span several machines, or when you need to fit into an existing HPC job scheduler that launches programs with `mpirun`.

## Prerequisites

- Linux or macOS. gompi's README states it does not work on Windows.
- Open MPI with its headers and the `mpirun` launcher (for example `apt install libopenmpi-dev openmpi-bin` on Debian/Ubuntu, or `brew install open-mpi`).
- A C compiler, since gompi uses cgo.
- Go 1.27 or later. gompi v0.3.0's `go.mod` requires it, because the API uses generic methods such as `comm.Recv[float64](...)`.

The code below was written against gompi v0.3.0.

## Setting up

```bash
mkdir mpi-sum && cd mpi-sum
go mod init example.com/mpi-sum
go get github.com/sbromberger/gompi@v0.3.0
```

The import path's last element is `gompi`, but the package name is `mpi`, so import it with an explicit name to keep things readable.

## A parallel sum

The program builds the numbers 1 to 4×N on rank 0, broadcasts them to every rank, has each rank sum its own chunk, and reduces the partial sums back to rank 0.

```go
package main

import (
	"fmt"
	"log"

	mpi "github.com/sbromberger/gompi"
)

func main() {
	m, err := mpi.Start()
	if err != nil {
		log.Fatal(err)
	}
	defer m.Stop()

	rank := m.WorldRank()
	size := m.WorldSize()
	comm := m.NewCommunicator(nil) // nil means all processes (MPI_COMM_WORLD)

	// Every rank needs a buffer of the same length for Bcast.
	const perRank = 4
	data := make([]int64, size*perRank)
	if rank == 0 {
		for i := range data {
			data[i] = int64(i + 1)
		}
	}
	comm.Bcast(data, 0)

	// Each rank sums its own contiguous chunk.
	var local int64
	for _, v := range data[rank*perRank : (rank+1)*perRank] {
		local += v
	}

	// Combine the partial sums on rank 0. dest must be allocated on every rank.
	total := make([]int64, 1)
	if err := comm.Reduce(total, []int64{local}, mpi.OpSum, 0); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("rank %d of %d: partial sum %d\n", rank, size, local)
	if rank == 0 {
		fmt.Printf("total: %d\n", total[0])
	}
}
```

A few things to note:

- `mpi.Start` calls `MPI_Init`, and `m.Stop` calls `MPI_Finalize`. No MPI calls are allowed after `Stop`.
- Collective calls such as `Bcast` and `Reduce` must be called by every rank in the communicator, with the same root and buffer lengths, or the program hangs.
- gompi's element types are fixed-size numbers (`int8`, `byte`, `int16`, `uint16`, `int32`, `uint32`, `int64`, `uint64`, `float32`, `float64`, `complex64`, `complex128`). Plain `int` is not accepted, which is why the example uses `int64`.
- Broadcasting the whole array is the simplest way to share it. MPI also has a scatter operation that sends each rank only its chunk, but gompi v0.3.0 does not wrap `MPI_Scatter`, so for large inputs you would use `Send`/`Recv` per rank or have each rank load its own slice of the data.

## Running it

Build the binary, then launch it with `mpirun`:

```bash
go build -o mpi-sum .
mpirun -n 4 ./mpi-sum
```

With four processes the data is 1 to 16, and rank 0 prints `total: 136`. The per-rank lines can appear in any order. If your machine has fewer cores than the `-n` value, Open MPI refuses to start unless you add `--oversubscribe`.

## Further reading

- [gompi on GitHub](https://github.com/sbromberger/gompi), including a migration guide from v0.2
- [Open MPI documentation](https://docs.open-mpi.org/)
