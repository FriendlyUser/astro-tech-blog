---
title: Extracting types automatically from typescript-axios openapi generator
description: My Thoughts on what todo with jcenter/bintray going down.
alt: OpenApi Type Extraction
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'
pubDate: Wed, 14 May 2022 13:00:00 GMT
---

# Summary

 An OpenAPI file allows you to describe your entire API and as a result automatically produce clients to interact with them.

Previously, the implementation of the openapi client was poor as types were missing and inconsistent. Since then, the typing has been fixed, but in the meanwhile I shall go over my code to extract types from the outputted files.

First we read the produced api file, go through line by line, for typescript/javascript, the types will be annotated with the keyword export. Since we are only looking for types we can ignore any functions or async calls.

We also ignore any comments and perform brace matching in order to know when a type ends.

With all this information we can extract all the lines that has types and move them into another file.

## Full Source Code

```python
with open('api.ts') as f:
    lines = f.readlines()


# scan for export interface and export type
type_start = 0
found_export = False

type_start_line = None
type_end_line = None
matches = []
for i in range(len(lines)):
    line = lines[i]
    # make sure this isnt a comment 
    if "@" and "*" in line:
        continue
    # ignore anything with function or async
    if "function" in line or "async" in line:
        continue
    if type_start_line is not None:
        if "}" in line:
            type_end_line = i
            # append entry to matches
            # get all rows from type_start_line to type_end_line
            matches.append({
                "type_start": type_start_line,
                "type_end": type_end_line,
                "data": lines[type_start_line:type_end_line+1]
            })
            type_start_line = None
            type_end_line = None
            found_export = False
            continue
    if 'export' in line:
        if 'class' in line:
            pass
        if 'interface' in line:
            type_start = i
            found_export = True
        if 'type' in line:
            type_start = i
            found_export = True
        if 'const' in line:
            type_start = i
            found_export = True

        if found_export:

            if '{' in line:
                type_start_line = i
            else:
                # no brace found, so we are at the end of the type
                matches.append({
                    'type_start': type_start,
                    'type_end': type_start,
                    'data': line,
                    'line_no': i
                })
                found_export = False

print(matches)
# check for braces in line

# write output of types to file overmind/types/oaClientTypes.ts
with open('clientTypes.ts', 'w') as f:
    for match in matches:
        f.write("".join(match['data']))
        f.write("\n")

```

<br />
Future improvements could include

* generalization to extract functions and classes
* porting comments over as well
