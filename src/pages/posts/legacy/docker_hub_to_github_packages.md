---
title: What I did to transfer docker images from dockerhub to ghcr
description: Transferring images from dockerhub with ghcr with code included.
alt: dockerhub tags to github package registry
tags: ["docker", "ghcr"]
pubDate: Mon, 11 Dec 2020 13:00:00 GMT
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/CorgiUpInATree.jpeg'
imgAlt: 'Corgi Tree'
---


Recently I wanted to transfer docker images from dockerhub to github package registry.

I wanted to transfer my docker images to github. One reason was for having a  backup after dockerhub changed image pull limits for unauthenicated users.

I used github codespaces because I did not want to pull large images. I could not use the example script given at [move-docker-image-to-private-acr.sh](https://gist.github.com/pjbgf/065b621b576c7762451c5b13c6e8ba48/raw/617bb8596c508a26fbb73d1e2a7010c3fb2a6bad/move-docker-image-to-private-acr.sh).

The downsides of this approach is that my codespace did not have enough space to pull down all the images and repush. My images are quite large as they contain ctan and latex.

Working on a new script, I found a simple way to transfer my docker images to github package registry.

I will walk through the code I used.

```bash
#!/bin/sh
original_image="grandfleet/dolwarp"
# github packages expects a project and then an image for that project
new_image="friendlyuser/dimages/lwarp_docker"
# Github package registry with a repository - do not use ghcr.io (massive mistake for me)
target_acr="docker.pkg.github.com"
```

After initializing variables, we are set to download all the image tags from dockerhub. For simplicity, I have put the tags in a seperate file.

```bash
temp_file="image_list.txt"
# remove temp_file if it already exists
rm $temp_file

# download image tags and output each tag as a seperate line to a file
wget -q https://registry.hub.docker.com/v1/repositories/$original_image/tags -O - | sed -e 's/[][]//g' -e 's/"//g' -e 's/ //g' | tr '}' '\n'| awk -F: '{print $3}' >> $temp_file
```

After outputting all the tags into a temp file, we can read each line and repush one by one.

This allows us to use github codespaces instead of relying on a powerful machine to move massive images. The major downside is that pulling and repushing one by one is extremely slow.

Since I already setup a github actions based method to deploy new docker images to github package registry, I decided to skip the latest tag.


```bash
while read -r line; do
    tag="$line"
    if [[ "$line" == "latest" ]]; then
      echo "Found line latest"
    else
      # docker image push and delete
      docker pull $original_image:$tag
      docker tag $original_image:$tag $target_acr/$new_image:$tag
      docker push $target_acr/$new_image:$tag
      docker image rm $original_image:$tag
      docker image rm $target_acr/$new_image:$tag
    fi
done < "$temp_file"
```

We iterate through each line in the temp file, skipping over the latest tag and for each valid tag:

1. Pull image from docker hub
2. Retag the dockerhub image with github package registry (docker.pkg.github.com)
3. Push the image to github package regisry
4. Cleanup the images so space is freed up. I believe you have to delete both images before the resources are freed up.

At the end, you should have succesfully moved all your image tags from dockerhub to github package registry.

Disclaimer - do not assume gcr.io is the github package registry or ghcr.io if you have a project and want to push to that project. I spent way too much time making that mistakea


The full script can be found below, change the variables for your needs.

```bash
#!/bin/bash
# Simple script to repush docker images from one repository to another
# This is done incremently because my images are massive
original_image="grandfleet/dolwarp"
# github packages has a strange way of having images, you can have
new_image="friendlyuser/dimages/lwarp_docker"
# Github package registry with a repository
target_acr="docker.pkg.github.com"
temp_file="image_list.txt"
rm $temp_file

wget -q https://registry.hub.docker.com/v1/repositories/$original_image/tags -O -  | sed -e 's/[][]//g' -e 's/"//g' -e 's/ //g' | tr '}' '\n'| awk -F: '{print $3}' >> $temp_file

while read -r line; do
    tag="$line"
    if [[ "$line" == "latest" ]]; then
      echo "Found line latest"
    else
      # docker image push and delete
      docker pull $original_image:$tag
      docker tag $original_image:$tag $target_acr/$new_image:$tag
      docker push $target_acr/$new_image:$tag
      docker image rm $original_image:$tag
      docker image rm $target_acr/$new_image:$tag
    fi
done < "$temp_file"

rm $temp_file
```

Or for the latest version checkout https://gist.github.com/FriendlyUser/b25d11002a46364a99b9c0f442eff6c9
### References

* https://medium.com/@pjbgf/moving-docker-images-from-one-container-registry-to-another-2f1f1631dc49