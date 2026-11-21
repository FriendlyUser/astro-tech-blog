---
title: "A portfolio rebalancing calculator in Python"
description: "Write a rebalancing calculator in plain Python: target weights, drift, rebalance bands, putting new cash to work before selling, and rounding to whole shares."
tags: ["Python", "Investing", "Portfolio", "Rebalancing", "Personal Finance"]
pubDate: "2026-04-12T16:00:00.000Z"
imgSrc: "/imgs/2026/portfolio_rebalancing_calculator.webp"
imgAlt: "Three stacked allocation bars, before and after rebalancing, with dashed target lines and a shaded tolerance band"
---

Rebalancing means trading a portfolio back toward its target allocation after market moves have pushed it away. If you hold 50% US stocks, 30% international stocks and 20% bonds, a good year for US stocks leaves you holding more of them than you planned, and rebalancing sells some or directs new money elsewhere.

The arithmetic is simple, but doing it by hand in a spreadsheet each month gets tedious once you add the practical rules: only trade when drift exceeds a band, use new contributions before selling anything, and buy whole shares. This post builds a small calculator that does all of that in plain Python 3.12, with no dependencies.

:::caution
This is a programming example, not investment advice. The asset names, prices and weights below are made up. Which allocation you hold and how often you rebalance are your decisions; the calculator only does the arithmetic.
:::

## The terms

- **Target weight**: the share of the portfolio each asset should have. Weights sum to 1.
- **Current weight**: an asset's market value divided by the portfolio total.
- **Drift**: current weight minus target weight. +5.9% means the asset is 5.9 percentage points overweight.
- **Rebalance band**: how much drift you tolerate before trading. Bands keep you from trading every month for tiny gains in precision. This post uses an *absolute* band of 5 percentage points; a variation is at the end.

## The algorithm

1. Value each holding and add any new cash to get the total.
2. Compute each asset's target value: weight times total.
3. **Cash first.** Spend the new cash only on assets below their target value, filling the largest dollar gap first.
4. If every asset is now within the band, stop. No sells.
5. Otherwise, sell overweight assets down to their target (rounding the number of shares down), add the proceeds to the cash, and buy underweight assets as in step 3.

Selling is the last resort because it costs commissions and spreads and, in a taxable account, can realise capital gains. Contributions are free rebalancing.

## The code

Save this as `rebalance.py`:

```python
"""Rebalancing calculator: target weights, bands, new cash first, whole shares."""
import math


def weights(holdings: dict[str, int], prices: dict[str, float], cash: float = 0.0) -> dict[str, float]:
    total = sum(holdings[a] * prices[a] for a in holdings) + cash
    return {a: holdings[a] * prices[a] / total for a in holdings}


def drift(holdings, prices, targets, cash: float = 0.0) -> dict[str, float]:
    w = weights(holdings, prices, cash)
    return {a: w[a] - targets[a] for a in targets}


def buy_whole_shares(budget: float, wanted: dict[str, float], prices: dict[str, float]) -> dict[str, int]:
    """Spend `budget` on whole shares, filling the largest remaining dollar gap first."""
    buys = {a: 0 for a in wanted}
    gap = dict(wanted)
    while True:
        affordable = [a for a in gap if gap[a] > 0 and prices[a] <= budget]
        if not affordable:
            return buys
        a = max(affordable, key=lambda x: gap[x])
        buys[a] += 1
        budget -= prices[a]
        gap[a] -= prices[a]


def plan(holdings, prices, targets, cash: float = 0.0, band: float = 0.05):
    """Return (trades, leftover_cash, sold). Positive trade = buy, negative = sell."""
    assert abs(sum(targets.values()) - 1) < 1e-9, "targets must sum to 1"
    value = {a: holdings[a] * prices[a] for a in targets}
    total = sum(value.values()) + cash
    target_value = {a: targets[a] * total for a in targets}

    # 1. Try to fix things with new cash alone: buy only what is underweight.
    gaps = {a: max(target_value[a] - value[a], 0.0) for a in targets}
    trades = buy_whole_shares(cash, gaps, prices)
    after = {a: holdings[a] + trades[a] for a in targets}
    leftover = cash - sum(trades[a] * prices[a] for a in targets)
    if all(abs(d) <= band for d in drift(after, prices, targets, leftover).values()):
        return trades, leftover, False

    # 2. Still outside the band: sell overweight assets down to target, then buy.
    trades = {a: 0 for a in targets}
    for a in targets:
        excess = value[a] - target_value[a]
        if excess > 0:
            trades[a] = -math.floor(excess / prices[a])   # round down: never oversell
    cash += sum(-trades[a] * prices[a] for a in targets)
    gaps = {a: max(target_value[a] - value[a], 0.0) for a in targets}
    for a, n in buy_whole_shares(cash, gaps, prices).items():
        trades[a] += n
    leftover = cash - sum(trades[a] * prices[a] for a in targets if trades[a] > 0)
    return trades, leftover, True


def report(holdings, prices, targets, trades, leftover):
    after = {a: holdings[a] + trades[a] for a in targets}
    before_w, after_w = weights(holdings, prices), weights(after, prices, leftover)
    print(f"| asset | price | shares | weight | target | trade | after |")
    print(f"|---|---:|---:|---:|---:|---:|---:|")
    for a in targets:
        print(f"| {a} | {prices[a]:.2f} | {holdings[a]} | {before_w[a]:.1%} | {targets[a]:.0%} "
              f"| {trades[a]:+d} | {after_w[a]:.1%} |")
    print(f"\ncash left over: {leftover:.2f}")


if __name__ == "__main__":
    targets = {"US_STOCKS": 0.50, "INTL_STOCKS": 0.30, "BONDS": 0.20}
    prices = {"US_STOCKS": 312.40, "INTL_STOCKS": 61.85, "BONDS": 72.10}
    holdings = {"US_STOCKS": 60, "INTL_STOCKS": 140, "BONDS": 85}

    for cash in (0, 3000):
        trades, left, sold = plan(holdings, prices, targets, cash=cash, band=0.05)
        print(f"\n## new cash {cash}, sells needed: {sold}\n")
        report(holdings, prices, targets, trades, left)
```

`buy_whole_shares` is a greedy loop: buy one share of whichever affordable asset has the biggest remaining gap, and repeat until nothing fits. With whole shares the problem is a small integer program, and greedy is not always optimal, but it is easy to follow, never spends more than the budget, and it only stops when no asset that is still below target has a share price that fits in the remaining cash.

The "after" weights include leftover cash in the denominator, because cash you didn't spend is part of the portfolio too.

## A worked example

The portfolio has had a good run in US stocks. At these prices it is worth 33,531.50: US stocks are 55.9% against a 50% target, so they are 5.9 points over a 5-point band. `python rebalance.py` prints two plans (the output is a Markdown table, rendered here).

**No new cash.** Cash alone can't fix anything, so the calculator sells:

| asset | price | shares | weight | target | trade | after |
|---|---:|---:|---:|---:|---:|---:|
| US_STOCKS | 312.40 | 60 | 55.9% | 50% | -6 | 50.3% |
| INTL_STOCKS | 61.85 | 140 | 25.8% | 30% | +22 | 29.9% |
| BONDS | 72.10 | 85 | 18.3% | 20% | +7 | 19.8% |

Cash left over: 9.00. Selling 6 shares raises 1,874.40, which buys 22 international and 7 bond shares. The rounding shows: the exact excess over target is 1,978.25, or 6.3 shares, and the calculator sells 6 rather than 7 so it never sells more than the excess.

**A 3,000 contribution.** The total becomes 36,531.50. Putting all 3,000 into the two underweight assets brings US stocks down to 51.3% simply by growing everything else, which is inside the band, so no sell is needed:

| asset | price | shares | weight | target | trade | after |
|---|---:|---:|---:|---:|---:|---:|
| US_STOCKS | 312.40 | 60 | 55.9% | 50% | +0 | 51.3% |
| INTL_STOCKS | 61.85 | 140 | 25.8% | 30% | +33 | 29.3% |
| BONDS | 72.10 | 85 | 18.3% | 20% | +13 | 19.3% |

Cash left over: 21.65. The portfolio is not exactly on target, but every asset is well inside the band, with no sales.

## Variations

**Relative bands.** A fixed 5-point band is loose for small allocations: a 5% position could double to 10% before triggering. A common alternative is a relative band, such as 25% of the target weight, so a 20% target tolerates 15% to 25% and a 4% target tolerates 3% to 5%. Some people use the smaller of the two. To implement it, replace the band test with `abs(d) <= band_rel * targets[a]`.

**Rebalance to the band edge instead of to target.** Selling only enough to get back inside the band trades less, at the cost of staying further from the target. Change the sell step to aim for `target_value + band * total`.

**Fractional shares.** If your broker supports them, drop `buy_whole_shares` and buy `gap / price` of each asset directly. The leftover cash goes to roughly zero.

**Several accounts.** If you hold the same allocation across a taxable account and a tax-advantaged one, it is often cheaper to do the selling in the tax-advantaged account. That turns the problem into "which account holds what", which this calculator doesn't model.

## Gotchas

- **Use prices you can trade at.** Last close is fine for planning, but by the time you place orders the prices have moved. Recompute just before trading, or use limit orders.
- **Taxes and fees are not in the model.** A sale that crosses a band might realise a gain larger than the benefit of rebalancing. The calculator answers "what trades restore the target", not "is it worth it".
- **Float money.** Floats are fine for a planning tool. For anything that records actual transactions, use `decimal.Decimal` or integer cents.
- **Order of trades.** Place sells before buys if your account needs the proceeds to settle first; the calculator assumes the cash is available immediately.
- **Targets must sum to 1.** The `assert` catches a typo like 0.5/0.3/0.3 before it silently produces nonsense.

## Further reading

- [Python docs: `decimal`, decimal fixed-point arithmetic](https://docs.python.org/3/library/decimal.html)
- [Python docs: `math.floor`](https://docs.python.org/3/library/math.html#math.floor)
