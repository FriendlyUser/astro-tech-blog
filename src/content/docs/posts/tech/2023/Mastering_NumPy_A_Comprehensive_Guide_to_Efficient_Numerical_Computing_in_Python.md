---
description: "NumPy essentials: creating and reshaping arrays, vectorised arithmetic, broadcasting, indexing, aggregations, linear algebra and random numbers with Generator."
imgSrc: /imgs/2023/1879869613.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-05-28T20:33:27.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "NumPy basics: arrays, broadcasting and vectorised maths in Python"
---

NumPy gives Python an n-dimensional array type, `ndarray`, that stores elements of one data type in a contiguous block of memory. Operations on whole arrays run in compiled C loops instead of the Python interpreter, which is why NumPy code is much faster than equivalent loops over lists. pandas, SciPy, scikit-learn and most of the scientific Python stack are built on it.

The examples below use APIs that are current in NumPy 2.x.

## Installing

```bash
pip install numpy
```

Every example assumes:

```python
import numpy as np
```

## Creating arrays

```python
arr = np.array([1, 2, 3, 4, 5])
arr2d = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
print(arr2d.shape, arr2d.ndim)   # (3, 3) 2

zeros = np.zeros((3, 4))                # 3x4 of 0.0
ones = np.ones((2, 3), dtype=np.int64)  # choose the dtype explicitly
sevens = np.full((2, 2), 7)
identity = np.eye(3)
evens = np.arange(0, 10, 2)        # [0 2 4 6 8], end is exclusive
points = np.linspace(0, 1, 5)      # [0. 0.25 0.5 0.75 1.], end is inclusive
```

## Reshaping

`reshape` needs the new shape to hold exactly the same number of elements:

```python
nums = np.arange(9)       # 9 elements
grid = nums.reshape(3, 3)
flat = grid.ravel()       # back to 1-D
transposed = grid.T
```

`np.arange(5).reshape(3, 3)` raises a `ValueError`, because 5 elements can't fill a 3x3 array. Pass `-1` for one dimension to let NumPy work it out: `np.arange(12).reshape(3, -1)` gives a 3x4 array.

## Element-wise arithmetic

Arithmetic operators work element by element. No loops needed:

```python
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

a + b    # [5 7 9]
a * b    # [ 4 10 18]  element-wise, not a matrix product
a / b    # [0.25 0.4  0.5 ]
a ** 2   # [1 4 9]
```

## Broadcasting

When shapes differ, NumPy compares them from the trailing dimension backwards. Two dimensions are compatible if they are equal or one of them is 1, and the size-1 dimension is stretched to match.

```python
m = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])   # shape (3, 3)

row = np.array([10, 20, 30])        # shape (3,): added to every row
print(m + row)
# [[11 22 33]
#  [14 25 36]
#  [17 28 39]]

col = np.array([[1], [2], [3]])     # shape (3, 1): applied to every column
print(m * col)
# [[ 1  2  3]
#  [ 8 10 12]
#  [21 24 27]]
```

Shapes `(3, 3)` and `(2,)` are not compatible and raise a `ValueError`.

## Indexing and slicing

```python
m = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])

m[0, 1]       # 2, row 0 column 1
m[1]          # [4 5 6], a whole row
m[:, 2]       # [3 6 9], a whole column
m[0:2, 1:3]   # [[2 3] [5 6]]
m[m > 4]      # [5 6 7 8 9], boolean mask
```

Slices are **views**, not copies. Writing to a slice changes the original array:

```python
first_row = m[0]
first_row[0] = 100
print(m[0, 0])        # 100

safe = m[0].copy()    # use .copy() when you need independent data
```

Boolean-mask and integer-list indexing (`m[[0, 2]]`) always return copies.

## Maths and aggregations

Universal functions ("ufuncs") apply element-wise:

```python
x = np.array([1.0, 2.0, 3.0])
np.sqrt(x)
np.exp(x)
np.log(x)       # natural log; log of 0 gives -inf with a warning
np.round(x * 1.55, 1)
```

Aggregations take an `axis` argument. `axis=0` collapses rows (one result per column) and `axis=1` collapses columns (one result per row):

```python
m = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
m.sum()          # 45
m.sum(axis=0)    # [12 15 18]
m.mean(axis=1)   # [2. 5. 8.]
m.max()          # 9
```

## Linear algebra

```python
a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])

a @ b                  # matrix product, same as np.matmul(a, b)
np.linalg.det(a)       # -2.0000000000000004 (floating point)
np.linalg.inv(a)
eigenvalues, eigenvectors = np.linalg.eig(a)

# Solve a x = y. Prefer this over inv(a) @ y: it's faster and more accurate.
y = np.array([5, 6])
x = np.linalg.solve(a, y)   # [-4.   4.5]
```

## Random numbers

Use a `Generator` from `np.random.default_rng()`. The older module-level functions such as `np.random.rand` and `np.random.randint` still work but are the legacy API, and the NumPy docs recommend `Generator` for new code.

```python
rng = np.random.default_rng(seed=42)   # seed for reproducible results

rng.random()                        # float in [0, 1)
rng.random((3, 3))                  # 3x3 array of floats in [0, 1)
rng.integers(1, 10, size=(3, 3))    # ints from 1 to 9; the high end is exclusive
rng.normal(loc=0, scale=1, size=5)  # standard normal samples
```

## Gotchas

- **Integer overflow is silent.** Integer arrays have a fixed width, so `np.array([2**62], dtype=np.int64) * 4` wraps around instead of growing like a Python `int`.
- **Default integer size depends on the platform** in NumPy 1.x (32-bit on Windows). NumPy 2 made it 64-bit everywhere. Set `dtype` explicitly if it matters.
- **Avoid Python loops over arrays.** If you're writing `for i in range(len(arr))`, there's usually a vectorised expression or ufunc that does the same thing much faster.

## Further reading

- [NumPy: the absolute basics for beginners](https://numpy.org/doc/stable/user/absolute_beginners.html)
- [Broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html)
- [Random Generator](https://numpy.org/doc/stable/reference/random/generator.html)
