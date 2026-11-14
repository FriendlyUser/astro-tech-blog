---
title: Scraping Pokémon data and images for a Pokédex with Python
description: A Python script that pulls every Pokémon's name, ID and types from PokeAPI's GraphQL API, then finds an image for each one through Bulbapedia's MediaWiki API.
pubDate: Saturday, 7 May 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["graphql", "pokeapi", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2022-12-25-21-48-03-teddy-bear-on-coach-looking-out-the-window-at-a-tree.webp'
---

:::caution
PokeAPI removed the `beta.pokeapi.co/graphql/v1beta` endpoint this post originally used. The code below now targets its replacement, `https://graphql.pokeapi.co/v1beta2`, which drops the `pokemon_v2_` prefix from every type and field and is rate-limited to 100 calls per hour per IP. Bulbapedia's API also sits behind a Cloudflare bot check now, and scripted requests can get a 403 response, so the image step may not work for you as written. See [Gotchas](#gotchas) for a way around it.
:::

This is the data step for my [Flutter Pokédex app](/posts/tech/flutter/pokedex_app_partI/). It's a quick and dirty script: one GraphQL query to PokeAPI gets every Pokémon with its types, then Bulbapedia's MediaWiki API supplies an image URL for each one.

I used GraphQL instead of the REST API because it saves requests. The REST API needs a separate call to `/pokemon/{id}` for each Pokémon. With GraphQL I can ask for just the fields the app needs (name, ID, species ID, types) for all of them in one request.

## Getting every Pokémon from the GraphQL API

```python
import json
import os

import requests
from bs4 import BeautifulSoup

GRAPHQL_URL = "https://graphql.pokeapi.co/v1beta2"

# The aliases (pokemon_v2_pokemontypes:, pokemon_v2_type:) keep the field names
# from the old v1beta schema, so the JSON the Flutter app reads is unchanged.
QUERY = """
query allPokemon {
  pokemon(order_by: {id: asc}) {
    name
    id
    pokemon_species_id
    pokemon_v2_pokemontypes: pokemontypes {
      pokemon_v2_type: type {
        name
        move_damage_class_id
        generation_id
        id
      }
    }
  }
}
"""


def get_data():
    response = requests.post(GRAPHQL_URL, json={"query": QUERY}, timeout=30)
    response.raise_for_status()
    data = response.json()
    if "errors" in data:
        raise RuntimeError(data["errors"])
    with open("raw_poke_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data
```

GraphQL errors come back with a 200 status and an `errors` key, so `raise_for_status()` alone won't catch a bad query. As of November 2026 the query returns 1,351 entries: the 1,025 species plus alternate forms (megas, regional forms and so on) with IDs from 10001 up.

## Finding an image on Bulbapedia

Bulbapedia runs on MediaWiki, so `action=parse` returns the rendered HTML of a page as JSON. Each Pokémon's page is named `<Name>_(Pokémon)`. The function parses that HTML with BeautifulSoup and picks an image:

```python
def parse_bulbagarden_by_pokemon_name(pokemon_name: str):
    print(f"Getting image for {pokemon_name}")
    params = {
        "action": "parse",
        "format": "json",
        "page": f"{pokemon_name}_(Pokémon)",
    }
    response = requests.get(
        "https://bulbapedia.bulbagarden.net/w/api.php", params=params, timeout=20
    )
    response.raise_for_status()
    json_page = response.json()
    if "error" in json_page:
        raise AssertionError(f"Error parsing Bulbapedia page: {json_page['error']}")

    html = json_page["parse"]["text"]["*"]
    soup = BeautifulSoup(html, "html.parser")
    srcs = [img.get("src", "") for img in soup.find_all("img")]

    # Prefer an image whose file name contains the Pokémon's name,
    # then fall back to the first 250px thumbnail on the page.
    clean_name = "".join(char for char in pokemon_name if char.isalnum()).upper()
    for src in srcs:
        if clean_name in src.upper():
            return src
    for src in srcs:
        if "250px" in src:
            return src
    return None
```

The `src` values are protocol-relative (`//archives.bulbagarden.net/...`), which is why the Flutter app prepends `https:` when it loads them.

## Mapping PokeAPI names to Bulbapedia page names

PokeAPI names are lowercase slugs, and the default form of some species carries a suffix (`deoxys-normal`, `aegislash-shield`). Bulbapedia page names use the display name. A lookup table handles the special cases. Anything else with a hyphen is an alternate form that shares the base Pokémon's page, so it's skipped. Everything else just gets capitalised (MediaWiki would do that anyway).

```python
# PokeAPI name -> Bulbapedia page name (without the "_(Pokémon)" suffix).
SPECIAL_NAMES = {
    "nidoran-f": "Nidoran♀",
    "nidoran-m": "Nidoran♂",
    "farfetchd": "Farfetch'd",
    "mr-mime": "Mr._Mime",
    "ho-oh": "Ho-Oh",
    "mime-jr": "Mime_Jr.",
    "porygon-z": "Porygon-Z",
    "deoxys-normal": "Deoxys",
    "wormadam-plant": "Wormadam",
    "giratina-altered": "Giratina",
    "shaymin-land": "Shaymin",
    "basculin-red-striped": "Basculin",
    "darmanitan-standard": "Darmanitan",
    "tornadus-incarnate": "Tornadus",
    "thundurus-incarnate": "Thundurus",
    "landorus-incarnate": "Landorus",
    "keldeo-ordinary": "Keldeo",
    "meloetta-aria": "Meloetta",
    "flabebe": "Flabébé",
    "meowstic-male": "Meowstic",
    "aegislash-shield": "Aegislash",
    "type-null": "Type:_Null",
    "minior-red-meteor": "Minior",
    "mimikyu-disguised": "Mimikyu",
    "jangmo-o": "Jangmo-o",
    "hakamo-o": "Hakamo-o",
    "kommo-o": "Kommo-o",
    "tapu-koko": "Tapu_Koko",
    "tapu-lele": "Tapu_Lele",
    "tapu-bulu": "Tapu_Bulu",
    "tapu-fini": "Tapu_Fini",
    "toxtricity-amped": "Toxtricity",
    "sirfetchd": "Sirfetch'd",
    "mr-rime": "Mr._Rime",
    "eiscue-ice": "Eiscue",
    "indeedee-male": "Indeedee",
    "morpeko-full-belly": "Morpeko",
    "urshifu-single-strike": "Urshifu",
    "basculegion-male": "Basculegion",
    "enamorus-incarnate": "Enamorus",
}


def adjust_pokemon_name(pokemon_name: str):
    if pokemon_name in SPECIAL_NAMES:
        return SPECIAL_NAMES[pokemon_name]
    if "-" in pokemon_name:
        # Alternate forms (megas, regional forms, rotom-wash, ...) share the
        # base Pokémon's page, so skip them.
        return None
    return pokemon_name.capitalize()
```

The first version of this table mapped alternate forms like `shaymin-sky` and `tornadus-therian` to the base page, while the default forms (`shaymin-land`, `tornadus-incarnate`) fell through to the hyphen check and got skipped. It also URL-encoded the apostrophe in `farfetch%27d` by hand, which `requests` then encoded a second time. Both are fixed above.

## Putting it together

Put `SPECIAL_NAMES` and `adjust_pokemon_name` above this block in the same file:

```python
if __name__ == "__main__":
    # pokemon_data.json doubles as a checkpoint: rerunning the script picks up
    # where the last run stopped instead of hitting the API again.
    if os.path.exists("pokemon_data.json"):
        with open("pokemon_data.json", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = get_data()

    for pokemon in data["data"]["pokemon"]:
        if pokemon.get("img_src"):
            continue
        adjusted_name = adjust_pokemon_name(pokemon["name"])
        if adjusted_name is None:
            print(f"Skipping {pokemon['name']}")
            continue
        img_src = parse_bulbagarden_by_pokemon_name(adjusted_name)
        if img_src is None:
            raise AssertionError(f"Could not find image for {pokemon['name']}")
        pokemon["img_src"] = img_src
        with open("pokemon_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f)
```

Install the dependencies with `pip install requests beautifulsoup4`. A separate `clean_data.py` script in the repo then drops every entry without an `img_src` and writes `clean_pokemon.json`, which the app bundles as an asset.

## Gotchas

- **Unmapped names are skipped.** Newer species whose default name contains a hyphen (`great-tusk`, `iron-treads`, `wo-chien`, `zygarde-50`, `lycanroc-midday` and others) aren't in the table. Rather than growing it by hand, you can ask PokeAPI for the English display name and build the page name from that. Watch for the curly apostrophe PokeAPI uses in `Farfetch’d`:

  ```graphql
  query {
    pokemon(where: {id: {_lt: 10000}}) {
      name
      pokemonspecy {
        pokemonspeciesnames(where: {language: {name: {_eq: "en"}}}) {
          name
        }
      }
    }
  }
  ```

- **Bulbapedia may block the script.** If you get 403s from its API, use PokeAPI's own sprite repository instead. The official artwork is at `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`, keyed by ID, so you don't need the name mapping at all.
- **Be polite with both APIs.** The GraphQL endpoint allows 100 calls per hour per IP, and PokeAPI's fair-use policy asks you to cache what you fetch. That's another reason the script saves to disk after every Pokémon.

In the [next post](/posts/tech/flutter/pokedex_app_partI/) I use this data in the Flutter Pokédex app.

## Further reading

- [PokeAPI GraphQL docs](https://pokeapi.co/docs/graphql)
- [MediaWiki `action=parse` API](https://www.mediawiki.org/wiki/API:Parsing_wikitext)
