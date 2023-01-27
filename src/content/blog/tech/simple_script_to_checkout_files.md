---
title: Simple script to checkout files
description: bash script to checkout files using bash
alt: my first blog post
tags: ["git"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 30 October 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-09-05 15.52.26 - corgi on a field staring up into a building falling from the sky, high quality photo.png'
---


Recently, I wrote a script to checkout files from branch because why not. At first I thought of using golang or C#, but bash scripting is the way to go.

In all honestly, this script was made with github copilot, its getting pretty powerful, but this script is also fairly simple.

```sh
#!/bin/sh

# this scripts reads files.txt and checks out the files from the repository from the inputted branch

# argument 1: branch name
# argument 2: file.txt

# check if the branch exists
if ! git show-ref --verify --quiet refs/heads/$1
then
    echo "Branch does not exist"
    exit 1
fi

# check if file exists
if [ ! -f $2 ]
then
    echo "File does not exist"
    exit 1
fi

# read the file and check out the files
while read line
do
  # convert line from windows path to unix path
  line=$(echo $line | sed 's/\\/\//g')
    echo "git checkout $1 -- $line"
    git checkout "$1" -- "$line"
done < $2
```

Since I use windows + git bash we will need a convert windows file paths to unix, for now I use a simple approach of just parsing backslash.


For example a sample file.txt can be

```
package.json
app/src/file.goeshere.txt
```