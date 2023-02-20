---
tags: ['chatgpt', 'python']
title: Here I will cover how to use chatgpt extract keywords and describe code.
description: In this post I will show you how to use chatgpt to describe code and get keywords.
pubDate: Fri, 7 June 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1220160824_A_dream_of_a_distant_galaxy__concept_art__matte_painting__HQ__4k.png
---
Describing code and getting keywords is important for a number of reasons:

1. Code descriptions can help you and other developers understand what a particular piece of code does, which is especially important when working on large projects with multiple contributors.
2. Keywords can help you quickly find the code you need when searching through a large codebase. By using specific keywords, you can narrow down your search and find the relevant code much faster.
3. Code descriptions and keywords can also make your code more accessible to others who may not be familiar with the codebase. This can be particularly helpful when onboarding new team members or when collaborating with external partners.

Overall, code descriptions and keywords can help make your code more efficient, maintainable, and accessible to others.


```python 
# openai script that generates descriptions and keywords for a given tex file


import os
import subprocess
import random
import time
from pyChatGPT import ChatGPT


path = os.path.dirname(os.path.realpath(__file__))

def get_files():
    # r=root, d=directories, f = files
    for r, d, f in os.walk(path):
        for file in f:
            if '.tex' in file:
                yield os.path.join(r, file)


def main():
    # seed prompt
    sessionToken = os.getenv("CHATGPT_TOKEN")
    sample_prompt = f"""
    You will be given a series of latex source code for diagrams followed by two prompts

        for prompt 1: describe the code above. Ignore syntax and incomplete code.

        for prompt 2: what are the keywords for the latex diagram in a comma separated list with no other text. Do not include the word latex or diagram or documentclass or usepackage in your response. Do not provide examples. Do not attempt to correct code. Do not provide code either. Make sure keywords are at least 3 letters.
    
    respond with confirm if you understand.
    """
    api = ChatGPT(sessionToken)
    api.send_message(sample_prompt)
    time.sleep(random.randint(2, 3))
    curr_count = 0
    max_count = 20
    for f in get_files():
        # print(file)
        # get relative path to file
        rel_path = os.path.relpath(f, path)
        # read text file
        with open(f, 'r', errors="ignore") as raw_tex_file:
            tex_source = raw_tex_file.read()

        description_txt = rel_path.replace('.tex', '_description.txt')
        # replace .tex with keywords_.txt
        keywords_txt = rel_path.replace('.tex', '_keywords.txt')

        # if both files exist skip
        if os.path.exists(description_txt) and os.path.exists(keywords_txt):
            continue
        # api.send_message(f"{tex_source} \n \n \n describe the code.")
        api.send_message(f"{tex_source}")
        # check if description_txt and keywords_txt exist
        if os.path.exists(description_txt) == False:
            raw_resp = api.send_message(f"describe the code.")
            # replace .tex withnt description_.txt
            tex_description = raw_resp['message']
            # save description to file
            with open(description_txt, 'w', encoding="utf-8", errors="replace") as description_file:
                description_file.write(tex_description)
            # randomly sleep for 3 to 6 seconds
            time.sleep(random.randint(3, 6))
        
        if os.path.exists(keywords_txt) == False:
            # generate keywords
            raw_resp = api.send_message(f"what are the keywords for the latex diagram above in a comma separated list with no other text. Do not include the word latex or diagram in your response.  Do not provide examples. Do not attempt to correct code. Do not provide code either. Make sure keywords are at least 3 letters.")
            # get output and save to keywords_txt
            tex_keywords = raw_resp['message']
            # save keywords to file
            with open(keywords_txt, 'w', encoding="utf-8", errors="replace") as keywords_file:
                keywords_file.write(tex_keywords)

        # increase curr_count
        curr_count += 1
        # exit after 10 files
        if curr_count >= max_count:
            break
        time.sleep(random.randint(3, 6))


if __name__ == '__main__':
    main()
 
 ```

This is a Python script that uses the OpenAI API to generate descriptions and keywords for LaTeX source code files. The script first walks through the directory tree, searching for files with the .tex extension. For each file found, the script prompts the user to provide a description of the code and a list of keywords that describe the code.

Sleeping is important when calling an API because it can help prevent rate limiting or other issues that may arise from making too many requests too quickly. When an API is called repeatedly and too frequently, it can lead to a high volume of traffic, which can put a strain on the server and potentially cause errors or slowdowns.

Sleeping, or pausing the script for a set amount of time between API requests, can help prevent this by spacing out the requests and giving the server time to process each request before receiving the next one. This can help ensure that the API requests are handled correctly and avoid any issues with rate limiting or server errors.

Additionally, some APIs may have rate limits that specify the maximum number of requests that can be made in a certain time period. Sleeping can help ensure that the script does not exceed these limits and avoids being blocked by the API provider.

Chatgpt has a timeout of about 1 hour after a large volume of requests.

The script uses the pyChatGPT library to communicate with the OpenAI API. It sends the LaTeX source code to the API, along with prompts for descriptions and keywords. It then saves the response to a text file with the same name as the LaTeX source file, but with "\_description" or "\_keywords" appended to the file name.

The script checks if the description and keyword files already exist, and if they do, skips the file. It also limits the number of files processed to 20, but this can be adjusted by changing the `max_count` variable.

Overall, this script can be a useful tool for generating descriptions and keywords for LaTeX source code, which can be helpful for documentation and searchability purposes.

For a full example please check out my Latex Diagrams project.

## References
- https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/genTxtFiles.py
- https://github.com/FriendlyUser/latex-diagrams-docs
