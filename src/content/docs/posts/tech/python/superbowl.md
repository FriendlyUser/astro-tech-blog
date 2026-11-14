---
tags: ['python', 'football', 'pandas']
title: Scraping Super Bowl winners from ESPN with pandas
description: Use pandas.read_html to pull ESPN's Super Bowl winners, MVPs and touchdown leaders tables, clean the headers, and plot how often each stadium hosted.
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1340975325.webp"
---

The Super Bowl is the NFL's championship game, played each February. ESPN keeps simple HTML tables of every Super Bowl result, MVP and the all-time touchdown leaders, which makes them a good target for `pandas.read_html`: no browser automation, no parsing by hand.

The goal here is to load those tables, clean them up, and count how many Super Bowls each stadium has hosted.

## Install

```bash
pip install pandas lxml matplotlib
```

`read_html` needs an HTML parser (`lxml`, or `beautifulsoup4` plus `html5lib`). `matplotlib` isn't imported directly, but pandas uses it for `.plot()`.

## Read the tables

```python
import pandas as pd

base_url = "https://www.espn.com/nfl"
leaders_df = pd.read_html(f"{base_url}/history/leaders", attrs={"class": "tablehead"})[0]
winners_df = pd.read_html(f"{base_url}/superbowl/history/winners", attrs={"class": "tablehead"})[0]
mvp_df = pd.read_html(f"{base_url}/superbowl/history/mvps", attrs={"class": "tablehead"})[0]

print(leaders_df.head())
print(winners_df.head())
print(mvp_df.head())
```

`read_html` returns a list of every `<table>` on the page that matches `attrs`; each of these pages has one `tablehead` table, so `[0]` takes it.

```text
                    0                    1                  2
0  Touchdown Leaders    Touchdown Leaders  Touchdown Leaders
1                 RK               PLAYER                 TD
2                  1           Jerry Rice                208
3                  2         Emmitt Smith                175
4                  3  LaDainian Tomlinson                162
                                0  ...                               3
0  Super Bowl Winners and Results  ...  Super Bowl Winners and Results
1                             NO.  ...                          RESULT
2                               I  ...    Green Bay 35, Kansas City 10
3                              II  ...        Green Bay 33, Oakland 14
4                             III  ...   New York Jets 16, Baltimore 7
```

The output shows the problem: ESPN's tables have a title row and then a header row, and pandas treats both as data. The real column names are in row 1.

## Fix the headers

```python
winners_df.to_csv("winners_raw.csv", index=False)

winners_df = winners_df.iloc[1:]               # drop the title row
winners_df.columns = winners_df.iloc[0]        # use the header row as column names
winners_df = winners_df.iloc[1:]               # drop the header row from the data
print(winners_df.columns)

winners_df.to_csv("winners.csv", index=False)
print(winners_df["SITE"].unique())
```

```text
Index(['NO.', 'DATE', 'SITE', 'RESULT'], dtype='object', name=1)
['Los Angeles Memorial Coliseum' 'Orange Bowl (Miami)'
 'Tulane Stadium (New Orleans)' 'Rice Stadium (Houston)'
 'Rose Bowl (Pasadena, Calif.)' 'Superdome (New Orleans)'
 ...
 'Hard Rock Stadium (Miami)' 'SoFi Stadium (Inglewood, Calif.)']
```

## Count games per stadium

Each site includes the city in parentheses. Strip it so the stadium name alone is the grouping key, then count and plot:

```python
sites = winners_df.copy()
sites["SITE"] = sites["SITE"].str.replace(r"\s*\(.*\)", "", regex=True).str.strip()

counts = sites.groupby("SITE").size().sort_values()
ax = counts.plot(kind="barh", figsize=(10, 12))
fig = ax.get_figure()
fig.tight_layout()
fig.savefig("winners.png")
```

Pass `regex=True` explicitly. Since pandas 2.0, `Series.str.replace` treats the pattern as a literal string by default, so without it the parentheses are never removed and nothing is grouped.

![football graph](https://raw.githubusercontent.com/FriendlyUser/data-science-projects/main/superbowl/winners.png)

## Gotchas

- **Renamed stadiums count separately.** The Superdome appears as "Superdome", "Mercedes-Benz Superdome" and "Caesars Superdome"; Miami's stadium has had five names (Joe Robbie, Pro Player, Dolphin, Sun Life, Hard Rock). For an accurate count per venue, map those names to one key before grouping.
- **Stripping the city has a side effect.** "Tampa (Fla.) Stadium" becomes "Tampa Stadium", which happens to be correct, but check the unique values after any regex clean-up.
- **The page layout can change.** If ESPN drops the `tablehead` class or the title row, `read_html` will raise `ValueError: No tables found` or the header fix will pick the wrong row. Print `head()` before trusting the columns.

## References

- [Source code for this post](https://github.com/FriendlyUser/data-science-projects/tree/main/superbowl)
- [pandas.read_html](https://pandas.pydata.org/docs/reference/api/pandas.read_html.html)
