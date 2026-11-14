---
tags: ['python', 'introtopython']
title: Using IPython as a calculator to work out progressive income tax
description: Use the IPython shell for quick arithmetic, then write a small function that calculates tax across progressive brackets and check the result.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4039349639.webp
---
IPython is an interactive Python shell with tab completion, syntax highlighting, command history and numbered input/output prompts. That makes it a handy calculator: type an expression, press Enter, and the result appears straight away. This post uses it for basic arithmetic and then for a slightly more realistic job, calculating income tax across progressive brackets.

Install it with pip and start it from your terminal:

```bash
pip install ipython
ipython
```

## IPython as a calculator

Type an expression at the `In [n]:` prompt and IPython prints the result as `Out[n]`:

```python
In [1]: 2 + 2
Out[1]: 4

In [2]: 10 / 2
Out[2]: 5.0

In [3]: 2 ** 10
Out[3]: 1024
```

`/` always returns a float in Python 3; use `//` for integer division. For square roots, trigonometry and similar, import the `math` module:

```python
In [4]: import math

In [5]: math.sqrt(2)
Out[5]: 1.4142135623730951

In [6]: math.sin(math.pi / 2)
Out[6]: 1.0
```

The previous result is available as `_`, and any earlier one as `_n` (for example `_3`), so you can chain calculations without retyping numbers.

## Calculating income tax with brackets

Income tax in the US (and Canada) is progressive: each rate applies only to the slice of income inside its bracket, not to your whole income. That is easy to get wrong by hand, so it is a good fit for a small function.

The numbers below are the 2020 US federal brackets for a single filer, applied to taxable income (after deductions). Swap in the current year's brackets from the IRS, or your own country's, to use it for real.

```python
In [7]: brackets = [9875, 40125, 85525, 163300, 207350, 518400]

In [8]: rates = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]
```

`brackets` holds the upper limit of each bracket. There is one more rate than there are limits, because the last rate (37%) applies to everything above the final limit.

Now define the function. IPython handles multi-line input: after the `def` line it keeps indenting until you press Enter on a blank line.

```python
def calculate_tax(income):
    tax = 0.0
    lower = 0
    # the top bracket has no upper limit
    for upper, rate in zip(brackets + [float("inf")], rates):
        if income <= lower:
            break
        tax += (min(income, upper) - lower) * rate
        lower = upper
    return tax
```

For each bracket, the function taxes the part of the income between the bracket's lower and upper limit, then moves on. It stops as soon as the income is used up.

```python
In [10]: calculate_tax(50000)
Out[10]: 6790.0
```

You can check that by hand:

- 10% of the first $9,875 = $987.50
- 12% of the next $30,250 ($9,875 to $40,125) = $3,630.00
- 22% of the remaining $9,875 ($40,125 to $50,000) = $2,172.50

The total is $6,790, an effective rate of about 13.6%, even though the top marginal rate on this income is 22%.

## Next steps

- Try `calculate_tax(60000) - _10` to see how much extra tax a $10,000 raise costs ($2,200, all at 22%), using IPython's `_n` output history.
- Use `%history` to print the commands you've typed, then paste them into a `.py` file once the calculation works.
- The [IPython documentation](https://ipython.readthedocs.io/en/stable/) covers magics like `%timeit` and `%run`.
