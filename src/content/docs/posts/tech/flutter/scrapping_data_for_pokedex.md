---
title: Using python to scrap data for a pokedex
description: Using the beta graphql api for pokeapi to get all the pokemon data
pubDate: Saturday, 7 May 2023 13:00:00 GMT
tags: ["graphql", "pokeapi", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-25 21.48.03 - teddy bear on coach looking out the window at a tree.png'
---


We can use the new graphql pokeapi to easily get all the pokemon of interest, and then use the unoffical bulbapedia api (mediawiki api) to grab the images. This is a quick and dirty script to do this. I will probably make a more robust version later, but this is good enough for now.

Here are some advantages of using GraphQL:


1. Flexibility: GraphQL allows the client to specify exactly which fields it wants in the response, and the server only returns those fields. This means that the client can request only the data it needs, which can be more efficient than receiving a fixed set of data from a REST API.

2. Strongly-typed: GraphQL has a strong type system that allows the server to specify the types of data it can return, and the client to specify the types of data it expects to receive. This can help prevent errors and make it easier to write code that relies on the API.

3. Easier to evolve: GraphQL APIs can be evolved more easily because the client has more control over which fields it receives. This means that new fields can be added to the API without breaking existing clients, as long as the new fields are optional.

4. Better performance: Because GraphQL allows the client to specify exactly which fields it wants, the server can avoid doing unnecessary work and return the data more efficiently. This can lead to better performance compared to REST APIs, which may return a fixed set of data that includes fields the client doesn't need.

5. Strong community: GraphQL has a strong and growing community of developers and tools that support it, which can make it easier to find resources and get help when needed.

```python
import requests
import json
import os
import urllib.parse
from bs4 import BeautifulSoup

query = """
query samplePokeAPIquery {
  pokemon: pokemon_v2_pokemon {
    name
    id
    pokemon_species_id
    pokemon_v2_pokemontypes {
      pokemon_v2_type {
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
    url = "https://beta.pokeapi.co/graphql/v1beta"
    headers = {
        "Content-Type": "application/json",
        "X-Method-Used": "graphiql",
    }
    response = requests.post(url, json={"query": query}, headers=headers, timeout=10)
    data = response.json()
    # save in scripts
    with open("raw_poke_data.json", "w") as f:
        f.write(json.dumps(data))
    return data
```

This script is using the requests library to send a GraphQL query to the PokeAPI (a RESTful API for Pokémon data) and then saving the response to a file called raw_poke_data.json. The GraphQL query being sent to the API requests data about Pokémon, including their name, ID, and the types of Pokémon they are. The requests.post function is used to send the query to the API, and the response is saved as a JSON object in the data variable.

The headers variable is a dictionary that contains information about the request being sent to the API. In this case, the Content-Type and X-Method-Used headers are being set. The Content-Type header specifies the format of the request body (in this case, application/json), and the X-Method-Used header specifies that the GraphiQL interface was used to generate the query.

Finally, the json.dumps function is used to convert the data object to a JSON string, which is then written to the raw_poke_data.json file using the f.write method.

```python
def parse_bulbagarden_by_pokemon_name(pokemon_name: str):
    print(f"Getting image for {pokemon_name}")
    params = {
        "action": "parse",
        "format": "json",
        "page": f"{pokemon_name}_(Pokémon)",
    }
    json_page = requests.get(f"https://bulbapedia.bulbagarden.net/w/api.php", params=params, timeout=20).json()

    # check for error propxerty
    if "error" in json_page:
        print(json_page["error"])
        raise AssertionError("Error in parsing bulbagarden")
    html = json_page["parse"]["text"]["*"]
    soup = BeautifulSoup(html, "html.parser")
    # find all images in soup and get the one with the pokemon name
    images = soup.find_all("img")
    # strip all non-alphanumeric characters from pokemon name
    clean_name = "".join([char for char in pokemon_name if char.isalnum()])
    for image in images:
        if clean_name.upper() in image["src"].upper():
            return image["src"]
        else:
            # return one if it is 250px
            if "250px" in image["src"]:
                return image["src"]

if __name__ == "__main__":
    # if raw_poke_data.json is not present, get data from pokeapi
    if not os.path.exists("pokemon_data.json"):
        data = get_data()
    else:
        # load
        with open("pokemon_data.json", "r") as f:
            data = json.loads(f.read())
    for pokemon in data["data"]["pokemon"]:
        if "img_src" in pokemon and pokemon["img_src"] != None:
            continue
        # adjust pokmeon name by removing everything past -
        adjusted_name = adjust_pokemon_name(pokemon["name"])
        if adjusted_name == None:
            print(f"Could not find image for {pokemon['name']}")
            continue
        img_src = parse_bulbagarden_by_pokemon_name(adjusted_name)
        # save image url in pokemon
        if img_src == None:
            print(f"Could not find image for {pokemon['name']}")
            raise AssertionError("Could not find image")
        pokemon["img_src"] = img_src
        with open("pokemon_data.json", "w") as f:
            f.write(json.dumps(data))
```


This script is using the parse_bulbagarden_by_pokemon_name function to get the image URL for a Pokémon with a given name. It first makes an HTTP GET request to the Bulbapedia API with the given Pokémon name as a parameter. The response is a JSON object that contains information about the requested Pokémon page on Bulbapedia.

The script then uses the BeautifulSoup library to parse the HTML of the Pokémon page, searches for all img tags in the HTML, and returns the URL of the first image that matches the given Pokémon name or that has a 250px width. If no matching image is found, the function returns None.

The script then checks if an "img_src" field is present in the Pokémon data and, if not, calls the parse_bulbagarden_by_pokemon_name function to get the image URL for the Pokémon. If the image URL is successfully retrieved, it is added to the Pokémon data and the updated data is saved to the "pokemon_data.json" file. If no image URL is found, an error message is printed.


```python
def adjust_pokemon_name(pokemon_name: str):
    # remove everything after -
    if pokemon_name == "nidoran-f":
        return "nidoran♀"
    if pokemon_name == "nidoran-m":
        return "nidoran♂"
    if pokemon_name == "farfetchd":
        # farfetch'd, need to encode '
        return "farfetch%27d"
    if pokemon_name == "mr-mime":
        return "Mr._Mime"

    if pokemon_name == "mime-jr":
        return "Mime_Jr."

    if pokemon_name == "deoxys-normal":
        return "Deoxys"
    if pokemon_name == "wormadam-plant":
        return "Wormadam"
    if pokemon_name == "giratina-altered":
        return "Giratina"
    if pokemon_name == "flabebe":
        return "Flabébé"
    if pokemon_name == "meowstic-male":
        return "Meowstic"
    if pokemon_name == "Aegislash":
        return "Aegislash"

    if pokemon_name == "type-null":
        return "Type:_Null"
    if pokemon_name == "minior-red-meteor":
        return "Minior"
    if pokemon_name == "mimikyu-disguised":
        return "Mimikyu"
    if pokemon_name == "jangmo-o":
        return "Jangmo-o"
    if pokemon_name == "hakamo-o":
        return "Hakamo-o"
    if pokemon_name == "kommo-o":
        return "Kommo-o"
    if pokemon_name == "tapu-koko":
        return "Tapu_Koko"

    if pokemon_name == "tapu-lele":
        return "Tapu_Lele"

    if pokemon_name == "tapu-bulu":
        return "Tapu_Bulu"

    if pokemon_name == "tapu-fini":
        return "Tapu_Fini"

    if pokemon_name == "toxtricity-amped":
        return "Toxtricity"
    if pokemon_name == "sirfetchd":
        return "Sirfetch'd"

    if pokemon_name == "mr-rime":
        return "Mr._Rime"

    if pokemon_name == "eiscue-ice":
        return "Eiscue"

    if pokemon_name == "indeedee-male":
        return "Indeedee"
    if pokemon_name == "morpeko-full-belly":
        return "Morpeko"

    if pokemon_name == "urshifu-single-strike":
        return "Urshifu"
    if pokemon_name == "zacian-hero":
        return "Zacian"

    if pokemon_name == "basculegion-male":
        return "Basculegion"

    if pokemon_name == "enamorus-incarnate":
        return "Enamorus"
    
    if pokemon_name == "deoxys-attack":
        return None
    if pokemon_name == "deoxys-defense":
        return None
    if pokemon_name == "deoxys-speed":
        return None
    if pokemon_name == "wormadam-sandy":
        return None
    if pokemon_name == "wormadam-trash":
        return None

    if pokemon_name == "shaymin-sky":
        return "shaymin"

    if pokemon_name == "giratina-origin":
        return None
    if pokemon_name == "rotom-heat":
        return "rotom"
    if pokemon_name == "rotom-wash":
        return None
    if pokemon_name == "rotom-frost":
        return None
    if pokemon_name == "rotom-fan":
        return None
    if pokemon_name == "rotom-mow":
        return None
    if pokemon_name == "castform-sunny":
        return "castform"
    if pokemon_name == "castform-rainy":
        return None
    if pokemon_name == "castform-snowy":
        return None

    if pokemon_name == "basculin-blue-striped":
        return "basculin"
    if pokemon_name == "darmanitan-zen":
        return "darmanitan"

    if pokemon_name == "meloetta-pirouette":
        return "meloetta"

    if pokemon_name == "tornadus-therian":
        return "Tornadus"
    if pokemon_name == "thundurus-therian":
        return "Thundurus"
    if pokemon_name == "landorus-therian":
        return "Landorus"
    if pokemon_name == "kyurem-black":
        return "Kyurem"
    if pokemon_name == "kyurem-white":
        return None
    
    if "-" in pokemon_name:
        # capitalize first letter split by -
        adjusted_name = pokemon_name.split("-")
        adjusted_name = [name.capitalize() for name in adjusted_name]
        # adjusted_name = "-".join(adjusted_name)
        return None
    # capitalize first letter
    pokemon_name = pokemon_name.capitalize()
    return pokemon_name
```

This function takes a Pokémon name as input and returns an adjusted version of the name, with certain special characters or modifications added or removed. The adjusted name is intended to be used as the page name for the Pokémon on the Bulbapedia website.

The function first checks for certain Pokémon names that have special characters or require specific formatting and returns the adjusted name accordingly. For example, if the input is "nidoran-f", the function returns "nidoran♀". If the input is "farfetchd", the function returns "farfetch%27d", with the single quote character encoded as "%27".

If the input Pokémon name does not require any special adjustment, the function returns the input name as is. If the input name is one of the Pokémon names that are not supported by the Bulbapedia API, the function returns None.

Overall, we adjust the names from the pokeapi for the bulbapedia api. We also remove the names that are not duplicated by the bulbapedia api.

In the next article will we use the data generated here to display in a pokedex flutter app.