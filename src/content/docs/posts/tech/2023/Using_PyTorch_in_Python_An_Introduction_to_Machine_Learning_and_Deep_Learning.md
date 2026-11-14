---
description: PyTorch basics in one sitting. Create tensors, compute gradients with autograd, define an nn.Module, and train a small network with a standard training loop.
imgSrc: /imgs/2023/336369522.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-22T20:35:26.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "PyTorch basics: tensors, autograd and a first training loop"
---

PyTorch is an open-source deep learning library for Python. It was started at Meta (then Facebook) AI Research and has been governed by the PyTorch Foundation, part of the Linux Foundation, since 2022. You write models as ordinary Python code: each operation runs as soon as it's called, and PyTorch records the operations so it can compute gradients afterwards. That makes models easy to debug with `print` and a normal debugger. This post covers the four pieces you need before anything else: tensors, autograd, `nn.Module` and the training loop.

## Installation

```bash
pip install torch
```

On Linux, the default wheel from PyPI includes CUDA support for NVIDIA GPUs. On Windows it is CPU-only. macOS has no CUDA; Apple silicon GPUs are used through the `mps` device instead. For a specific build (CPU-only, a particular CUDA version, or AMD ROCm), use the selector on [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/), which generates a command with the right `--index-url`. The CPU-only build, for example:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Older instructions using `-f https://download.pytorch.org/whl/cu111/torch_stable.html` point at CUDA builds that are no longer published for current releases.

Check what you got:

```python
import torch

print(torch.__version__)
print(torch.cuda.is_available())
```

## Tensors

A tensor is a multi-dimensional array, like a NumPy array, that can also live on a GPU and take part in gradient computation:

```python
import torch

x = torch.tensor([[1, 2], [3, 4], [5, 6]])
print(x)
print(x.shape, x.dtype)
```

```text
tensor([[1, 2],
        [3, 4],
        [5, 6]])
torch.Size([3, 2]) torch.int64
```

Arithmetic operators work element-wise. Use `@` for matrix multiplication or a dot product:

```python
a = torch.tensor([1, 2, 3])
b = torch.tensor([4, 5, 6])

print(a + b)  # tensor([5, 7, 9])
print(a * b)  # tensor([ 4, 10, 18])
print(a @ b)  # tensor(32)
```

To move a tensor to the GPU, use `.to("cuda")`. Every tensor in an operation has to be on the same device, so mixing CPU and GPU tensors raises an error.

## Autograd

Autograd is PyTorch's automatic differentiation engine. If a tensor has `requires_grad=True`, PyTorch records every operation that uses it. Calling `.backward()` on a scalar result then fills in `.grad` on those tensors:

```python
import torch

x = torch.tensor(2.0, requires_grad=True)
y = x ** 2

y.backward()  # dy/dx = 2x
print(x.grad)  # tensor(4.)
```

Gradients accumulate: calling `backward()` again adds to `x.grad` rather than replacing it. That's why training loops reset gradients on every step.

## Defining a network

Models subclass `torch.nn.Module`. You create layers in `__init__` and describe how data flows through them in `forward`:

```python
from torch import nn


class FeedforwardNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super().__init__()
        self.hidden = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.output = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        x = self.hidden(x)
        x = self.relu(x)
        return self.output(x)
```

Layers assigned as attributes are registered automatically, so `model.parameters()` returns all their weights and biases. Call the model as `model(x)`, not `model.forward(x)`, so that PyTorch's hooks run.

## Training it

A training loop always does the same four things: forward pass, compute the loss, backpropagate, and update the weights. This example fits the network to a noisy linear function, so the loss has something real to go down towards. It uses the `FeedforwardNN` class from the previous section:

```python
import torch
from torch import nn

device = "cuda" if torch.cuda.is_available() else "cpu"
torch.manual_seed(0)

# y = 2*x0 - x1 + 0.5*x2, plus a little noise
input_data = torch.randn(100, 3)
true_weights = torch.tensor([[2.0], [-1.0], [0.5]])
target_data = input_data @ true_weights + 0.1 * torch.randn(100, 1)
input_data, target_data = input_data.to(device), target_data.to(device)

model = FeedforwardNN(input_size=3, hidden_size=10, output_size=1).to(device)
loss_fn = nn.MSELoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.05)

for epoch in range(200):
    model.train()
    output = model(input_data)            # forward pass
    loss = loss_fn(output, target_data)   # compute the loss

    optimizer.zero_grad()                 # clear gradients from the last step
    loss.backward()                       # backpropagate
    optimizer.step()                      # update weights

    if (epoch + 1) % 50 == 0:
        print(f"epoch {epoch + 1}: loss {loss.item():.4f}")

model.eval()
with torch.no_grad():
    print(model(torch.tensor([[1.0, 1.0, 1.0]], device=device)))  # should be close to 1.5
```

The loss should fall steadily, and the final prediction should land near 1.5, the true value at that point.

Some notes on the loop:

- `model.train()` and `model.eval()` switch layers such as dropout and batch norm between training and inference behaviour. This model has neither, but getting into the habit avoids a subtle bug later.
- `torch.no_grad()` turns off gradient tracking for inference, which saves memory and time.
- This trains on the whole dataset at once. With real data, wrap it in a `torch.utils.data.DataLoader` to get shuffled mini-batches, and keep a separate validation set to check for overfitting.

## Where to go next

- [Learn the Basics](https://docs.pytorch.org/tutorials/beginner/basics/intro.html), the official tutorial series. It builds a full image classifier with `Dataset`, `DataLoader`, saving and loading.
- [PyTorch documentation](https://docs.pytorch.org/docs/stable/index.html)
- For convolutional networks and pretrained image models, see [torchvision](https://docs.pytorch.org/vision/stable/index.html). For language models, most people use Hugging Face Transformers on top of PyTorch rather than writing the layers themselves.
