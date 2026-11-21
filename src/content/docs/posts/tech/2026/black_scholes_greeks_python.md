---
title: "Pricing options with Black-Scholes in Python: the Greeks and implied volatility"
description: "Implement Black-Scholes in Python with scipy.stats.norm: call and put prices, delta, gamma, vega and theta, a put-call parity check, and implied volatility with brentq."
tags: ["Python", "Options", "Black-Scholes", "SciPy", "Quantitative Finance"]
pubDate: "2026-11-29T16:00:00.000Z"
imgSrc: "/imgs/2026/black_scholes_greeks_python.webp"
imgAlt: "A call option payoff hockey stick with the smooth Black-Scholes price curve above it, a dashed delta tangent, and a small implied volatility smile chart below"
---

The Black-Scholes model gives a closed-form price for a European option, one that can only be exercised at expiry, from five inputs: the underlying price, the strike, the time to expiry, the risk-free rate and the volatility. Its derivatives with respect to those inputs, the Greeks, measure how the option's price responds to each one. Run the formula backwards, and you get implied volatility: the volatility the market is pricing in.

This post implements all three in about 50 lines of Python with SciPy, checks the results against a textbook example, put-call parity and finite differences, and then lists where the model's assumptions break. The code was run with Python 3.12 and SciPy 1.18.

:::caution
This is about the mathematics and the code. It is not trading advice, and the model's prices are not fair values for real options; see the last section.
:::

## The formula

For a stock price `S`, strike `K`, time to expiry `T` in years, continuously compounded risk-free rate `r`, continuous dividend yield `q` and volatility `σ`:

```text
d1 = [ln(S/K) + (r - q + σ²/2)·T] / (σ·√T)
d2 = d1 - σ·√T

call = S·e^(-qT)·N(d1) - K·e^(-rT)·N(d2)
put  = K·e^(-rT)·N(-d2) - S·e^(-qT)·N(-d1)
```

`N` is the standard normal cumulative distribution function. `N(d2)` is the risk-neutral probability that the call finishes in the money, and `S·e^(-qT)·N(d1)` is the present value of receiving the stock in the cases where it does. With `q = 0` this is the original 1973 Black-Scholes formula; the dividend yield is Merton's extension.

## The Greeks

Each Greek is a partial derivative of the price:

| Greek | Measures | Call | Put |
|---|---|---|---|
| Delta | price change per 1 unit of `S` | `e^(-qT)·N(d1)` | `-e^(-qT)·N(-d1)` |
| Gamma | delta change per 1 unit of `S` | `e^(-qT)·φ(d1) / (S·σ·√T)` | same as call |
| Vega | price change per 1.00 of `σ` | `S·e^(-qT)·φ(d1)·√T` | same as call |
| Theta | price change per year of time passing | see code | see code |

`φ` is the standard normal density. Vega is usually quoted per volatility point (σ from 20% to 21%), so divide by 100; theta is usually quoted per day, so divide by 365 for calendar days (some desks use 252 trading days).

## The code

Save this as `bs.py`:

```python
"""Black-Scholes-Merton prices, Greeks and implied volatility for European options."""
from math import exp, log, sqrt

from scipy.optimize import brentq
from scipy.stats import norm


def _d1_d2(S, K, T, r, sigma, q=0.0):
    d1 = (log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * sqrt(T))
    return d1, d1 - sigma * sqrt(T)


def price(S, K, T, r, sigma, q=0.0, kind="call"):
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    if kind == "call":
        return S * exp(-q * T) * norm.cdf(d1) - K * exp(-r * T) * norm.cdf(d2)
    return K * exp(-r * T) * norm.cdf(-d2) - S * exp(-q * T) * norm.cdf(-d1)


def greeks(S, K, T, r, sigma, q=0.0, kind="call"):
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    pdf = norm.pdf(d1)
    disc_q, disc_r = exp(-q * T), exp(-r * T)
    gamma = disc_q * pdf / (S * sigma * sqrt(T))
    vega = S * disc_q * pdf * sqrt(T)                      # per 1.00 change in sigma
    decay = -S * disc_q * pdf * sigma / (2 * sqrt(T))
    if kind == "call":
        delta = disc_q * norm.cdf(d1)
        theta = decay - r * K * disc_r * norm.cdf(d2) + q * S * disc_q * norm.cdf(d1)
    else:
        delta = -disc_q * norm.cdf(-d1)
        theta = decay + r * K * disc_r * norm.cdf(-d2) - q * S * disc_q * norm.cdf(-d1)
    return {
        "delta": float(delta),
        "gamma": float(gamma),
        "vega": float(vega / 100),          # per 1 volatility point
        "theta": float(theta / 365),        # per calendar day
    }


def implied_vol(market_price, S, K, T, r, q=0.0, kind="call", lo=1e-6, hi=5.0):
    intrinsic = max(S * exp(-q * T) - K * exp(-r * T), 0) if kind == "call" \
        else max(K * exp(-r * T) - S * exp(-q * T), 0)
    upper = S * exp(-q * T) if kind == "call" else K * exp(-r * T)
    if not intrinsic < market_price < upper:
        raise ValueError(f"price {market_price} is outside the no-arbitrage range ({intrinsic:.4f}, {upper:.4f})")
    return brentq(lambda s: price(S, K, T, r, s, q, kind) - market_price, lo, hi, xtol=1e-10)


if __name__ == "__main__":
    S, K, T, r, sigma = 42.0, 40.0, 0.5, 0.10, 0.20
    c, p = price(S, K, T, r, sigma), price(S, K, T, r, sigma, kind="put")
    print(f"call {c:.4f}   put {p:.4f}")
    print(f"parity: C - P = {c - p:.6f},  S - K e^(-rT) = {S - K * exp(-r * T):.6f}")
    for kind in ("call", "put"):
        g = greeks(S, K, T, r, sigma, kind=kind)
        print(kind, {k: round(v, 4) for k, v in g.items()})
    print(f"implied vol from the call price: {implied_vol(c, S, K, T, r):.6f}")
```

`scipy.stats.norm.cdf` and `norm.pdf` do the statistics. Everything else is arithmetic with the standard library's `math` module. For pricing thousands of options at once, swap `math` for NumPy and pass arrays; `norm.cdf` already accepts them.

## Checking it

```bash
pip install scipy
python bs.py
```

```text
call 4.7594   put 0.8086
parity: C - P = 3.950823,  S - K e^(-rT) = 3.950823
call {'delta': 0.7791, 'gamma': 0.05, 'vega': 0.0881, 'theta': -0.0125}
put {'delta': -0.2209, 'gamma': 0.05, 'vega': 0.0881, 'theta': -0.0021}
implied vol from the call price: 0.200000
```

The inputs are a standard textbook example (it appears in John Hull's *Options, Futures, and Other Derivatives*), whose answers are a call of 4.76 and a put of 0.81. Three more checks are visible in the output:

- **Put-call parity.** For European options on a non-dividend stock, `C - P = S - K·e^(-rT)` must hold regardless of the model, or there is a riskless arbitrage. With dividends the right side is `S·e^(-qT) - K·e^(-rT)`. A parity failure in your own code usually means a sign error in the put formula.
- **Delta.** Call delta minus put delta is 1 (`0.7791 - (-0.2209)`), which is parity differentiated with respect to `S`.
- **Round trip.** Feeding the call price back into `implied_vol` recovers σ = 0.20.

The Greek formulas are the easiest place for a typo. A finite-difference check catches them: bump an input by a tiny amount, reprice, and compare the slope with the analytic Greek. This uses a different set of inputs, including a dividend yield, so the `q` terms are tested too:

```python
# check_greeks.py
from bs import greeks, price

S, K, T, r, sigma, q = 100.0, 105.0, 0.25, 0.04, 0.30, 0.01
h = 1e-4
for kind in ("call", "put"):
    p = lambda **kw: price(**{"S": S, "K": K, "T": T, "r": r, "sigma": sigma, "q": q, "kind": kind, **kw})
    numeric = {
        "delta": (p(S=S + h) - p(S=S - h)) / (2 * h),
        "gamma": (p(S=S + h) - 2 * p() + p(S=S - h)) / h**2,
        "vega": (p(sigma=sigma + h) - p(sigma=sigma - h)) / (2 * h) / 100,
        "theta": -(p(T=T + h) - p(T=T - h)) / (2 * h) / 365,
    }
    analytic = greeks(S, K, T, r, sigma, q, kind)
    for name in numeric:
        print(f"{kind:4} {name:5} analytic {analytic[name]: .6f}  numeric {numeric[name]: .6f}")
```

```text
call delta analytic  0.419585  numeric  0.419585
call gamma analytic  0.026003  numeric  0.026002
call vega  analytic  0.195023  numeric  0.195023
call theta analytic -0.035045  numeric -0.035045
put  delta analytic -0.577918  numeric -0.577918
put  gamma analytic  0.026003  numeric  0.026004
put  vega  analytic  0.195023  numeric  0.195023
put  theta analytic -0.026386  numeric -0.026386
```

Theta has a minus sign in the numeric version because it is the change as time *passes*, which shortens `T`. The small gamma differences are rounding error from the second difference.

## Implied volatility with brentq

There is no closed form for σ given a price, but the call price increases monotonically in σ, so a bracketing root finder is reliable. `scipy.optimize.brentq` needs a function that changes sign between the two bounds: here, model price minus market price, between a volatility near zero and 500%.

The guard before it matters. A call can't be worth less than its discounted intrinsic value or more than the stock. If a quote is outside that range, because of a stale price, a wide bid-ask spread or an American option's early-exercise premium, no volatility solves the equation and `brentq` would raise a less helpful error about the signs at the endpoints.

```python
# smile.py
from bs import implied_vol

S, T, r = 42.0, 0.5, 0.10
quotes = {35: 9.10, 40: 4.60, 45: 1.70, 50: 0.55}    # made-up call prices
for K, px in quotes.items():
    print(f"K={K}  price={px:.2f}  implied vol={implied_vol(px, S, K, T, r):.2%}")

try:
    implied_vol(3.50, S, 40, T, r)
except ValueError as e:
    print("error:", e)
```

```text
K=35  price=9.10  implied vol=27.15%
K=40  price=4.60  implied vol=18.15%
K=45  price=1.70  implied vol=17.38%
K=50  price=0.55  implied vol=18.70%
error: price 3.5 is outside the no-arbitrage range (3.9508, 42.0000)
```

The quotes are invented, but the shape is the familiar one from equity options: implied volatility differs by strike. If Black-Scholes described the market exactly, every strike would give the same number.

## Where the assumptions break

The model assumes a lot, and every assumption is violated to some degree:

- **Constant volatility.** The smile above is the market saying volatility depends on strike and expiry. Practitioners use Black-Scholes mainly as a quoting convention: they quote implied vol and convert back to a price with the formula.
- **Log-normal prices with no jumps.** Real returns have fatter tails and sudden gaps, around earnings for example. Deep out-of-the-money options are priced higher than the model implies.
- **European exercise.** Most single-stock options in the US are American. For calls on non-dividend stocks the price is the same, but American puts and calls before a dividend can be worth more. Use a binomial tree or another American-option method for those.
- **Continuous, costless hedging.** The derivation assumes you can rebalance a delta hedge continuously with no transaction costs. Real hedging is discrete and costly, which is why gamma matters in practice.
- **Known constant rates and dividends.** Discrete dividends in particular are better handled by subtracting their present value from `S` than by a continuous yield.
- **Very short expiries.** As `T` approaches zero, `d1` blows up and gamma near the strike becomes huge. Guard against `T == 0` and `sigma == 0` in production code; this version raises `ZeroDivisionError`.

## Further reading

- [SciPy: `scipy.stats.norm`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html)
- [SciPy: `scipy.optimize.brentq`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.brentq.html)
- [Python: `statistics.NormalDist`](https://docs.python.org/3/library/statistics.html#statistics.NormalDist), if you want `cdf` and `pdf` without SciPy
