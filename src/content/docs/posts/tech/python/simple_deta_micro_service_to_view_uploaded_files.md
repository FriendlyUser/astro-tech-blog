---
title: Simple deta micro to show my deta drive files
description: Leveraging fastapi to show stock report files
alt: my first blog post
tags: ["python","svelte"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 10 August 2022 13:00:00 GMT
imgSrc: '/imgs/2023/DALL·E 2023-01-08 20.37.11 - icon of a sword and shield.png'
---


```python
from fastapi import FastAPI
import pandas as pd
import os
from deta import Deta
from fastapi.responses import StreamingResponse, FileResponse
from io import BytesIO

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# load deta using 
project_key = os.getenv("DETA_DRIVE_KEY")
deta = Deta(project_key)
drive = deta.Drive("stonk_events")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
This code is a FastAPI server application. It imports the necessary modules like FastAPI, pandas, and os, as well as some modules from the deta package, which provides access to the Deta service. It creates an instance of the FastAPI class and sets up a middleware for Cross-Origin Resource Sharing (CORS).

The application has two routes defined:

/files: A GET request to this route returns a list of all the files in a specific directory in the Deta drive service with default exchange parameter is "US" .
/file/{id}: A GET request to this route with an id parameter in the URL returns the file corresponding to the given id as a StreamingResponse object, which is a way of streaming large files in FastAPI.
The Deta service is initialized using the project_key environment variable, which is expected to contain the Deta project key. The application uses the drive instance to interact with the Deta drive service.

The request to list all the files in drive uses pagination to retrieve the files, And get request is used to fetch the specific file by id.


```python
David Li
from fastapi import FastAPI
import pandas as pd
import os
from deta import Deta
from fastapi.responses import StreamingResponse, FileResponse
from io import BytesIO

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# load deta using 
project_key = os.getenv("DETA_DRIVE_KEY")
deta = Deta(project_key)
drive = deta.Drive("stonk_events")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/files")
async def get_files(exchange: str = "US"):
    """
    """
    # get files in deta
    result = drive.list()
    all_files = result.get("names")
    paging = result.get("paging")
    last = paging.get("last") if paging else None

    while (last):
        # provide last from previous call
        result = drive.list(last=last)

        all_files += result.get("names")
        # update last
        paging = result.get("paging")
        last = paging.get("last") if paging else None
    return all_files


# get file by name from deta /file/{id}
# reason it was likely failing is because of the response size limit
@app.get("/file/{id}")
async def get_file(id: str):
    res = drive.get(id)
    return StreamingResponse(res.iter_chunks(1024), media_type="application/pdf")
```

With deta, there seems to be a request and response limit, so just returning the file may work locally, but would fail in this particular cloud provider.


To show all the files in the drive, I used a sveltekit site

```ts
<script lang="ts">
import { onMount } from "svelte";
export let fileList: string[] = [];
onMount(async () => {
    fetch("https://stock_list.deta.dev/files")
    .then(response => response.json())
    .then(data => {
        // sort data
        var filesReversed = data.reverse();
        fileList = filesReversed;
    }).catch(error => {
        console.log(error);
        fileList = [];
    });
});
</script>

<main>
<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<ul>
    {#each fileList as item}
    <li><a href={"https://stock_list.deta.dev" + "/file/" + item}>{item}</a></li>
    {:else}
    <li>Empty list</li>
    {/each}
</ul>
</main>
```

## References
* https://github.com/dli-invest/stonk_file_list
* https://github.com/FriendlyUser/fast-rapidapi
